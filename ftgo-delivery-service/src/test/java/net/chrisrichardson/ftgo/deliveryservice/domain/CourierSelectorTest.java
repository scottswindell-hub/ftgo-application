package net.chrisrichardson.ftgo.deliveryservice.domain;

import org.junit.Test;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

public class CourierSelectorTest {

  private static final LocalDateTime NOON = LocalDateTime.of(2026, 10, 8, 12, 0);
  private static final LocalDateTime FROM = NOON;
  private static final LocalDateTime TO = NOON.plusMinutes(15);

  private final CourierSelector selector = new CourierSelector();

  private Courier courier(long id, int plannedActions) {
    Courier courier = Courier.create(id);
    for (int i = 0; i < plannedActions; i++) {
      courier.addAction(Action.makePickup(1000 + i, DeliveryServiceTestData.PICKUP_ADDRESS, NOON.plusHours(2 + i)));
    }
    return courier;
  }

  @Test
  public void shouldFindNobodyWhenThereAreNoCandidates() {
    assertFalse(selector.select(Collections.emptyList(), FROM, TO).isPresent());
  }

  @Test
  public void shouldChooseTheOnlyFreeCourier() {
    Courier only = courier(7, 0);
    assertEquals(Optional.of(only), selector.select(Collections.singletonList(only), FROM, TO));
  }

  @Test
  public void shouldChooseTheCourierWithTheLeastWork() {
    Courier busy = courier(1, 3);
    Courier idle = courier(2, 0);
    Courier light = courier(3, 1);

    assertEquals(idle, selector.select(Arrays.asList(busy, idle, light), FROM, TO).get());
  }

  @Test
  public void shouldBreakTiesWithTheLowestId() {
    Courier second = courier(20, 1);
    Courier first = courier(10, 1);
    Courier third = courier(30, 1);

    assertEquals(first, selector.select(Arrays.asList(second, first, third), FROM, TO).get());
  }

  @Test
  public void shouldSkipCouriersWhoAreBusyInTheWindow() {
    Courier occupied = Courier.create(1);
    occupied.addAction(Action.makePickup(5, DeliveryServiceTestData.PICKUP_ADDRESS, NOON.plusMinutes(5)));
    Courier free = courier(2, 2);

    assertEquals(free, selector.select(Arrays.asList(occupied, free), FROM, TO).get());
  }

  @Test
  public void shouldFindNobodyWhenEveryoneIsBusyInTheWindow() {
    Courier first = Courier.create(1);
    first.addAction(Action.makeDropoff(5, DeliveryServiceTestData.DELIVERY_ADDRESS, FROM));
    Courier second = Courier.create(2);
    second.addAction(Action.makePickup(6, DeliveryServiceTestData.PICKUP_ADDRESS, TO));

    assertFalse(selector.select(Arrays.asList(first, second), FROM, TO).isPresent());
  }

  @Test
  public void shouldBeRepeatable() {
    Courier a = courier(1, 1);
    Courier b = courier(2, 1);
    for (int i = 0; i < 20; i++) {
      assertEquals(a, selector.select(Arrays.asList(b, a), FROM, TO).get());
    }
  }
}
