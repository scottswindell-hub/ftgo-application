package net.chrisrichardson.ftgo.orderservice.api.events;

import net.chrisrichardson.ftgo.common.Money;
import org.apache.commons.lang.builder.EqualsBuilder;
import org.apache.commons.lang.builder.HashCodeBuilder;
import org.apache.commons.lang.builder.ToStringBuilder;

import java.util.List;

/**
 * The details of a placed order, as published in {@link OrderCreatedEvent} and used by the
 * Create Order saga. {@code orderTotal} is the amount the consumer is charged: the line items
 * plus the tip.
 */
public class OrderDetails {

  private List<OrderLineItem> lineItems;
  private Money orderTotal;
  private Money tip = Money.ZERO;

  private long restaurantId;
  private long consumerId;

  private OrderDetails() {
  }

  public Money getOrderTotal() {
    return orderTotal;
  }

  public void setOrderTotal(Money orderTotal) {
    this.orderTotal = orderTotal;
  }

  public OrderDetails(long consumerId, long restaurantId, List<OrderLineItem> lineItems, Money orderTotal) {
    this(consumerId, restaurantId, lineItems, orderTotal, Money.ZERO);
  }

  /**
   * @param orderTotal the amount charged, including {@code tip}
   * @param tip        the consumer's tip for the courier; {@link Money#ZERO} when none
   */
  public OrderDetails(long consumerId, long restaurantId, List<OrderLineItem> lineItems, Money orderTotal, Money tip) {
    this.consumerId = consumerId;
    this.restaurantId = restaurantId;
    this.lineItems = lineItems;
    this.orderTotal = orderTotal;
    this.tip = tip;
  }

  public Money getTip() {
    return tip;
  }

  public void setTip(Money tip) {
    this.tip = tip;
  }

  @Override
  public String toString() {
    return ToStringBuilder.reflectionToString(this);
  }

  public List<OrderLineItem> getLineItems() {
    return lineItems;
  }

  public long getRestaurantId() {
    return restaurantId;
  }

  public long getConsumerId() {
    return consumerId;
  }


  public void setLineItems(List<OrderLineItem> lineItems) {
    this.lineItems = lineItems;
  }


  public void setRestaurantId(long restaurantId) {
    this.restaurantId = restaurantId;
  }

  public void setConsumerId(long consumerId) {
    this.consumerId = consumerId;
  }

  @Override
  public boolean equals(Object o) {
    return EqualsBuilder.reflectionEquals(this, o);
  }

  @Override
  public int hashCode() {
    return HashCodeBuilder.reflectionHashCode(this);
  }


}
