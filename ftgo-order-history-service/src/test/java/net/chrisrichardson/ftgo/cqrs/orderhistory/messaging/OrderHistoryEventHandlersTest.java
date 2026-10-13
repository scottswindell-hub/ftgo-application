package net.chrisrichardson.ftgo.cqrs.orderhistory.messaging;

import com.amazonaws.services.dynamodbv2.document.spec.UpdateItemSpec;
import io.eventuate.tram.events.subscriber.DomainEventEnvelope;
import net.chrisrichardson.ftgo.cqrs.orderhistory.OrderHistoryDao;
import net.chrisrichardson.ftgo.cqrs.orderhistory.dynamodb.SourceEvent;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderAuthorized;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderState;
import org.junit.Test;
import org.mockito.ArgumentCaptor;

import java.util.Collections;
import java.util.Optional;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class OrderHistoryEventHandlersTest {

  @Test
  public void shouldApproveTheAuthorizedOrderWithItsSourceEvent() {
    OrderHistoryDao dao = mock(OrderHistoryDao.class);
    DomainEventEnvelope<OrderAuthorized> envelope = mock(DomainEventEnvelope.class);
    String aggregateType = "net.chrisrichardson.ftgo.orderservice.domain.Order";
    when(envelope.getAggregateId()).thenReturn("42");
    when(envelope.getAggregateType()).thenReturn(aggregateType);
    when(envelope.getEventId()).thenReturn("event-123");

    new OrderHistoryEventHandlers(dao).handleOrderAuthorized(envelope);

    ArgumentCaptor<Optional<SourceEvent>> sourceEventArg = ArgumentCaptor.forClass(Optional.class);
    verify(dao).updateOrderState(eq("42"), eq(OrderState.APPROVED), sourceEventArg.capture());
    verifyNoMoreInteractions(dao);
    assertTrue(sourceEventArg.getValue().isPresent());
    SourceEvent sourceEvent = sourceEventArg.getValue().get();
    assertEquals(aggregateType, sourceEvent.getAggregateType());
    UpdateItemSpec spec = sourceEvent.addDuplicateDetection(new UpdateItemSpec()
            .withUpdateExpression("SET #state = :state")
            .withNameMap(Collections.singletonMap("#state", "state"))
            .withValueMap(Collections.<String, Object>singletonMap(":state", "APPROVED")));
    assertEquals("events." + aggregateType + "42", spec.getNameMap().get("#duplicateDetection"));
    assertEquals("event-123", spec.getValueMap().get(":eventId"));
  }
}
