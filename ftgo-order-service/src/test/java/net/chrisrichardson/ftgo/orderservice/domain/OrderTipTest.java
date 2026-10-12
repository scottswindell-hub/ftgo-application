package net.chrisrichardson.ftgo.orderservice.domain;

import io.eventuate.tram.events.aggregates.ResultWithDomainEvents;
import net.chrisrichardson.ftgo.common.Money;
import net.chrisrichardson.ftgo.orderservice.OrderDetailsMother;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderCreatedEvent;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderDomainEvent;
import org.junit.Test;

import static net.chrisrichardson.ftgo.orderservice.OrderDetailsMother.CHICKEN_VINDALOO_ORDER_TOTAL;
import static net.chrisrichardson.ftgo.orderservice.OrderDetailsMother.CONSUMER_ID;
import static net.chrisrichardson.ftgo.orderservice.OrderDetailsMother.chickenVindalooLineItems;
import static net.chrisrichardson.ftgo.orderservice.RestaurantMother.AJANTA_RESTAURANT;
import static org.junit.Assert.assertEquals;

/**
 * Tips: added to the amount charged, published with the order, and bounded.
 * The line items total CHICKEN_VINDALOO_ORDER_TOTAL ($61.70), so the largest tip is $30.85.
 */
public class OrderTipTest {

  private static final Money TIP = new Money("5.00");

  private ResultWithDomainEvents<Order, OrderDomainEvent> create(Money tip) {
    return Order.createOrder(CONSUMER_ID, AJANTA_RESTAURANT, OrderDetailsMother.DELIVERY_INFORMATION,
            chickenVindalooLineItems(), tip);
  }

  @Test
  public void shouldChargeTheLineItemsPlusTheTip() {
    Order order = create(TIP).result;

    assertEquals(CHICKEN_VINDALOO_ORDER_TOTAL.add(TIP), order.getOrderTotal());
    assertEquals(CHICKEN_VINDALOO_ORDER_TOTAL, order.getItemsTotal());
    assertEquals(TIP, order.getTip());
  }

  @Test
  public void shouldPublishTheTipAndChargedTotalWhenCreated() {
    ResultWithDomainEvents<Order, OrderDomainEvent> result = create(TIP);

    OrderCreatedEvent event = (OrderCreatedEvent) result.events.get(0);
    assertEquals(TIP, event.getOrderDetails().getTip());
    assertEquals(CHICKEN_VINDALOO_ORDER_TOTAL.add(TIP), event.getOrderDetails().getOrderTotal());
  }

  @Test
  public void shouldKeepTheTotalUnchangedWithoutATip() {
    Order order = Order.createOrder(CONSUMER_ID, AJANTA_RESTAURANT, OrderDetailsMother.DELIVERY_INFORMATION,
            chickenVindalooLineItems()).result;

    assertEquals(CHICKEN_VINDALOO_ORDER_TOTAL, order.getOrderTotal());
    assertEquals(Money.ZERO, order.getTip());
  }

  @Test
  public void shouldTreatAMissingTipAsNoTip() {
    assertEquals(Money.ZERO, create(null).result.getTip());
  }

  @Test
  public void shouldAcceptATipOfHalfTheOrder() {
    assertEquals(new Money("30.85"), create(new Money("30.85")).result.getTip());
  }

  @Test(expected = InvalidTipException.class)
  public void shouldRejectATipAboveHalfTheOrder() {
    create(new Money("30.86"));
  }

  @Test(expected = InvalidTipException.class)
  public void shouldRejectANegativeTip() {
    create(new Money("-1.00"));
  }
}
