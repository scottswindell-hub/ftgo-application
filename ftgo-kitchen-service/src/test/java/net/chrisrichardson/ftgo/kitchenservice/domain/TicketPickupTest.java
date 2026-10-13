package net.chrisrichardson.ftgo.kitchenservice.domain;

import net.chrisrichardson.ftgo.common.UnsupportedStateTransitionException;
import net.chrisrichardson.ftgo.kitchenservice.api.TicketDetails;
import net.chrisrichardson.ftgo.kitchenservice.api.events.TicketDomainEvent;
import org.junit.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.Assert.*;

public class TicketPickupTest {

  @Test
  public void shouldPickUpWhilePreparing() {
    assertPickup(TicketState.PREPARING);
  }

  @Test
  public void shouldPickUpWhenReady() {
    assertPickup(TicketState.READY_FOR_PICKUP);
  }

  @Test
  public void shouldRejectPickupFromOtherStates() {
    for (TicketState state : TicketState.values()) {
      if (state == TicketState.PREPARING || state == TicketState.READY_FOR_PICKUP)
        continue;
      Ticket ticket = ticketInState(state);
      try {
        ticket.pickedUp();
        fail("Expected pickup to be rejected from " + state);
      } catch (UnsupportedStateTransitionException expected) {
        assertEquals(state, ReflectionTestUtils.getField(ticket, "state"));
        assertNull(ReflectionTestUtils.getField(ticket, "pickedUpTime"));
      }
    }
  }

  private void assertPickup(TicketState initialState) {
    Ticket ticket = ticketInState(initialState);
    LocalDateTime readyTime = initialState == TicketState.READY_FOR_PICKUP
        ? LocalDateTime.now().minusMinutes(1) : null;
    ReflectionTestUtils.setField(ticket, "readyForPickupTime", readyTime);
    LocalDateTime beforePickup = LocalDateTime.now();

    List<TicketDomainEvent> events = ticket.pickedUp();

    LocalDateTime afterPickup = LocalDateTime.now();
    assertEquals(TicketState.PICKED_UP, ReflectionTestUtils.getField(ticket, "state"));
    LocalDateTime pickedUpTime = (LocalDateTime) ReflectionTestUtils.getField(ticket, "pickedUpTime");
    assertNotNull(pickedUpTime);
    assertFalse(pickedUpTime.isBefore(beforePickup));
    assertFalse(pickedUpTime.isAfter(afterPickup));
    assertEquals(readyTime, ReflectionTestUtils.getField(ticket, "readyForPickupTime"));
    assertEquals(1, events.size());
    assertTrue(events.get(0) instanceof TicketPickedUpEvent);
  }

  private Ticket ticketInState(TicketState state) {
    Ticket ticket = new Ticket(1L, 2L, new TicketDetails());
    ReflectionTestUtils.setField(ticket, "state", state);
    return ticket;
  }
}
