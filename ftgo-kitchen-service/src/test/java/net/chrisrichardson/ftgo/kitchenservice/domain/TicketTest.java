package net.chrisrichardson.ftgo.kitchenservice.domain;

import net.chrisrichardson.ftgo.common.UnsupportedStateTransitionException;
import net.chrisrichardson.ftgo.kitchenservice.api.TicketDetails;
import net.chrisrichardson.ftgo.kitchenservice.api.events.TicketCancelled;
import net.chrisrichardson.ftgo.kitchenservice.api.events.TicketDomainEvent;
import org.junit.Test;

import java.util.List;

import static java.util.Collections.emptyList;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

public class TicketTest {

  @Test
  public void shouldCancelAnUnconfirmedTicketAndPublishCancellation() {
    Ticket ticket = new Ticket(1L, 2L, new TicketDetails(emptyList()));

    List<TicketDomainEvent> events = ticket.cancelCreate();
    assertEquals(1, events.size());
    assertTrue(events.get(0) instanceof TicketCancelled);

    try {
      ticket.confirmCreate();
      fail("A cancelled ticket must not be confirmed");
    } catch (UnsupportedStateTransitionException ignored) {
    }
  }

  @Test(expected = UnsupportedStateTransitionException.class)
  public void shouldNotCancelAConfirmedTicketAsCreateCompensation() {
    Ticket ticket = new Ticket(1L, 2L, new TicketDetails(emptyList()));
    ticket.confirmCreate();

    ticket.cancelCreate();
  }
}
