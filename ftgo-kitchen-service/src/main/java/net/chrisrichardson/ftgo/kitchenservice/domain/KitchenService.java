package net.chrisrichardson.ftgo.kitchenservice.domain;

import io.eventuate.tram.events.aggregates.ResultWithDomainEvents;
import net.chrisrichardson.ftgo.common.RevisedOrderLineItem;
import net.chrisrichardson.ftgo.kitchenservice.api.TicketDetails;
import net.chrisrichardson.ftgo.kitchenservice.api.events.TicketDomainEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Application service for the kitchen: restaurant menus and the ticket lifecycle.
 *
 * <p>Every ticket operation follows the same shape: load the ticket, ask the
 * {@link Ticket} aggregate to perform the transition, and publish the domain
 * events it returns. The aggregate owns the state machine; this service only
 * coordinates persistence and publication.
 */
public class KitchenService {

  private static final Logger logger = LoggerFactory.getLogger(KitchenService.class);

  @Autowired
  private TicketRepository ticketRepository;

  @Autowired
  private TicketDomainEventPublisher domainEventPublisher;

  @Autowired
  private RestaurantRepository restaurantRepository;

  // ---------------------------------------------------------------------------
  // Restaurant menus
  // ---------------------------------------------------------------------------

  /**
   * Records the menu of a newly created restaurant.
   *
   * @param id   the restaurant id
   * @param menu the restaurant's initial menu
   */
  public void createMenu(long id, RestaurantMenu menu) {
    logger.debug("Creating menu for restaurant {}", id);
    Restaurant restaurant = new Restaurant(id, menu.getMenuItems());
    restaurantRepository.save(restaurant);
  }

  /**
   * Replaces the menu of an existing restaurant.
   *
   * <p>A missing restaurant is reported as {@link TicketNotFoundException}, as it
   * always has been; callers rely on that exception type.
   *
   * @param ticketId    the restaurant id (historically named ticketId)
   * @param revisedMenu the restaurant's new menu
   */
  public void reviseMenu(long ticketId, RestaurantMenu revisedMenu) {
    logger.debug("Revising menu for restaurant {}", ticketId);
    Restaurant restaurant = restaurantRepository.findById(ticketId)
            .orElseThrow(() -> new TicketNotFoundException(ticketId));
    restaurant.reviseMenu(revisedMenu);
  }

  // ---------------------------------------------------------------------------
  // Ticket creation (Create Order saga)
  // ---------------------------------------------------------------------------

  /**
   * Creates a ticket in the CREATE_PENDING state and publishes its creation events.
   *
   * @param restaurantId  the restaurant preparing the order
   * @param ticketId      the ticket id, which is the order id
   * @param ticketDetails the line items to prepare
   * @return the new ticket
   */
  public Ticket createTicket(long restaurantId, Long ticketId, TicketDetails ticketDetails) {
    logger.info("Creating ticket {} for restaurant {}", ticketId, restaurantId);
    ResultWithDomainEvents<Ticket, TicketDomainEvent> rwe = Ticket.create(restaurantId, ticketId, ticketDetails);
    ticketRepository.save(rwe.result);
    domainEventPublisher.publish(rwe.result, rwe.events);
    return rwe.result;
  }

  /**
   * Confirms a pending ticket once the Create Order saga has authorized the order.
   *
   * @param ticketId the ticket id
   */
  public void confirmCreateTicket(Long ticketId) {
    logger.info("Confirming creation of ticket {}", ticketId);
    Ticket ticket = findTicket(ticketId);
    publish(ticket, ticket.confirmCreate());
  }

  /**
   * Compensates ticket creation when the Create Order saga fails.
   *
   * @param ticketId the ticket id
   */
  public void cancelCreateTicket(Long ticketId) {
    logger.info("Cancelling creation of ticket {}", ticketId);
    Ticket ticket = findTicket(ticketId);
    publish(ticket, ticket.cancelCreate());
  }

  // ---------------------------------------------------------------------------
  // Restaurant actions
  // ---------------------------------------------------------------------------

  /**
   * Accepts a ticket on behalf of the restaurant, promising it ready by {@code readyBy}.
   *
   * @param ticketId the ticket id
   * @param readyBy  when the restaurant promises the order will be ready
   */
  @Transactional
  public void accept(long ticketId, LocalDateTime readyBy) {
    logger.info("Accepting ticket {} ready by {}", ticketId, readyBy);
    Ticket ticket = findTicket(ticketId);
    publish(ticket, ticket.accept(readyBy));
  }

  // ---------------------------------------------------------------------------
  // Cancellation (Cancel Order saga)
  // ---------------------------------------------------------------------------

  /**
   * Begins cancelling a ticket.
   *
   * @param restaurantId the restaurant id (not yet verified against the ticket)
   * @param ticketId     the ticket id
   */
  public void cancelTicket(long restaurantId, long ticketId) {
    logger.info("Beginning cancellation of ticket {}", ticketId);
    Ticket ticket = findTicket(ticketId);
    // TODO - verify restaurant id
    publish(ticket, ticket.cancel());
  }

  /**
   * Completes the cancellation of a ticket.
   *
   * @param restaurantId the restaurant id (not yet verified against the ticket)
   * @param ticketId     the ticket id
   */
  public void confirmCancelTicket(long restaurantId, long ticketId) {
    logger.info("Confirming cancellation of ticket {}", ticketId);
    Ticket ticket = findTicket(ticketId);
    // TODO - verify restaurant id
    publish(ticket, ticket.confirmCancel());
  }

  /**
   * Compensates a cancellation that the Cancel Order saga could not complete.
   *
   * @param restaurantId the restaurant id (not yet verified against the ticket)
   * @param ticketId     the ticket id
   */
  public void undoCancel(long restaurantId, long ticketId) {
    logger.info("Undoing cancellation of ticket {}", ticketId);
    Ticket ticket = findTicket(ticketId);
    // TODO - verify restaurant id
    publish(ticket, ticket.undoCancel());
  }

  // ---------------------------------------------------------------------------
  // Revision (Revise Order saga)
  // ---------------------------------------------------------------------------

  /**
   * Begins revising a ticket's line items.
   *
   * @param restaurantId          the restaurant id (not yet verified against the ticket)
   * @param ticketId              the ticket id
   * @param revisedOrderLineItems the proposed line-item quantities
   */
  public void beginReviseOrder(long restaurantId, Long ticketId, List<RevisedOrderLineItem> revisedOrderLineItems) {
    logger.info("Beginning revision of ticket {}", ticketId);
    Ticket ticket = findTicket(ticketId);
    // TODO - verify restaurant id
    publish(ticket, ticket.beginReviseOrder(revisedOrderLineItems));
  }

  /**
   * Compensates a revision that the Revise Order saga could not complete.
   *
   * @param restaurantId the restaurant id (not yet verified against the ticket)
   * @param ticketId     the ticket id
   */
  public void undoBeginReviseOrder(long restaurantId, Long ticketId) {
    logger.info("Undoing revision of ticket {}", ticketId);
    Ticket ticket = findTicket(ticketId);
    // TODO - verify restaurant id
    publish(ticket, ticket.undoBeginReviseOrder());
  }

  /**
   * Completes the revision of a ticket.
   *
   * @param restaurantId          the restaurant id (not yet verified against the ticket)
   * @param ticketId              the ticket id
   * @param revisedOrderLineItems the confirmed line-item quantities
   */
  public void confirmReviseTicket(long restaurantId, long ticketId, List<RevisedOrderLineItem> revisedOrderLineItems) {
    logger.info("Confirming revision of ticket {}", ticketId);
    Ticket ticket = findTicket(ticketId);
    // TODO - verify restaurant id
    publish(ticket, ticket.confirmReviseTicket(revisedOrderLineItems));
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Loads a ticket, failing with {@link TicketNotFoundException} when it does not exist.
   */
  private Ticket findTicket(Long ticketId) {
    return ticketRepository.findById(ticketId)
            .orElseThrow(() -> new TicketNotFoundException(ticketId));
  }

  /**
   * Publishes the events an aggregate operation returned.
   */
  private void publish(Ticket ticket, List<TicketDomainEvent> events) {
    domainEventPublisher.publish(ticket, events);
  }
}
