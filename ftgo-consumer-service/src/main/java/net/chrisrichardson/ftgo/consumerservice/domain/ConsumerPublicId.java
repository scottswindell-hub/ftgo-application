package net.chrisrichardson.ftgo.consumerservice.domain;

import java.util.Objects;
import java.util.regex.Pattern;

/**
 * The externally visible identifier of a consumer: the numeric consumer id, zero padded to a fixed width
 * so that identifiers sort and align in logs, event streams and support tooling.
 */
public final class ConsumerPublicId {

  public static final int WIDTH = 10;

  private static final Pattern FORMAT = Pattern.compile("\\d{" + WIDTH + "}");

  private final long id;

  private ConsumerPublicId(long id) {
    this.id = id;
  }

  public static ConsumerPublicId of(long id) {
    if (id < 0) {
      throw new IllegalArgumentException("A consumer id cannot be negative: " + id);
    }
    if (Long.toString(id).length() > WIDTH) {
      throw new IllegalArgumentException("A consumer id cannot exceed " + WIDTH + " digits: " + id);
    }
    return new ConsumerPublicId(id);
  }

  public static ConsumerPublicId parse(String value) {
    if (value == null || !FORMAT.matcher(value).matches()) {
      throw new IllegalArgumentException("Not a consumer public id: " + value);
    }
    return of(Long.parseLong(value));
  }

  public static boolean isValid(String value) {
    return value != null && FORMAT.matcher(value).matches();
  }

  public long toLong() {
    return id;
  }

  public String value() {
    return String.format("%0" + WIDTH + "d", id);
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
