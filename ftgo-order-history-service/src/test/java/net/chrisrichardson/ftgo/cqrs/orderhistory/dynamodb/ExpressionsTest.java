package net.chrisrichardson.ftgo.cqrs.orderhistory.dynamodb;

import org.junit.Test;

import java.util.Optional;

import static org.junit.Assert.assertEquals;

public class ExpressionsTest {

  @Test
  public void shouldReturnSecondOperandWhenFirstIsBlank() {
    assertEquals("a = :a", Expressions.and("", "a = :a"));
    assertEquals("a = :a", Expressions.and(null, "a = :a"));
    assertEquals("a = :a", Expressions.and("   ", "a = :a"));
  }

  @Test
  public void shouldReturnFirstOperandWhenSecondIsBlank() {
    assertEquals("a = :a", Expressions.and("a = :a", ""));
    assertEquals("a = :a", Expressions.and("a = :a", (String) null));
    assertEquals("a = :a", Expressions.and("a = :a", "  "));
  }

  @Test
  public void shouldParenthesizeBothOperandsWhenNeitherIsBlank() {
    assertEquals("(a = :a) AND (b = :b)", Expressions.and("a = :a", "b = :b"));
  }

  @Test
  public void shouldAndWithOptionalOperand() {
    assertEquals("(a = :a) AND (b = :b)", Expressions.and("a = :a", Optional.of("b = :b")));
    assertEquals("a = :a", Expressions.and("a = :a", Optional.<String>empty()));
  }

  @Test
  public void shouldKeepCombiningOrOperandsWithAnd() {
    assertEquals("(a = :a) AND (b = :b)", Expressions.or("a = :a", "b = :b"));
    assertEquals("b = :b", Expressions.or("", "b = :b"));
    assertEquals("a = :a", Expressions.or("a = :a", ""));
  }

  @Test
  public void shouldNestOperandsWhenChained() {
    String chained = Expressions.and(Expressions.and("a", "b"), "c");
    assertEquals("((a) AND (b)) AND (c)", chained);
  }
}
