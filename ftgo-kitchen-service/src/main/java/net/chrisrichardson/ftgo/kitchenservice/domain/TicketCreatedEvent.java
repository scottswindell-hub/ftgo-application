package net.chrisrichardson.ftgo.kitchenservice.domain;


import net.chrisrichardson.ftgo.kitchenservice.api.TicketDetails;
import net.chrisrichardson.ftgo.kitchenservice.api.events.TicketDomainEvent;

public class TicketCreatedEvent implements TicketDomainEvent {
  private Long id;
  private TicketDetails details;

  private TicketCreatedEvent() {
  }

  public TicketCreatedEvent(Long id, TicketDetails details) {
    this.id = id;
    this.details = details;
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public TicketDetails getDetails() {
    return details;
  }

  public void setDetails(TicketDetails details) {
    this.details = details;
  }
}
