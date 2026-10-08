package net.chrisrichardson.ftgo.orderservice.domain;

public class EmptyOrderException extends RuntimeException {
  public EmptyOrderException() {
    super("An order must contain at least one line item");
  }
}
