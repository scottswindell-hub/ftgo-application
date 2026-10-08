package net.chrisrichardson.ftgo.orderservice.messaging;

import net.chrisrichardson.ftgo.common.Money;
import net.chrisrichardson.ftgo.orderservice.domain.MenuItem;
import org.junit.Test;

import java.util.List;

import static java.util.Collections.singletonList;
import static org.junit.Assert.assertEquals;

public class RestaurantEventMapperTest {

  @Test
  public void shouldRoundTripMenuPricesThroughMinorUnits() {
    MenuItem original = new MenuItem("item-1", "Vindaloo", new Money("12.34"));

    List<net.chrisrichardson.ftgo.restaurantservice.events.MenuItem> eventItems =
            RestaurantEventMapper.fromMenuItems(singletonList(original));

    assertEquals("1234", eventItems.get(0).getPrice());

    List<MenuItem> restored = RestaurantEventMapper.toMenuItems(eventItems);
    assertEquals(original.getPrice(), restored.get(0).getPrice());
  }
}
