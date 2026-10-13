package net.chrisrichardson.ftgo.cqrs.orderhistory.web;

import net.chrisrichardson.ftgo.common.Money;
import net.chrisrichardson.ftgo.cqrs.orderhistory.dynamodb.Order;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderLineItem;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Formats a consumer-facing plain-text receipt for an order in the order history.
 *
 * <p>A receipt lists each line item with its quantity, unit price and line total,
 * followed by the order total. Amounts use {@link Money#formatted(String)} so every
 * figure on the receipt has the same currency symbol and two decimal places.
 *
 * <pre>
 * Ajanta (order 4321)
 *   2 x Chicken Vindaloo @ $12.34 = $24.68
 *   1 x Naan @ $3.00 = $3.00
 * Total: $27.68
 * </pre>
 */
public class ReceiptFormatter {

  static final String DEFAULT_CURRENCY_SYMBOL = "$";
  static final int MAX_NAME_LENGTH = 40;

  private final String currencySymbol;

  public ReceiptFormatter() {
    this(DEFAULT_CURRENCY_SYMBOL);
  }

  public ReceiptFormatter(String currencySymbol) {
    if (currencySymbol == null || currencySymbol.isEmpty()) {
      throw new IllegalArgumentException("currencySymbol must not be empty");
    }
    this.currencySymbol = currencySymbol;
  }

  /**
   * The full receipt for {@code order}, one line per entry, separated by newlines.
   */
  public String format(Order order) {
    return String.join("\n", lines(order));
  }

  /**
   * The receipt lines for {@code order}: a heading, one line per line item, and the total.
   */
  public List<String> lines(Order order) {
    List<String> lines = new ArrayList<>();
    lines.add(heading(order));
    lines.addAll(order.getLineItems().stream()
            .map(this::lineItem)
            .collect(Collectors.toList()));
    lines.add("Total: " + money(order.getOrderTotal()));
    return lines;
  }

  /**
   * The total of the line items as shown on the receipt. It matches the order
   * total unless the order has been revised since it was recorded.
   */
  public Money itemsTotal(Order order) {
    return Money.sum(order.getLineItems().stream()
            .map(OrderLineItem::getTotal)
            .collect(Collectors.toList()));
  }

  String heading(Order order) {
    return String.format("%s (order %s)", displayName(order.getRestaurantName()), order.getOrderId());
  }

  String lineItem(OrderLineItem item) {
    return String.format("  %d x %s @ %s = %s",
            item.getQuantity(),
            displayName(item.getName()),
            money(item.getPrice()),
            money(item.getTotal()));
  }

  String money(Money amount) {
    return amount == null ? currencySymbol + "0.00" : amount.formatted(currencySymbol);
  }

  /**
   * A name shortened to {@link #MAX_NAME_LENGTH} characters so receipt lines stay readable.
   */
  static String displayName(String name) {
    if (name == null || name.trim().isEmpty()) {
      return "(unnamed)";
    }
    String trimmed = name.trim();
    return trimmed.length() <= MAX_NAME_LENGTH
            ? trimmed
            : trimmed.substring(0, MAX_NAME_LENGTH - 1) + "…";
  }
}
