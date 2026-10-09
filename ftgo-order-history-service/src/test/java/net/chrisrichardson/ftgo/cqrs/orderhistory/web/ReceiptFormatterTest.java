package net.chrisrichardson.ftgo.cqrs.orderhistory.web;

import net.chrisrichardson.ftgo.common.Money;
import net.chrisrichardson.ftgo.cqrs.orderhistory.dynamodb.Order;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderLineItem;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderState;
import org.junit.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.Assert.assertEquals;

public class ReceiptFormatterTest {

  private final ReceiptFormatter formatter = new ReceiptFormatter();

  private Order order(Money total, OrderLineItem... items) {
    return new Order("4321", "99", OrderState.APPROVED, Arrays.asList(items), total, 1L, "Ajanta");
  }

  @Test
  public void shouldFormatHeadingLineItemsAndTotal() {
    Order order = order(new Money("27.68"),
            new OrderLineItem("1", "Chicken Vindaloo", new Money("12.34"), 2),
            new OrderLineItem("2", "Naan", new Money("3"), 1));

    assertEquals("Ajanta (order 4321)\n"
            + "  2 x Chicken Vindaloo @ $12.34 = $24.68\n"
            + "  1 x Naan @ $3.00 = $3.00\n"
            + "Total: $27.68", formatter.format(order));
  }

  @Test
  public void shouldUseTheConfiguredCurrencySymbol() {
    Order order = order(new Money("5"), new OrderLineItem("1", "Samosa", new Money("5"), 1));

    List<String> lines = new ReceiptFormatter("€").lines(order);

    assertEquals("  1 x Samosa @ €5.00 = €5.00", lines.get(1));
    assertEquals("Total: €5.00", lines.get(2));
  }

  @Test
  public void shouldFormatAnOrderWithoutLineItems() {
    Order order = order(Money.ZERO);

    assertEquals(Arrays.asList("Ajanta (order 4321)", "Total: $0.00"), formatter.lines(order));
  }

  @Test
  public void shouldShowAMissingTotalAsZero() {
    assertEquals("$0.00", formatter.money(null));
  }

  @Test
  public void shouldSumLineItemsForTheItemsTotal() {
    Order order = order(new Money("27.68"),
            new OrderLineItem("1", "Chicken Vindaloo", new Money("12.34"), 2),
            new OrderLineItem("2", "Naan", new Money("3"), 1));

    assertEquals(new Money("27.68"), formatter.itemsTotal(order));
  }

  @Test
  public void shouldShortenLongNames() {
    String name = "Extremely Long Restaurant Name That Keeps Going On";

    String shown = ReceiptFormatter.displayName(name);

    assertEquals(ReceiptFormatter.MAX_NAME_LENGTH, shown.length());
    assertEquals('…', shown.charAt(shown.length() - 1));
  }

  @Test
  public void shouldLabelBlankNames() {
    assertEquals("(unnamed)", ReceiptFormatter.displayName("  "));
    assertEquals("(unnamed)", ReceiptFormatter.displayName(null));
  }

  @Test(expected = IllegalArgumentException.class)
  public void shouldRejectAnEmptyCurrencySymbol() {
    new ReceiptFormatter("");
  }

  @Test
  public void shouldKeepTheOrderOfLineItems() {
    Order order = order(new Money("6"),
            new OrderLineItem("2", "Naan", new Money("3"), 1),
            new OrderLineItem("3", "Raita", new Money("3"), 1));

    List<String> lines = formatter.lines(order);

    assertEquals(Collections.singletonList("  1 x Naan @ $3.00 = $3.00"), lines.subList(1, 2));
    assertEquals("  1 x Raita @ $3.00 = $3.00", lines.get(2));
  }
}
