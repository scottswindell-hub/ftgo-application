package net.chrisrichardson.ftgo.deliveryservice.domain;

import org.junit.Before;
import org.junit.Test;

import java.time.LocalDateTime;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class PlanTest {

  private static final LocalDateTime NOON = LocalDateTime.of(2026, 10, 8, 12, 0);

  private Plan plan;

  @Before
  public void setUp() {
    plan = new Plan();
  }

  private Action pickup(long deliveryId, LocalDateTime time) {
    return Action.makePickup(deliveryId, DeliveryServiceTestData.PICKUP_ADDRESS, time);
  }

  private Action dropoff(long deliveryId, LocalDateTime time) {
    return Action.makeDropoff(deliveryId, DeliveryServiceTestData.DELIVERY_ADDRESS, time);
  }

  @Test
  public void shouldStartEmpty() {
    assertEquals(0, plan.size());
    assertTrue(plan.getActions().isEmpty());
  }

  @Test
  public void shouldCountActions() {
    plan.add(pickup(1, NOON));
    plan.add(dropoff(1, NOON.plusMinutes(15)));
    assertEquals(2, plan.size());
  }

  @Test
  public void shouldBeFreeWhenEmpty() {
    assertTrue(plan.isFreeBetween(NOON, NOON.plusHours(1)));
  }

  @Test
  public void shouldNotBeFreeWhenAnActionFallsInsideTheWindow() {
    plan.add(pickup(1, NOON.plusMinutes(10)));
    assertFalse(plan.isFreeBetween(NOON, NOON.plusMinutes(30)));
  }

  @Test
  public void shouldTreatTheWindowBoundariesAsBusy() {
    plan.add(pickup(1, NOON));
    assertFalse(plan.isFreeBetween(NOON, NOON.plusMinutes(30)));
    assertFalse(plan.isFreeBetween(NOON.minusMinutes(30), NOON));
  }

  @Test
  public void shouldBeFreeWhenActionsAreOutsideTheWindow() {
    plan.add(pickup(1, NOON.minusMinutes(1)));
    plan.add(dropoff(1, NOON.plusMinutes(31)));
    assertTrue(plan.isFreeBetween(NOON, NOON.plusMinutes(30)));
  }

  @Test
  public void shouldRemoveAllActionsOfADelivery() {
    plan.add(pickup(1, NOON));
    plan.add(dropoff(1, NOON.plusMinutes(15)));
    plan.add(pickup(2, NOON.plusHours(1)));

    plan.removeDelivery(1);

    assertEquals(1, plan.size());
    assertTrue(plan.getActions().get(0).actionFor(2));
  }

  @Test
  public void shouldFindActionsForADelivery() {
    plan.add(pickup(1, NOON));
    plan.add(pickup(2, NOON.plusHours(1)));
    plan.add(dropoff(1, NOON.plusMinutes(15)));

    assertEquals(2, plan.actionsForDelivery(1).size());
    assertEquals(1, plan.actionsForDelivery(2).size());
    assertTrue(plan.actionsForDelivery(3).isEmpty());
  }
}
