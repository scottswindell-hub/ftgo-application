package net.chrisrichardson.ftgo.kitchenservice.domain;

import net.chrisrichardson.ftgo.kitchenservice.api.TicketDetails;
import net.chrisrichardson.ftgo.kitchenservice.api.TicketLineItem;
import net.chrisrichardson.ftgo.kitchenservice.api.events.TicketDomainEvent;
import org.junit.Test;

import java.util.List;

import static java.util.Collections.singletonList;
import static org.junit.Assert.assertEquals;

public class TicketCreatedEventTest {

  @Test
  public void shouldPublishTicketIdAndLineItemsWhenCreationIsConfirmed() {
    TicketLineItem lineItem = new TicketLineItem("mushroom-pizza", "Mushroom pizza", 2);
    Ticket ticket = new Ticket(101L, 42L, new TicketDetails(singletonList(lineItem)));

    List<TicketDomainEvent> events = ticket.confirmCreate();

    assertEquals(1, events.size());
    TicketCreatedEvent event = (TicketCreatedEvent) events.get(0);
    assertEquals(Long.valueOf(42L), event.getId());
    assertEquals(1, event.getDetails().getLineItems().size());
    assertEquals("mushroom-pizza", event.getDetails().getLineItems().get(0).getMenuItemId());
    assertEquals("Mushroom pizza", event.getDetails().getLineItems().get(0).getName());
    assertEquals(2, event.getDetails().getLineItems().get(0).getQuantity());
  }
}
