package net.chrisrichardson.ftgo.kitchenservice.domain;

import io.eventuate.tram.events.aggregates.ResultWithDomainEvents;
import net.chrisrichardson.ftgo.common.RevisedOrderLineItem;
import net.chrisrichardson.ftgo.kitchenservice.api.TicketDetails;
import net.chrisrichardson.ftgo.kitchenservice.api.events.TicketDomainEvent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class KitchenService {

  @Autowired
  private TicketRepository ticketRepository;

  @Autowired
  private TicketDomainEventPublisher domainEventPublisher;

  @Autowired
  private RestaurantRepository restaurantRepository;

  public void createMenu(long id, RestaurantMenu menu) {
    Restaurant restaurant = new Restaurant(id, menu.getMenuItems());
    restaurantRepository.save(restaurant);
  }

  public void reviseMenu(long ticketId, RestaurantMenu revisedMenu) {
    Restaurant restaurant = restaurantRepository.findById(ticketId)
            .orElseThrow(() -> new TicketNotFoundException(ticketId));
    restaurant.reviseMenu(revisedMenu);
  }

  public Ticket createTicket(long restaurantId, Long ticketId, TicketDetails ticketDetails) {
    ResultWithDomainEvents<Ticket, TicketDomainEvent> rwe = Ticket.create(restaurantId, ticketId, ticketDetails);
    ticketRepository.save(rwe.result);
    domainEventPublisher.publish(rwe.result, rwe.events);
    return rwe.result;
  }

  @Transactional
  public void accept(long ticketId, LocalDateTime readyBy) {
    Ticket ticket = findTicket(ticketId);
    List<TicketDomainEvent> events = ticket.accept(readyBy);
    publish(ticket, events);
  }

  public void confirmCreateTicket(Long ticketId) {
    Ticket ro = findTicket(ticketId);
    List<TicketDomainEvent> events = ro.confirmCreate();
    publish(ro, events);
  }

  public void cancelCreateTicket(Long ticketId) {
    Ticket ro = findTicket(ticketId);
    List<TicketDomainEvent> events = ro.cancelCreate();
    publish(ro, events);
  }


  public void cancelTicket(long restaurantId, long ticketId) {
    Ticket ticket = findTicket(ticketId);
    // TODO - verify restaurant id
    List<TicketDomainEvent> events = ticket.cancel();
    publish(ticket, events);
  }


  public void confirmCancelTicket(long restaurantId, long ticketId) {
    Ticket ticket = findTicket(ticketId);
    // TODO - verify restaurant id
    List<TicketDomainEvent> events = ticket.confirmCancel();
    publish(ticket, events);
  }

  public void undoCancel(long restaurantId, long ticketId) {
    Ticket ticket = findTicket(ticketId);
    // TODO - verify restaurant id
    List<TicketDomainEvent> events = ticket.undoCancel();
    publish(ticket, events);

  }

  public void beginReviseOrder(long restaurantId, Long ticketId, List<RevisedOrderLineItem> revisedOrderLineItems) {
    Ticket ticket = findTicket(ticketId);
    // TODO - verify restaurant id
    List<TicketDomainEvent> events = ticket.beginReviseOrder(revisedOrderLineItems);
    publish(ticket, events);

  }

  public void undoBeginReviseOrder(long restaurantId, Long ticketId) {
    Ticket ticket = findTicket(ticketId);
    // TODO - verify restaurant id
    List<TicketDomainEvent> events = ticket.undoBeginReviseOrder();
    publish(ticket, events);
  }

  public void confirmReviseTicket(long restaurantId, long ticketId, List<RevisedOrderLineItem> revisedOrderLineItems) {
    Ticket ticket = findTicket(ticketId);
    // TODO - verify restaurant id
    List<TicketDomainEvent> events = ticket.confirmReviseTicket(revisedOrderLineItems);
    publish(ticket, events);
  }


  private Ticket findTicket(Long ticketId) {
    return ticketRepository.findById(ticketId)
            .orElseThrow(() -> new TicketNotFoundException(ticketId));
  }

  private void publish(Ticket ticket, List<TicketDomainEvent> events) {
    domainEventPublisher.publish(ticket, events);
  }
}
