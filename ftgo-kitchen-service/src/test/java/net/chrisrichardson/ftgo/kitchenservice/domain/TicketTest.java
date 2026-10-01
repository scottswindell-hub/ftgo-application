package net.chrisrichardson.ftgo.kitchenservice.domain;

import net.chrisrichardson.ftgo.kitchenservice.api.TicketDetails;
import net.chrisrichardson.ftgo.kitchenservice.api.events.TicketDomainEvent;
import org.junit.Test;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

public class TicketTest {

  @Test
  public void shouldAllowPreparingAfterTicketIsAccepted() {
    Ticket ticket = new Ticket(1L, 2L, new TicketDetails(Collections.emptyList()));
    ticket.confirmCreate();
    ticket.accept(LocalDateTime.now().plusMinutes(1));

    List<TicketDomainEvent> events = ticket.preparing();

    assertEquals(1, events.size());
    assertTrue(events.get(0) instanceof TicketPreparationStartedEvent);
  }
}
