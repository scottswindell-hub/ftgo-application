package net.chrisrichardson.ftgo.cqrs.orderhistory.messaging;

import io.eventuate.tram.events.subscriber.DomainEventEnvelope;
import net.chrisrichardson.ftgo.cqrs.orderhistory.OrderHistoryDao;
import net.chrisrichardson.ftgo.cqrs.orderhistory.dynamodb.SourceEvent;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderAuthorized;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderCancelled;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderRejected;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderState;
import org.junit.Before;
import org.junit.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class OrderHistoryEventHandlersTest {

  private static final String AGGREGATE_TYPE = "net.chrisrichardson.ftgo.orderservice.domain.Order";
  private OrderHistoryDao orderHistoryDao;
  private OrderHistoryEventHandlers handlers;

  @Before
  public void setUp() {
    orderHistoryDao = mock(OrderHistoryDao.class);
    handlers = new OrderHistoryEventHandlers(orderHistoryDao);
  }

  @Test
  public void shouldApproveOrderWithoutSourceEvent() {
    DomainEventEnvelope<OrderAuthorized> envelope = envelope();

    handlers.handleOrderAuthorized(envelope);

    verify(orderHistoryDao).updateOrderState("123", OrderState.APPROVED, Optional.empty());
    verifyNoMoreInteractions(orderHistoryDao);
  }

  @Test
  public void shouldRetainSourceEventForCancellation() {
    DomainEventEnvelope<OrderCancelled> envelope = envelope();

    handlers.handleOrderCancelled(envelope);

    assertSourceEvent(OrderState.CANCELLED);
  }

  @Test
  public void shouldRetainSourceEventForRejection() {
    DomainEventEnvelope<OrderRejected> envelope = envelope();

    handlers.handleOrderRejected(envelope);

    assertSourceEvent(OrderState.REJECTED);
  }

  @SuppressWarnings("unchecked")
  private <T extends io.eventuate.tram.events.common.DomainEvent> DomainEventEnvelope<T> envelope() {
    DomainEventEnvelope<T> envelope = mock(DomainEventEnvelope.class);
    when(envelope.getAggregateId()).thenReturn("123");
    when(envelope.getAggregateType()).thenReturn(AGGREGATE_TYPE);
    when(envelope.getEventId()).thenReturn("event-456");
    return envelope;
  }

  @SuppressWarnings("unchecked")
  private void assertSourceEvent(OrderState state) {
    ArgumentCaptor<Optional<SourceEvent>> sourceEvent = ArgumentCaptor.forClass(Optional.class);
    verify(orderHistoryDao).updateOrderState(eq("123"), eq(state), sourceEvent.capture());
    assertTrue(sourceEvent.getValue().isPresent());
    assertEquals(AGGREGATE_TYPE, sourceEvent.getValue().get().getAggregateType());
    verifyNoMoreInteractions(orderHistoryDao);
  }
}
