package net.chrisrichardson.ftgo.loyaltyservice.domain;

import java.util.HashMap;
import java.util.Map;

public class LoyaltyService {

  private final Map<Long, Long> points = new HashMap<>();

  public long award(long consumerId, long orderTotalCents) {
    long earned = orderTotalCents / 100;
    points.merge(consumerId, earned, Long::sum);
    return points.get(consumerId);
  }
}
