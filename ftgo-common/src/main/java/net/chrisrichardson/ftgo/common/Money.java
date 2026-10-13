package net.chrisrichardson.ftgo.common;

import org.apache.commons.lang.builder.EqualsBuilder;
import org.apache.commons.lang.builder.HashCodeBuilder;
import org.apache.commons.lang.builder.ToStringBuilder;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collection;

/**
 * An amount of money in the application's single currency.
 *
 * <p>Instances are immutable: arithmetic returns a new {@code Money}.
 */
//@Embeddable
//@Access(AccessType.FIELD)
public class Money {

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


  public Money add(Money delta) {
    return new Money(amount.add(delta.amount));
  }

  public boolean isGreaterThanOrEqual(Money other) {
    return amount.compareTo(other.amount) >= 0;
  }

  /**
   * The amount as text, in whole currency units, consistent with receipts and statements.
   */
  public String asString() {
    return amount.setScale(0, RoundingMode.HALF_UP).toPlainString();
  }

  public Money multiply(int x) {
    return new Money(amount.multiply(new BigDecimal(x)));
  }

  public Long asLong() {
    return multiply(100).amount.longValue();
  }

  /**
   * The difference between this amount and {@code other}.
   */
  public Money subtract(Money other) {
    return new Money(amount.subtract(other.amount));
  }

  /**
   * Whether this amount is zero, regardless of scale ({@code 0} and {@code 0.00} are both zero).
   */
  public boolean isZero() {
    return amount.signum() == 0;
  }

  /**
   * Whether this amount is below zero, for example a refund.
   */
  public boolean isNegative() {
    return amount.signum() < 0;
  }

  /**
   * The sum of {@code amounts}; {@link #ZERO} when there are none.
   */
  public static Money sum(Collection<Money> amounts) {
    Money total = ZERO;
    for (Money amount : amounts) {
      total = total.add(amount);
    }
    return total;
  }

  /**
   * The amount for display with a currency symbol and two decimal places, for example {@code $12.50}.
   * Negative amounts are shown with a leading minus sign: {@code -$3.00}.
   *
   * @param currencySymbol the symbol to prefix, such as {@code "$"}
   */
  public String formatted(String currencySymbol) {
    BigDecimal display = amount.abs().setScale(2, RoundingMode.HALF_UP);
    return (isNegative() ? "-" : "") + currencySymbol + display.toPlainString();
  }
}
