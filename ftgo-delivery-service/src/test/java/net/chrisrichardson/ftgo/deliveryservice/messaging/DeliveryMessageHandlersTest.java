package net.chrisrichardson.ftgo.deliveryservice.messaging;

import io.eventuate.tram.events.subscriber.DomainEventEnvelope;
import net.chrisrichardson.ftgo.common.Address;
import net.chrisrichardson.ftgo.deliveryservice.domain.DeliveryService;
import net.chrisrichardson.ftgo.restaurantservice.events.RestaurantCreated;
import org.junit.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class DeliveryMessageHandlersTest {

  @Test
  public void shouldPassRestaurantEventValuesWithoutNormalization() {
    assertRestaurantMapping("  MiXeD Restaurant  ", " Suite 2 ");
  }

  @Test
  public void shouldKeepAbsentValuesWithoutFallbacks() {
    assertRestaurantMapping(null, null);
  }

  @SuppressWarnings("unchecked")
  private void assertRestaurantMapping(String name, String street2) {
    DeliveryService deliveryService = mock(DeliveryService.class);
    DeliveryMessageHandlers handlers = new DeliveryMessageHandlers(deliveryService);
    DomainEventEnvelope<RestaurantCreated> envelope = mock(DomainEventEnvelope.class);
    RestaurantCreated event = mock(RestaurantCreated.class);
    net.chrisrichardson.ftgo.restaurantservice.events.Address eventAddress =
            mock(net.chrisrichardson.ftgo.restaurantservice.events.Address.class);
    when(envelope.getEvent()).thenReturn(event);
    when(envelope.getAggregateId()).thenReturn("000103");
    when(event.getName()).thenReturn(name);
    when(event.getAddress()).thenReturn(eventAddress);
    when(eventAddress.getStreet1()).thenReturn(" 12 Main Street ");
    when(eventAddress.getStreet2()).thenReturn(street2);
    when(eventAddress.getCity()).thenReturn(" MiXeD City ");
    when(eventAddress.getState()).thenReturn(" az ");
    when(eventAddress.getZip()).thenReturn(" 00123 ");

    handlers.handleRestaurantCreated(envelope);

    verify(deliveryService).createRestaurant(103L, name,
            new Address(" 12 Main Street ", street2, " MiXeD City ", " az ", " 00123 "));
  }
}
