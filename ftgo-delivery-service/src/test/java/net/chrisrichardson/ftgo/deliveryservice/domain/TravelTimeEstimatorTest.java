package net.chrisrichardson.ftgo.deliveryservice.domain;

import net.chrisrichardson.ftgo.common.Address;
import org.junit.Test;

import static org.junit.Assert.assertEquals;

public class TravelTimeEstimatorTest {

  private final TravelTimeEstimator estimator = new TravelTimeEstimator();

  private static Address address(String city, String zip) {
    return new Address("1 Main Street", null, city, "CA", zip);
  }

  @Test
  public void shouldUseTheShortestTimeWithinTheSameZip() {
    assertEquals(15, estimator.estimateMinutes(address("Oakland", "94612"), address("Oakland", "94612")));
    assertEquals(15, estimator.estimateMinutes(DeliveryServiceTestData.PICKUP_ADDRESS, DeliveryServiceTestData.DELIVERY_ADDRESS));
  }

  @Test
  public void shouldUseTheCityTimeWithinTheSameCity() {
    assertEquals(25, estimator.estimateMinutes(address("Oakland", "94612"), address("Oakland", "94607")));
  }

  @Test
  public void shouldIgnoreCaseAndSurroundingSpaces() {
    assertEquals(25, estimator.estimateMinutes(address("Oakland", "94612"), address(" oakland ", "94607")));
    assertEquals(15, estimator.estimateMinutes(address("Oakland", " 94612"), address("Oakland", "94612 ")));
  }

  @Test
  public void shouldUseTheLongestTimeAcrossCities() {
    assertEquals(45, estimator.estimateMinutes(address("Oakland", "94612"), address("Berkeley", "94704")));
  }

  @Test
  public void shouldTreatMissingValuesAsDifferent() {
    assertEquals(45, estimator.estimateMinutes(address(null, null), address(null, null)));
    assertEquals(45, estimator.estimateMinutes(address("Oakland", null), address(null, "94612")));
  }
}
