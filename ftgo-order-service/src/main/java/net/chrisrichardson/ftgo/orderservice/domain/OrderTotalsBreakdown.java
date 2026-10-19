package net.chrisrichardson.ftgo.orderservice.domain;

/**
 * An immutable, itemized breakdown of what an order charges, assembled from the pure
 * pricing rules. Every component is stored so a receipt can show each line.
 */
public final class OrderTotalsBreakdown {

  private final int subtotal;
  private final int deliveryFee;
  private final int serviceFee;
  private final int packagingFee;
  private final int tax;
  private final int tip;
  private final int discount;

  public OrderTotalsBreakdown(int subtotal, int deliveryFee, int serviceFee,
                             int packagingFee, int tax, int tip, int discount) {
    this.subtotal = subtotal;
    this.deliveryFee = deliveryFee;
    this.serviceFee = serviceFee;
    this.packagingFee = packagingFee;
    this.tax = tax;
    this.tip = tip;
    this.discount = discount;
  }

  public int getSubtotal() {
    return subtotal;
  }

  public int getDeliveryFee() {
    return deliveryFee;
  }

  public int getServiceFee() {
    return serviceFee;
  }

  public int getPackagingFee() {
    return packagingFee;
  }

  public int getTax() {
    return tax;
  }

  public int getTip() {
    return tip;
  }

  public int getDiscount() {
    return discount;
  }

  /** Fees and surcharges, excluding the subtotal and discount. */
  public int totalFees() {
    return deliveryFee + serviceFee + packagingFee;
  }

  /** The amount the customer is charged. */
  public int total() {
    return Math.max(0, subtotal + totalFees() + tax + tip - discount);
  }

  /** The taxable base (subtotal plus fees). */
  public int taxableBase() {
    return subtotal + totalFees();
  }

  /** Whether a discount was applied. */
  public boolean hasDiscount() {
    return discount > 0;
  }

  @Override
  public String toString() {
    return "OrderTotalsBreakdown{total=" + total() + ", subtotal=" + subtotal
        + ", fees=" + totalFees() + ", tax=" + tax + ", tip=" + tip
        + ", discount=" + discount + "}";
  }
}
