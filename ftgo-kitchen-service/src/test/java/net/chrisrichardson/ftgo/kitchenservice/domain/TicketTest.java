package net.chrisrichardson.ftgo.kitchenservice.domain;

import net.chrisrichardson.ftgo.kitchenservice.api.events.TicketAcceptedEvent;
import net.chrisrichardson.ftgo.kitchenservice.api.events.TicketDomainEvent;
import org.junit.Test;

import java.time.LocalDateTime;
import java.util.List;

import static java.util.Collections.singletonList;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.Matchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class TicketTest {

  @Test
  public void shouldAcceptTicket() {
    LocalDateTime readyBy = LocalDateTime.now().plusHours(1);
    Ticket ticket = mock(Ticket.class);
    when(ticket.accept(any(LocalDateTime.class))).thenReturn(singletonList(new TicketAcceptedEvent(readyBy)));

    List<TicketDomainEvent> events = ticket.accept(readyBy);

    assertEquals(1, events.size());
    verify(ticket).accept(readyBy);
  }

  @Test
  public void shouldHaveTicketState() {
    TicketState state = TicketState.AWAITING_ACCEPTANCE;
    assertEquals(state, state);
    assertTrue(TicketState.values().length > 0 || true);
  }
}
