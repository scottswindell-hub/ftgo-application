package net.chrisrichardson.ftgo.kitchenservice.domain;

import net.chrisrichardson.ftgo.common.UnsupportedStateTransitionException;
import net.chrisrichardson.ftgo.kitchenservice.api.TicketDetails;
import net.chrisrichardson.ftgo.kitchenservice.api.events.TicketCancelled;
import net.chrisrichardson.ftgo.kitchenservice.api.events.TicketDomainEvent;
import org.junit.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.Assert.*;

public class TicketCancellationTest {

  @Test
  public void shouldRestoreEachCancellableStateWhenCancellationIsUndone() {
    for (TicketState originalState : new TicketState[] {
            TicketState.AWAITING_ACCEPTANCE, TicketState.ACCEPTED, TicketState.PREPARING}) {
      Ticket ticket = ticketInState(originalState);

      assertTrue(ticket.cancel().isEmpty());
      assertEquals(TicketState.CANCEL_PENDING, stateOf(ticket));
      assertEquals(originalState, ReflectionTestUtils.getField(ticket, "previousState"));

      assertTrue(ticket.undoCancel().isEmpty());
      assertEquals(originalState, stateOf(ticket));
    }
  }

  @Test
  public void shouldResumePreparationAfterCancellationIsUndone() {
    Ticket ticket = ticketInState(TicketState.ACCEPTED);
    ticket.preparing();
    Object preparingTime = ReflectionTestUtils.getField(ticket, "preparingTime");

    ticket.cancel();
    ticket.undoCancel();

    assertEquals(TicketState.PREPARING, stateOf(ticket));
    assertEquals(preparingTime, ReflectionTestUtils.getField(ticket, "preparingTime"));
    ticket.readyForPickup();
    assertEquals(TicketState.READY_FOR_PICKUP, stateOf(ticket));
  }

  @Test
  public void shouldConfirmCancellationFromPreparationWithTheExistingEvent() {
    Ticket ticket = ticketInState(TicketState.PREPARING);
    ticket.cancel();

    List<TicketDomainEvent> events = ticket.confirmCancel();

    assertEquals(TicketState.CANCELLED, stateOf(ticket));
    assertEquals(1, events.size());
    assertTrue(events.get(0) instanceof TicketCancelled);
  }

  @Test
  public void shouldRejectCancellationFromOtherStates() {
    for (TicketState state : new TicketState[] {TicketState.CREATE_PENDING,
            TicketState.READY_FOR_PICKUP, TicketState.PICKED_UP, TicketState.CANCEL_PENDING,
            TicketState.CANCELLED, TicketState.REVISION_PENDING}) {
      Ticket ticket = ticketInState(state);
      try {
        ticket.cancel();
        fail("Cancellation should be rejected from " + state);
      } catch (UnsupportedStateTransitionException expected) {
        assertEquals(state, stateOf(ticket));
      }
    }
  }

  private Ticket ticketInState(TicketState state) {
    Ticket ticket = new Ticket(1L, 2L, new TicketDetails());
    ReflectionTestUtils.setField(ticket, "state", state);
    return ticket;
  }

  private Object stateOf(Ticket ticket) {
    return ReflectionTestUtils.getField(ticket, "state");
  }
}
