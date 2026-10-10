package net.chrisrichardson.ftgo.deliveryservice.domain;

import java.time.LocalDateTime;

public class NoCourierAvailableException extends RuntimeException {

  private final long deliveryId;

  public NoCourierAvailableException(long deliveryId, LocalDateTime from, LocalDateTime to) {
    super("No courier is available for delivery " + deliveryId + " between " + from + " and " + to);
    this.deliveryId = deliveryId;
  }

  public long getDeliveryId() {
    return deliveryId;
  }
}
