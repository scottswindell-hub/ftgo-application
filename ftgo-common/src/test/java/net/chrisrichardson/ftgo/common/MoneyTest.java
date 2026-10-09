package net.chrisrichardson.ftgo.common;


import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class MoneyTest {

  private final int M1_AMOUNT = 10;
  private final int M2_AMOUNT = 15;

  private Money m1 = new Money(M1_AMOUNT);
  private Money m2 = new Money(M2_AMOUNT);

  @Test
  public void shouldReturnAsString() {
    assertEquals(Integer.toString(M1_AMOUNT), new Money(M1_AMOUNT).asString());
  }

  @Test
  public void shouldCompare() {
    assertTrue(m2.isGreaterThanOrEqual(m2));
    assertTrue(m2.isGreaterThanOrEqual(m1));
    assertFalse(m1.isGreaterThanOrEqual(m2));
  }

  @Test
  public void shouldAdd() {
    assertEquals(new Money(M1_AMOUNT + M2_AMOUNT), m1.add(m2));
  }

  @Test
  public void shouldMultiply() {
    int multiplier = 12;
    assertEquals(new Money(M2_AMOUNT * multiplier), m2.multiply(multiplier));
  }

  @Test
  public void shouldSubtract() {
    assertEquals(new Money(M2_AMOUNT - M1_AMOUNT), m2.subtract(m1));
  }

  @Test
  public void shouldRecognizeZeroAtAnyScale() {
    assertTrue(new Money("0.00").isZero());
    assertTrue(Money.ZERO.isZero());
    assertFalse(m1.isZero());
  }

  @Test
  public void shouldRecognizeNegativeAmounts() {
    assertTrue(new Money("-1.50").isNegative());
    assertFalse(m1.isNegative());
    assertFalse(Money.ZERO.isNegative());
  }

  @Test
  public void shouldSumAmounts() {
    assertEquals(new Money(M1_AMOUNT + M2_AMOUNT), Money.sum(java.util.Arrays.asList(m1, m2)));
    assertEquals(Money.ZERO, Money.sum(java.util.Collections.emptyList()));
  }

  @Test
  public void shouldFormatWithCurrencySymbolAndTwoDecimals() {
    assertEquals("$12.50", new Money("12.5").formatted("$"));
    assertEquals("$10.00", m1.formatted("$"));
    assertEquals("$0.01", new Money("0.005").formatted("$"));
  }

  @Test
  public void shouldFormatNegativeAmountsWithLeadingMinus() {
    assertEquals("-$3.00", new Money("-3").formatted("$"));
  }
}
