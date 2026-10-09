package net.chrisrichardson.ftgo.deliveryservice.domain;

import net.chrisrichardson.ftgo.common.Address;

/**
 * Estimates how long a courier needs to bring an order from the restaurant to the consumer.
 */
public class TravelTimeEstimator {

  static final long SAME_ZIP_MINUTES = 15;
  static final long SAME_CITY_MINUTES = 25;
  static final long OTHER_MINUTES = 45;

  public long estimateMinutes(Address from, Address to) {
    if (sameText(from.getZip(), to.getZip())) {
      return SAME_ZIP_MINUTES;
    }
    if (sameText(from.getCity(), to.getCity())) {
      return SAME_CITY_MINUTES;
    }
    return OTHER_MINUTES;
  }

  private static boolean sameText(String first, String second) {
    return first != null && second != null && first.trim().equalsIgnoreCase(second.trim());
  }
}
