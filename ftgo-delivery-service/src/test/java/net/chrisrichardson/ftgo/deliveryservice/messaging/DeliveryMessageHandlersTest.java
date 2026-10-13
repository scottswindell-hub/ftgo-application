package net.chrisrichardson.ftgo.deliveryservice.messaging;

import io.eventuate.tram.events.subscriber.DomainEventEnvelope;
import net.chrisrichardson.ftgo.common.Address;
import net.chrisrichardson.ftgo.deliveryservice.domain.DeliveryService;
import net.chrisrichardson.ftgo.restaurantservice.events.RestaurantCreated;
import org.junit.Test;

import java.util.Locale;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class DeliveryMessageHandlersTest {

  @Test
  public void shouldTrimAndUppercaseRestaurantName() {
    assertRestaurantCreated(" \tBistro Central\n", "BISTRO CENTRAL");
  }

  @Test
  public void shouldPreserveNullRestaurantName() {
    assertRestaurantCreated(null, null);
  }

  @Test
  public void shouldPreserveEmptyStandardizedName() {
    assertRestaurantCreated(" \t\n", "");
  }

  @Test
  public void shouldUppercaseIndependentlyOfDefaultLocale() {
    Locale original = Locale.getDefault();
    try {
      Locale.setDefault(new Locale("tr", "TR"));
      assertRestaurantCreated(" bistro ", "BISTRO");
    } finally {
      Locale.setDefault(original);
    }
  }

  @SuppressWarnings("unchecked")
  private void assertRestaurantCreated(String name, String expectedName) {
    DeliveryService service = mock(DeliveryService.class);
    DomainEventEnvelope<RestaurantCreated> envelope = mock(DomainEventEnvelope.class);
    RestaurantCreated event = mock(RestaurantCreated.class);
    net.chrisrichardson.ftgo.restaurantservice.events.Address address =
            new net.chrisrichardson.ftgo.restaurantservice.events.Address()
                    .withStreet1("123 Main Street").withStreet2("Suite 4")
                    .withCity("Oakland").withState("CA").withZip("94612");
    when(envelope.getAggregateId()).thenReturn("103");
    when(envelope.getEvent()).thenReturn(event);
    when(event.getName()).thenReturn(name);
    when(event.getAddress()).thenReturn(address);

    new DeliveryMessageHandlers(service).handleRestaurantCreated(envelope);

    verify(service).createRestaurant(103L, expectedName,
            new Address("123 Main Street", "Suite 4", "Oakland", "CA", "94612"));
    verifyNoMoreInteractions(service);
  }
}
