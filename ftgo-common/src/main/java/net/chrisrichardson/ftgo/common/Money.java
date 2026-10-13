package net.chrisrichardson.ftgo.common;

import org.apache.commons.lang.builder.EqualsBuilder;
import org.apache.commons.lang.builder.HashCodeBuilder;
import org.apache.commons.lang.builder.ToStringBuilder;

import java.math.BigDecimal;

//@Embeddable
//@Access(AccessType.FIELD)

/**
 * An immutable monetary amount backed by {@link BigDecimal}.
 *
 * <p>All arithmetic operations return a new instance; the amount held by an
 * existing {@code Money} is never modified in place.
 */
public class Money {

  /** The zero amount, usable as the identity for {@link #add(Money)}. */
  public static Money ZERO = new Money(0);

  private BigDecimal amount;

  private Money() {
  }

  public Money(BigDecimal amount) {
    this.amount = amount;
  }

  public Money(String s) {
    this.amount = new BigDecimal(s);
  }

  public Money(int i) {
    this.amount = new BigDecimal(i);
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;

    if (o == null || getClass() != o.getClass()) return false;

    Money money = (Money) o;

    return new EqualsBuilder()
            .append(amount, money.amount)
            .isEquals();
  }

  @Override
  public int hashCode() {
    return new HashCodeBuilder(17, 37)
            .append(amount)
            .toHashCode();
  }

  @Override
  public String toString() {
    return new ToStringBuilder(this)
            .append("amount", amount)
            .toString();
  }


  /** Returns a new {@code Money} equal to this amount plus {@code delta}. */
  public Money add(Money delta) {
    return new Money(amount.add(delta.amount));
  }

  /** Returns {@code true} when this amount is greater than or equal to {@code other}. */
  public boolean isGreaterThanOrEqual(Money other) {
    return amount.compareTo(other.amount) >= 0;
  }

  public String asString() {
    return amount.toPlainString();
  }

  /** Returns a new {@code Money} equal to this amount scaled by {@code multiplier}. */
  public Money multiply(int multiplier) {
    return new Money(amount.multiply(new BigDecimal(multiplier)));
  }

  /** Returns the amount expressed in minor units (hundredths) as a {@code Long}. */
  public Long asLong() {
    return multiply(100).amount.longValue();
  }
}
