package net.chrisrichardson.ftgo.kitchenservice.domain;

import io.eventuate.tram.events.aggregates.ResultWithDomainEvents;
import net.chrisrichardson.ftgo.common.NotYetImplementedException;
import net.chrisrichardson.ftgo.common.RevisedOrderLineItem;
import net.chrisrichardson.ftgo.common.UnsupportedStateTransitionException;
import net.chrisrichardson.ftgo.kitchenservice.api.TicketDetails;
import net.chrisrichardson.ftgo.kitchenservice.api.TicketLineItem;
import net.chrisrichardson.ftgo.kitchenservice.api.events.TicketAcceptedEvent;
import net.chrisrichardson.ftgo.kitchenservice.api.events.TicketCancelled;
import net.chrisrichardson.ftgo.kitchenservice.api.events.TicketDomainEvent;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

import static java.util.Collections.emptyList;
import static java.util.Collections.singletonList;

/**
 * A restaurant's ticket for one order: the kitchen-side aggregate of the order lifecycle.
 *
 * <p>Each public operation is a state transition guarded by the current {@link TicketState};
 * an operation invoked in any other state fails with {@link UnsupportedStateTransitionException}.
 * Operations return the domain events the transition produced, for the caller to publish.
 *
 * <pre>
 * CREATE_PENDING -> AWAITING_ACCEPTANCE -> (accept) -> PREPARING -> READY_FOR_PICKUP -> PICKED_UP
 *                    AWAITING_ACCEPTANCE | ACCEPTED -> CANCEL_PENDING   -> CANCELLED | (previous state)
 *                    AWAITING_ACCEPTANCE | ACCEPTED -> REVISION_PENDING -> (previous state)
 * </pre>
 */
@Entity
@Table(name = "tickets")
@Access(AccessType.FIELD)
public class Ticket {

  @Id
  private Long id;

  @Enumerated(EnumType.STRING)
  private TicketState state;

  private TicketState previousState;

  private Long restaurantId;

  @ElementCollection
  @CollectionTable(name = "ticket_line_items")
  private List<TicketLineItem> lineItems;

  private LocalDateTime readyBy;
  private LocalDateTime acceptTime;
  private LocalDateTime preparingTime;
  private LocalDateTime pickedUpTime;
  private LocalDateTime readyForPickupTime;

  /**
   * Creates a ticket for an order in the CREATE_PENDING state. Creation itself publishes no events.
   */
  public static ResultWithDomainEvents<Ticket, TicketDomainEvent> create(long restaurantId, Long id, TicketDetails details) {
    return new ResultWithDomainEvents<>(new Ticket(restaurantId, id, details));
  }

  /** Required by JPA. */
  private Ticket() {
  }

  public Ticket(long restaurantId, Long id, TicketDetails details) {
    this.restaurantId = restaurantId;
    this.id = id;
    this.state = TicketState.CREATE_PENDING;
    this.lineItems = details.getLineItems();
  }

  /**
   * Confirms a pending ticket once the order is authorized: CREATE_PENDING to AWAITING_ACCEPTANCE.
   */
  public List<TicketDomainEvent> confirmCreate() {
    switch (state) {
      case CREATE_PENDING:
        state = TicketState.AWAITING_ACCEPTANCE;
        return singletonList(new TicketCreatedEvent(id, new TicketDetails()));
      default:
        throw new UnsupportedStateTransitionException(state);
    }
  }

  /**
   * Compensates creation. Not yet implemented.
   */
  public List<TicketDomainEvent> cancelCreate() {
    throw new NotYetImplementedException();
  }


  /**
   * Accepts the ticket for preparation by {@code readyBy}, which must be after the acceptance time.
   * Allowed only while AWAITING_ACCEPTANCE.
   */
  public List<TicketDomainEvent> accept(LocalDateTime readyBy) {
    switch (state) {
      case AWAITING_ACCEPTANCE:
        // Verify that readyBy is in the futurestate = TicketState.ACCEPTED;
        this.acceptTime = now();
        if (!acceptTime.isBefore(readyBy))
          throw new IllegalArgumentException(String.format("readyBy %s is not after now %s", readyBy, acceptTime));
        this.readyBy = readyBy;
        return singletonList(new TicketAcceptedEvent(readyBy));
      default:
        throw new UnsupportedStateTransitionException(state);
    }
  }

  // TODO reject()

  // TODO cancel()

  /**
   * Starts preparation: ACCEPTED to PREPARING.
   */
  public List<TicketDomainEvent> preparing() {
    switch (state) {
      case ACCEPTED:
        this.state = TicketState.PREPARING;
        this.preparingTime = now();
        return singletonList(new TicketPreparationStartedEvent());
      default:
        throw new UnsupportedStateTransitionException(state);
    }
  }

  /**
   * Marks the order ready: PREPARING to READY_FOR_PICKUP.
   */
  public List<TicketDomainEvent> readyForPickup() {
    switch (state) {
      case PREPARING:
        this.state = TicketState.READY_FOR_PICKUP;
        this.readyForPickupTime = now();
        return singletonList(new TicketPreparationCompletedEvent());
      default:
        throw new UnsupportedStateTransitionException(state);
    }
  }

  /**
   * Hands the order to the courier: READY_FOR_PICKUP to PICKED_UP.
   */
  public List<TicketDomainEvent> pickedUp() {
    switch (state) {
      case READY_FOR_PICKUP:
        this.state = TicketState.PICKED_UP;
        this.pickedUpTime = now();
        return singletonList(new TicketPickedUpEvent());
      default:
        throw new UnsupportedStateTransitionException(state);
    }
  }

  /**
   * Changes line-item quantities. Accepted while AWAITING_ACCEPTANCE or PREPARING, but not yet implemented.
   */
  public void changeLineItemQuantity() {
    switch (state) {
      case AWAITING_ACCEPTANCE:
        // TODO
        break;
      case PREPARING:
        // TODO - too late
        break;
      default:
        throw new UnsupportedStateTransitionException(state);
    }

  }

  /**
   * Begins cancellation from AWAITING_ACCEPTANCE or ACCEPTED, remembering the state to restore on undo.
   */
  public List<TicketDomainEvent> cancel() {
    switch (state) {
      case AWAITING_ACCEPTANCE:
      case ACCEPTED:
        this.previousState = state;
        this.state = TicketState.CANCEL_PENDING;
        return emptyList();
      default:
        throw new UnsupportedStateTransitionException(state);
    }
  }

  /**
   * Completes cancellation: CANCEL_PENDING to CANCELLED.
   */
  public List<TicketDomainEvent> confirmCancel() {
    switch (state) {
      case CANCEL_PENDING:
        this.state = TicketState.CANCELLED;
        return singletonList(new TicketCancelled());
      default:
        throw new UnsupportedStateTransitionException(state);

    }
  }
  /**
   * Undoes a pending cancellation, restoring the state the ticket was in before it.
   */
  public List<TicketDomainEvent> undoCancel() {
    switch (state) {
      case CANCEL_PENDING:
        this.state = this.previousState;
        return emptyList();
      default:
        throw new UnsupportedStateTransitionException(state);

    }
  }

  /**
   * Begins a revision from AWAITING_ACCEPTANCE or ACCEPTED, remembering the state to restore afterwards.
   */
  public List<TicketDomainEvent> beginReviseOrder(List<RevisedOrderLineItem> revisedOrderLineItems) {
    switch (state) {
      case AWAITING_ACCEPTANCE:
      case ACCEPTED:
        this.previousState = state;
        this.state = TicketState.REVISION_PENDING;
        return emptyList();
      default:
        throw new UnsupportedStateTransitionException(state);
    }
  }

  /**
   * Undoes a pending revision, restoring the previous state.
   */
  public List<TicketDomainEvent> undoBeginReviseOrder() {
    switch (state) {
      case REVISION_PENDING:
        this.state = this.previousState;
        return emptyList();
      default:
        throw new UnsupportedStateTransitionException(state);
    }
  }

  /**
   * Completes a revision, restoring the previous state.
   */
  public List<TicketDomainEvent> confirmReviseTicket(List<RevisedOrderLineItem> revisedOrderLineItems) {
    switch (state) {
      case REVISION_PENDING:
        this.state = this.previousState;
        return singletonList(new TicketRevised());
      default:
        throw new UnsupportedStateTransitionException(state);

    }
  }

  // ---------------------------------------------------------------------------
  // Accessors and helpers
  // ---------------------------------------------------------------------------

  public Long getId() {
    return id;
  }

  /** The time a transition is recorded at. */
  private static LocalDateTime now() {
    return LocalDateTime.now();
  }
}
