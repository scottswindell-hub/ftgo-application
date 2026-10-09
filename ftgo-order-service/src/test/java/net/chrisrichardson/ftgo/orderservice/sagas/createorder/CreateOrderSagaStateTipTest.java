package net.chrisrichardson.ftgo.orderservice.sagas.createorder;

import net.chrisrichardson.ftgo.common.Money;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderDetails;
import org.junit.Test;

import static net.chrisrichardson.ftgo.orderservice.OrderDetailsMother.CHICKEN_VINDALOO_ORDER_TOTAL;
import static net.chrisrichardson.ftgo.orderservice.OrderDetailsMother.CONSUMER_ID;
import static net.chrisrichardson.ftgo.orderservice.OrderDetailsMother.ORDER_ID;
import static net.chrisrichardson.ftgo.orderservice.OrderDetailsMother.chickenVindalooLineItems;
import static net.chrisrichardson.ftgo.orderservice.RestaurantMother.AJANTA_ID;
import static org.junit.Assert.assertEquals;

/**
 * The Create Order saga sends the charged total, including the tip, to Consumer for
 * validation and to Accounting for authorization.
 */
public class CreateOrderSagaStateTipTest {

  private static final Money TIP = new Money("5.00");
  private static final Money CHARGED = CHICKEN_VINDALOO_ORDER_TOTAL.add(TIP);

  private final CreateOrderSagaState state = new CreateOrderSagaState(ORDER_ID,
          new OrderDetails(CONSUMER_ID, AJANTA_ID, chickenVindalooLineItems(), CHARGED, TIP));

  @Test
  public void shouldAuthorizeTheTotalIncludingTheTip() {
    assertEquals(CHARGED, state.makeAuthorizeCommand().getOrderTotal());
  }

  @Test
  public void shouldValidateTheTotalIncludingTheTipWithTheConsumer() {
    assertEquals(CHARGED.asString(), state.makeValidateOrderByConsumerCommand().getOrderTotal().asString());
  }
}
