package net.chrisrichardson.ftgo.deliveryservice.domain;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Chooses the courier who is free for the whole delivery window and has the least work planned.
 * Ties are broken by the lowest courier id so that the choice is repeatable.
 */
public class CourierSelector {

  public Optional<Courier> select(List<Courier> candidates, LocalDateTime from, LocalDateTime to) {
    return candidates.stream()
            .filter(courier -> courier.isFreeBetween(from, to))
            .min(Comparator.comparingInt(Courier::workload).thenComparingLong(Courier::getId));
  }
}
