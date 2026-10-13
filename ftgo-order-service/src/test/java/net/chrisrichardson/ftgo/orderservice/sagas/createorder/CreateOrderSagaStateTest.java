package net.chrisrichardson.ftgo.orderservice.sagas.createorder;

import net.chrisrichardson.ftgo.accountservice.api.AuthorizeCommand;
import net.chrisrichardson.ftgo.common.Money;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderDetails;
import org.junit.Test;

import java.util.Collections;

import static org.junit.Assert.assertEquals;

public class CreateOrderSagaStateTest {

  @Test
  public void shouldPreserveAuthorizationIdentityAndTotal() {
    OrderDetails details = new OrderDetails(73L, 19L, Collections.emptyList(), new Money("42.50"));
    CreateOrderSagaState state = new CreateOrderSagaState(101L, details);

    AuthorizeCommand command = state.makeAuthorizeCommand();

    assertEquals(AuthorizeCommand.class, command.getClass());
    assertEquals(Long.valueOf(73L), command.getConsumerId());
    assertEquals(Long.valueOf(101L), command.getOrderId());
    assertEquals("42.50", command.getOrderTotal());
  }

  @Test
  public void shouldUseActiveOrderIdAndCurrentOrderDetails() {
    OrderDetails details = new OrderDetails(73L, 19L, Collections.emptyList(), new Money("42.50"));
    CreateOrderSagaState state = new CreateOrderSagaState(101L, details);
    state.setOrderId(202L);
    details.setConsumerId(89L);
    details.setOrderTotal(new Money("0.005"));

    AuthorizeCommand command = state.makeAuthorizeCommand();

    assertEquals(Long.valueOf(89L), command.getConsumerId());
    assertEquals(Long.valueOf(202L), command.getOrderId());
    assertEquals("0.005", command.getOrderTotal());
  }
}
