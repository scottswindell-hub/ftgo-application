package net.chrisrichardson.ftgo.orderservice.sagas.createorder;

import net.chrisrichardson.ftgo.accountservice.api.AuthorizeCommand;
import net.chrisrichardson.ftgo.common.Money;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderDetails;
import org.junit.Test;

import java.util.Collections;

import static org.junit.Assert.assertEquals;

public class CreateOrderSagaStateTest {

  @Test
  public void shouldReserveBufferWithoutChangingOrderOrValidationTotal() {
    OrderDetails details = new OrderDetails(123L, 456L, Collections.emptyList(), new Money("19.95"));
    CreateOrderSagaState state = new CreateOrderSagaState(789L, details);

    AuthorizeCommand command = state.makeAuthorizeCommand();

    assertEquals("21.95", command.getOrderTotal());
    assertEquals(Long.valueOf(789L), command.getOrderId());
    assertEquals(123L, command.getConsumerId().longValue());
    assertEquals("19.95", details.getOrderTotal().asString());
    assertEquals("19.95", state.makeValidateOrderByConsumerCommand().getOrderTotal());
    assertEquals("21.95", state.makeAuthorizeCommand().getOrderTotal());
  }

  @Test
  public void shouldReserveBufferForZeroTotal() {
    OrderDetails details = new OrderDetails(123L, 456L, Collections.emptyList(), Money.ZERO);
    CreateOrderSagaState state = new CreateOrderSagaState(789L, details);

    assertEquals("2.00", state.makeAuthorizeCommand().getOrderTotal());
    assertEquals("0", details.getOrderTotal().asString());
  }
}
