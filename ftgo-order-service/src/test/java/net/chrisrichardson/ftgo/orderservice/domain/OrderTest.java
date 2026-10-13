package net.chrisrichardson.ftgo.orderservice.domain;

import io.eventuate.tram.events.aggregates.ResultWithDomainEvents;
import net.chrisrichardson.ftgo.common.RevisedOrderLineItem;
import net.chrisrichardson.ftgo.common.Money;
import net.chrisrichardson.ftgo.common.UnsupportedStateTransitionException;
import net.chrisrichardson.ftgo.orderservice.OrderDetailsMother;
import net.chrisrichardson.ftgo.orderservice.RestaurantMother;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderAuthorized;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderCreatedEvent;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderDomainEvent;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderState;
import org.junit.Before;
import org.junit.Test;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static java.util.Collections.singletonList;
import static net.chrisrichardson.ftgo.orderservice.OrderDetailsMother.*;
import static net.chrisrichardson.ftgo.orderservice.RestaurantMother.AJANTA_RESTAURANT;
import static net.chrisrichardson.ftgo.orderservice.RestaurantMother.CHICKEN_VINDALOO_PRICE;
import static org.junit.Assert.assertEquals;

public class OrderTest {

  private ResultWithDomainEvents<Order, OrderDomainEvent> createResult;
  private Order order;

  @Before
  public void setUp() throws Exception {
    createResult = Order.createOrder(CONSUMER_ID, AJANTA_RESTAURANT, OrderDetailsMother.DELIVERY_INFORMATION, chickenVindalooLineItems());
    order = createResult.result;
  }

  @Test
  public void shouldCreateOrder() {
    assertEquals(singletonList(new OrderCreatedEvent(CHICKEN_VINDALOO_ORDER_DETAILS, OrderDetailsMother.DELIVERY_ADDRESS, RestaurantMother.AJANTA_RESTAURANT_NAME)), createResult.events);

    assertEquals(OrderState.APPROVAL_PENDING, order.getState());
    // ...
  }

  @Test
  public void shouldCalculateTotal() {
    assertEquals(CHICKEN_VINDALOO_PRICE.multiply(CHICKEN_VINDALOO_QUANTITY), order.getOrderTotal());
  }

  @Test
  public void shouldAuthorize() {
    List<OrderDomainEvent> events = order.noteApproved();
    assertEquals(singletonList(new OrderAuthorized()), events);
    assertEquals(OrderState.APPROVED, order.getState());
  }

  @Test
  public void shouldReviseOrder() {

    order.noteApproved();
    Money originalTotal = order.getOrderTotal();

    OrderRevision orderRevision = new OrderRevision(Optional.empty(), Collections.singletonList(new RevisedOrderLineItem(10, "1")));

    ResultWithDomainEvents<LineItemQuantityChange, OrderDomainEvent> result = order.revise(orderRevision);

    assertEquals(CHICKEN_VINDALOO_PRICE.multiply(10), result.result.getNewOrderTotal());
    assertEquals(OrderState.REVISION_PENDING, order.getState());
    assertEquals(originalTotal, order.getOrderTotal());
    assertEquals(1, result.events.size());
    OrderRevisionProposed proposed = (OrderRevisionProposed) result.events.get(0);
    assertEquals(orderRevision, proposed.getOrderRevision());
    assertEquals(CHICKEN_VINDALOO_PRICE.multiply(10), proposed.getCurrentOrderTotal());
    assertEquals(CHICKEN_VINDALOO_PRICE.multiply(10), proposed.getNewOrderTotal());

    List<OrderDomainEvent> confirmationEvents = order.confirmRevision(orderRevision);
    OrderRevised revised = (OrderRevised) confirmationEvents.get(0);
    assertEquals(originalTotal, revised.getCurrentOrderTotal());
    assertEquals(CHICKEN_VINDALOO_PRICE.multiply(10), revised.getNewOrderTotal());

    assertEquals(CHICKEN_VINDALOO_PRICE.multiply(10), order.getOrderTotal());
  }

  @Test(expected = UnsupportedStateTransitionException.class)
  public void shouldRejectRevisionBeforeApproval() {
    order.revise(new OrderRevision(Optional.empty(),
            singletonList(new RevisedOrderLineItem(10, "1"))));
  }

  @Test(expected = OrderMinimumNotMetException.class)
  public void shouldRetainRevisionTotalValidation() {
    order.noteApproved();
    order.revise(new OrderRevision(Optional.empty(),
            singletonList(new RevisedOrderLineItem(Integer.MAX_VALUE, "1"))));
  }
}
