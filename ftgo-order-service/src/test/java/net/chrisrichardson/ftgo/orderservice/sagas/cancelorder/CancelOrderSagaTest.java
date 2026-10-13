package net.chrisrichardson.ftgo.orderservice.sagas.cancelorder;

import net.chrisrichardson.ftgo.accountservice.api.AccountingServiceChannels;
import net.chrisrichardson.ftgo.accountservice.api.ReverseAuthorizationCommand;
import net.chrisrichardson.ftgo.common.CommonJsonMapperInitializer;
import net.chrisrichardson.ftgo.kitchenservice.api.*;
import net.chrisrichardson.ftgo.orderservice.api.OrderServiceChannels;
import net.chrisrichardson.ftgo.orderservice.sagaparticipants.*;
import org.junit.BeforeClass;
import org.junit.Test;

import static io.eventuate.tram.sagas.testing.SagaUnitTestSupport.given;
import static net.chrisrichardson.ftgo.orderservice.OrderDetailsMother.*;
import static net.chrisrichardson.ftgo.orderservice.RestaurantMother.AJANTA_ID;

public class CancelOrderSagaTest {

  @BeforeClass
  public static void initialize() {
    CommonJsonMapperInitializer.registerMoneyModule();
  }

  private CancelOrderSaga makeSaga() {
    CancelOrderSaga saga = new CancelOrderSaga();
    saga.initializeSagaDefinition();
    return saga;
  }

  private CancelOrderSagaData makeData() {
    CancelOrderSagaData data = new CancelOrderSagaData(CONSUMER_ID, ORDER_ID, CHICKEN_VINDALOO_ORDER_TOTAL);
    data.setRestaurantId(AJANTA_ID);
    return data;
  }

  @Test
  public void shouldCancelOrder() {
    given().saga(makeSaga(), makeData()).
    expect().command(new BeginCancelCommand(ORDER_ID)).to(OrderServiceChannels.COMMAND_CHANNEL).
    andGiven().successReply().
    expect().command(new BeginCancelTicketCommand(AJANTA_ID, ORDER_ID)).to(KitchenServiceChannels.COMMAND_CHANNEL).
    andGiven().successReply().
    expect().command(new ReverseAuthorizationCommand(CONSUMER_ID, ORDER_ID, CHICKEN_VINDALOO_ORDER_TOTAL)).
        to(AccountingServiceChannels.accountingServiceChannel).
    andGiven().successReply().
    expect().command(new ConfirmCancelTicketCommand(AJANTA_ID, ORDER_ID)).to(KitchenServiceChannels.COMMAND_CHANNEL).
    andGiven().successReply().
    expect().command(new ConfirmCancelOrderCommand(ORDER_ID)).to(OrderServiceChannels.COMMAND_CHANNEL);
  }

  @Test
  public void shouldUndoCancellationWhenAuthorizationReversalFails() {
    given().saga(makeSaga(), makeData()).
    expect().command(new BeginCancelCommand(ORDER_ID)).to(OrderServiceChannels.COMMAND_CHANNEL).
    andGiven().successReply().
    expect().command(new BeginCancelTicketCommand(AJANTA_ID, ORDER_ID)).to(KitchenServiceChannels.COMMAND_CHANNEL).
    andGiven().successReply().
    expect().command(new ReverseAuthorizationCommand(CONSUMER_ID, ORDER_ID, CHICKEN_VINDALOO_ORDER_TOTAL)).
        to(AccountingServiceChannels.accountingServiceChannel).
    andGiven().failureReply().
    expect().command(new UndoBeginCancelTicketCommand(AJANTA_ID, ORDER_ID)).to(KitchenServiceChannels.COMMAND_CHANNEL).
    andGiven().successReply().
    expect().command(new UndoBeginCancelCommand(ORDER_ID)).to(OrderServiceChannels.COMMAND_CHANNEL);
  }
}
