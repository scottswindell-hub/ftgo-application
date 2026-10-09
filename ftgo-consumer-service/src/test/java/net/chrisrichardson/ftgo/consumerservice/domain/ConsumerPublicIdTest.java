package net.chrisrichardson.ftgo.consumerservice.domain;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertNotSame;
import static org.junit.Assert.assertTrue;

public class ConsumerPublicIdTest {

  @Test
  public void shouldZeroPadToFixedWidth() {
    assertEquals("0000000001", ConsumerPublicId.of(1).value());
    assertEquals("0000000042", ConsumerPublicId.of(42).value());
    assertEquals("0000012345", ConsumerPublicId.of(12345).value());
  }

  @Test
  public void shouldAcceptZeroAndTheLargestRepresentableId() {
    assertEquals("0000000000", ConsumerPublicId.of(0).value());
    assertEquals("9999999999", ConsumerPublicId.of(9999999999L).value());
  }

  @Test(expected = IllegalArgumentException.class)
  public void shouldRejectNegativeIds() {
    ConsumerPublicId.of(-1);
  }

  @Test(expected = IllegalArgumentException.class)
  public void shouldRejectIdsWiderThanTheFormat() {
    ConsumerPublicId.of(10000000000L);
  }

  @Test
  public void shouldRoundTripThroughParse() {
    for (long id : new long[]{0, 1, 9, 10, 99, 100, 123456789, 9999999999L}) {
      ConsumerPublicId publicId = ConsumerPublicId.of(id);
      assertEquals(publicId, ConsumerPublicId.parse(publicId.value()));
      assertEquals(id, ConsumerPublicId.parse(publicId.value()).toLong());
    }
  }

  @Test(expected = IllegalArgumentException.class)
  public void shouldRejectUnpaddedText() {
    ConsumerPublicId.parse("42");
  }

  @Test(expected = IllegalArgumentException.class)
  public void shouldRejectNonNumericText() {
    ConsumerPublicId.parse("00000000ab");
  }

  @Test(expected = IllegalArgumentException.class)
  public void shouldRejectNull() {
    ConsumerPublicId.parse(null);
  }

  @Test
  public void shouldValidateFormat() {
    assertTrue(ConsumerPublicId.isValid("0000000042"));
    assertFalse(ConsumerPublicId.isValid("42"));
    assertFalse(ConsumerPublicId.isValid("00000000042"));
    assertFalse(ConsumerPublicId.isValid(""));
    assertFalse(ConsumerPublicId.isValid(null));
  }

  @Test
  public void shouldCompareByValue() {
    ConsumerPublicId fromNumber = ConsumerPublicId.of(7);
    ConsumerPublicId fromText = ConsumerPublicId.parse("0000000007");

    assertNotSame(fromNumber, fromText);
    assertEquals(fromNumber, fromText);
    assertEquals(fromText, fromNumber);
    assertNotEquals(fromNumber, ConsumerPublicId.parse("0000000008"));
    assertNotEquals(fromNumber, null);
  }

  @Test
  public void shouldHashEqualValuesAlike() {
    assertEquals(ConsumerPublicId.of(7).hashCode(), ConsumerPublicId.parse("0000000007").hashCode());
  }

  @Test
  public void shouldPrintItsValue() {
    assertEquals("0000000007", ConsumerPublicId.of(7).toString());
  }

  @Test
  public void shouldSortLikeTheNumericIds() {
    assertTrue(ConsumerPublicId.of(9).value().compareTo(ConsumerPublicId.of(10).value()) < 0);
    assertTrue(ConsumerPublicId.of(99).value().compareTo(ConsumerPublicId.of(100).value()) < 0);
  }
}
