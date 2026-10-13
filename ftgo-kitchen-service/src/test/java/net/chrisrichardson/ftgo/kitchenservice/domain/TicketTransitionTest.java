package net.chrisrichardson.ftgo.kitchenservice.domain;

import net.chrisrichardson.ftgo.common.UnsupportedStateTransitionException;
import net.chrisrichardson.ftgo.kitchenservice.api.TicketDetails;
import net.chrisrichardson.ftgo.kitchenservice.api.events.TicketDomainEvent;
import org.junit.Test;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.Assert.*;

public class TicketTransitionTest {

  @Test
  public void preparingRecordsTimestampAndEmitsEvent() throws Exception {
    Ticket ticket = ticketInState(TicketState.ACCEPTED);
    LocalDateTime before = LocalDateTime.now();
    List<TicketDomainEvent> events = ticket.preparing();
    LocalDateTime after = LocalDateTime.now();

    assertEquals(TicketState.PREPARING, fieldValue(ticket, "state"));
    assertTimestampBetween(ticket, "preparingTime", before, after);
    assertEquals(1, events.size());
    assertTrue(events.get(0) instanceof TicketPreparationStartedEvent);
  }

  @Test
  public void pickedUpRecordsTimestampAndEmitsEvent() throws Exception {
    Ticket ticket = ticketInState(TicketState.READY_FOR_PICKUP);
    LocalDateTime before = LocalDateTime.now();
    List<TicketDomainEvent> events = ticket.pickedUp();
    LocalDateTime after = LocalDateTime.now();

    assertEquals(TicketState.PICKED_UP, fieldValue(ticket, "state"));
    assertTimestampBetween(ticket, "pickedUpTime", before, after);
    assertEquals(1, events.size());
    assertTrue(events.get(0) instanceof TicketPickedUpEvent);
  }

  @Test
  public void preparingRejectsEveryOtherState() throws Exception {
    for (TicketState state : TicketState.values()) {
      if (state == TicketState.ACCEPTED)
        continue;
      Ticket ticket = ticketInState(state);
      try {
        ticket.preparing();
        fail("Preparing should reject " + state);
      } catch (UnsupportedStateTransitionException expected) {
        assertEquals(state, fieldValue(ticket, "state"));
        assertNull(fieldValue(ticket, "preparingTime"));
      }
    }
  }

  @Test
  public void pickedUpRejectsEveryOtherState() throws Exception {
    for (TicketState state : TicketState.values()) {
      if (state == TicketState.READY_FOR_PICKUP)
        continue;
      Ticket ticket = ticketInState(state);
      try {
        ticket.pickedUp();
        fail("Pickup should reject " + state);
      } catch (UnsupportedStateTransitionException expected) {
        assertEquals(state, fieldValue(ticket, "state"));
        assertNull(fieldValue(ticket, "pickedUpTime"));
      }
    }
  }

  private Ticket ticketInState(TicketState state) throws Exception {
    Ticket ticket = new Ticket(1L, 2L, new TicketDetails());
    Field field = Ticket.class.getDeclaredField("state");
    field.setAccessible(true);
    field.set(ticket, state);
    return ticket;
  }

  private Object fieldValue(Ticket ticket, String name) throws Exception {
    Field field = Ticket.class.getDeclaredField(name);
    field.setAccessible(true);
    return field.get(ticket);
  }

  private void assertTimestampBetween(Ticket ticket, String name,
                                     LocalDateTime before, LocalDateTime after) throws Exception {
    LocalDateTime timestamp = (LocalDateTime) fieldValue(ticket, name);
    assertNotNull(timestamp);
    assertFalse(timestamp.isBefore(before));
    assertFalse(timestamp.isAfter(after));
  }
}
