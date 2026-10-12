package net.chrisrichardson.ftgo.orderservice.domain;

/**
 * Thrown when an order's tip is negative or larger than {@link Order#MAX_TIP_PERCENT}
 * percent of its line-item total.
 */
public class InvalidTipException extends RuntimeException {

  public InvalidTipException(String message) {
    super(message);
  }
}
