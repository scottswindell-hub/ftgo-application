package net.chrisrichardson.ftgo.orderservice.sagas.reviseorder;

import net.chrisrichardson.ftgo.accountservice.api.AccountingServiceChannels;
import net.chrisrichardson.ftgo.accountservice.api.ReviseAuthorization;
import net.chrisrichardson.ftgo.common.CommonJsonMapperInitializer;
import net.chrisrichardson.ftgo.common.Money;
import net.chrisrichardson.ftgo.common.RevisedOrderLineItem;
import net.chrisrichardson.ftgo.kitchenservice.api.BeginReviseTicketCommand;
import net.chrisrichardson.ftgo.kitchenservice.api.ConfirmReviseTicketCommand;
import net.chrisrichardson.ftgo.kitchenservice.api.KitchenServiceChannels;
import net.chrisrichardson.ftgo.orderservice.api.OrderServiceChannels;
import net.chrisrichardson.ftgo.orderservice.domain.OrderRevision;
import net.chrisrichardson.ftgo.orderservice.sagaparticipants.BeginReviseOrderCommand;
import net.chrisrichardson.ftgo.orderservice.sagaparticipants.BeginReviseOrderReply;
import net.chrisrichardson.ftgo.orderservice.sagaparticipants.ConfirmReviseOrderCommand;
import org.junit.BeforeClass;
import org.junit.Test;

import java.util.Collections;
import java.util.Optional;

import static io.eventuate.tram.sagas.testing.SagaUnitTestSupport.given;

public class ReviseOrderSagaTest {

  @BeforeClass
  public static void initialize() {
    CommonJsonMapperInitializer.registerMoneyModule();
  }

  @Test
  public void shouldConfirmTicketBeforeRevisingAuthorization() {
    long consumerId = 101L;
    long orderId = 202L;
    long restaurantId = 303L;
    Money revisedTotal = new Money("42.00");
    OrderRevision revision = new OrderRevision(Optional.empty(),
            Collections.singletonList(new RevisedOrderLineItem(2, "menu-1")));
    ReviseOrderSagaData data = new ReviseOrderSagaData(consumerId, orderId, 1L, revision);
    data.setRestaurantId(restaurantId);
    ReviseOrderSaga saga = new ReviseOrderSaga();
    saga.initializeSagaDefinition();

    given()
        .saga(saga, data)
    .expect()
        .command(new BeginReviseOrderCommand(orderId, revision))
        .to(OrderServiceChannels.COMMAND_CHANNEL)
    .andGiven()
        .successReply(new BeginReviseOrderReply(revisedTotal))
    .expect()
        .command(new BeginReviseTicketCommand(restaurantId, orderId, revision.getRevisedOrderLineItems()))
        .to(KitchenServiceChannels.COMMAND_CHANNEL)
    .andGiven()
        .successReply()
    .expect()
        .command(new ConfirmReviseTicketCommand(restaurantId, orderId, revision.getRevisedOrderLineItems()))
        .to(KitchenServiceChannels.COMMAND_CHANNEL)
    .andGiven()
        .successReply()
    .expect()
        .command(new ReviseAuthorization(consumerId, orderId, revisedTotal))
        .to(AccountingServiceChannels.accountingServiceChannel)
    .andGiven()
        .successReply()
    .expect()
        .command(new ConfirmReviseOrderCommand(orderId, revision))
        .to(OrderServiceChannels.COMMAND_CHANNEL);
  }
}
