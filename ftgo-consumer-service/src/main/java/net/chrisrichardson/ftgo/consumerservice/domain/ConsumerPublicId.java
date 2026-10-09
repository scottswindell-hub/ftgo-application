package net.chrisrichardson.ftgo.consumerservice.domain;

import java.util.Objects;

/**
 * The externally visible identifier of a consumer: the numeric consumer id, zero padded to a fixed width
 * so that identifiers sort and align in logs, event streams and support tooling.
 */
public final class ConsumerPublicId {

  private final long id;

  private ConsumerPublicId(long id) {
    this.id = id;
  }

  public static ConsumerPublicId of(long id) {
    if (id < 0) {
      throw new IllegalArgumentException("A consumer id cannot be negative: " + id);
    }
    if (Long.toString(id).length() > width()) {
      throw new IllegalArgumentException("A consumer id cannot exceed " + width() + " digits: " + id);
    }
    return new ConsumerPublicId(id);
  }

  public static ConsumerPublicId parse(String value) {
    if (!isValid(value)) {
      throw new IllegalArgumentException("Not a consumer public id: " + value);
    }
    return of(Long.parseLong(value));
  }

  public static boolean isValid(String value) {
    return value != null && value.matches("\\d{" + width() + "}");
  }

  private static int width() {
    return 10;
  }

  public long toLong() {
    return id;
  }

  public String value() {
    return String.format("%0" + width() + "d", id);
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    return id == ((ConsumerPublicId) o).id;
  }

  @Override
  public int hashCode() {
    return Objects.hash(id);
  }

  @Override
  public String toString() {
    return value();
  }
}
