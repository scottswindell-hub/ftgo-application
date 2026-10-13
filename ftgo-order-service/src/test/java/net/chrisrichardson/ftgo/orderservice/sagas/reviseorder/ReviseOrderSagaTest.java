package net.chrisrichardson.ftgo.orderservice.sagas.reviseorder;

import net.chrisrichardson.ftgo.accountservice.api.AccountingServiceChannels;
import net.chrisrichardson.ftgo.accountservice.api.ReviseAuthorization;
import net.chrisrichardson.ftgo.common.CommonJsonMapperInitializer;
import net.chrisrichardson.ftgo.common.Money;
import net.chrisrichardson.ftgo.common.RevisedOrderLineItem;
import net.chrisrichardson.ftgo.kitchenservice.api.*;
import net.chrisrichardson.ftgo.orderservice.api.OrderServiceChannels;
import net.chrisrichardson.ftgo.orderservice.domain.OrderRevision;
import net.chrisrichardson.ftgo.orderservice.sagaparticipants.*;
import org.junit.BeforeClass;
import org.junit.Test;

import java.util.Collections;
import java.util.Optional;

import static io.eventuate.tram.sagas.testing.SagaUnitTestSupport.given;

public class ReviseOrderSagaTest {

  private final long consumerId = 101L;
  private final long orderId = 202L;
  private final long restaurantId = 303L;
  private final Money revisedTotal = new Money("24.00");
  private final OrderRevision revision = new OrderRevision(Optional.empty(),
          Collections.singletonList(new RevisedOrderLineItem(2, "menu-item")));

  @BeforeClass
  public static void initialize() {
    CommonJsonMapperInitializer.registerMoneyModule();
  }

  private ReviseOrderSaga makeSaga() {
    ReviseOrderSaga saga = new ReviseOrderSaga();
    saga.initializeSagaDefinition();
    return saga;
  }

  private ReviseOrderSagaData makeData() {
    ReviseOrderSagaData data = new ReviseOrderSagaData(consumerId, orderId, 1L, revision);
    data.setRestaurantId(restaurantId);
    return data;
  }

  @Test
  public void shouldReviseOrderInParticipantOrderUsingReplyTotal() {
    given().saga(makeSaga(), makeData()).
    expect().command(new BeginReviseOrderCommand(orderId, revision)).
        to(OrderServiceChannels.COMMAND_CHANNEL).
    andGiven().successReply(new BeginReviseOrderReply(revisedTotal)).
    expect().command(new BeginReviseTicketCommand(restaurantId, orderId, revision.getRevisedOrderLineItems())).
        to(KitchenServiceChannels.COMMAND_CHANNEL).
    andGiven().successReply().
    expect().command(new ReviseAuthorization(consumerId, orderId, revisedTotal)).
        to(AccountingServiceChannels.accountingServiceChannel).
    andGiven().successReply().
    expect().command(new ConfirmReviseTicketCommand(restaurantId, orderId, revision.getRevisedOrderLineItems())).
        to(KitchenServiceChannels.COMMAND_CHANNEL).
    andGiven().successReply().
    expect().command(new ConfirmReviseOrderCommand(orderId, revision)).
        to(OrderServiceChannels.COMMAND_CHANNEL);
  }

  @Test
  public void shouldUndoBothParticipantsWhenAuthorizationFails() {
    given().saga(makeSaga(), makeData()).
    expect().command(new BeginReviseOrderCommand(orderId, revision)).
        to(OrderServiceChannels.COMMAND_CHANNEL).
    andGiven().successReply(new BeginReviseOrderReply(revisedTotal)).
    expect().command(new BeginReviseTicketCommand(restaurantId, orderId, revision.getRevisedOrderLineItems())).
        to(KitchenServiceChannels.COMMAND_CHANNEL).
    andGiven().successReply().
    expect().command(new ReviseAuthorization(consumerId, orderId, revisedTotal)).
        to(AccountingServiceChannels.accountingServiceChannel).
    andGiven().failureReply().
    expect().command(new UndoBeginReviseTicketCommand(restaurantId, orderId)).
        to(KitchenServiceChannels.COMMAND_CHANNEL).
    andGiven().successReply().
    expect().command(new UndoBeginReviseOrderCommand(orderId)).
        to(OrderServiceChannels.COMMAND_CHANNEL);
  }
}
