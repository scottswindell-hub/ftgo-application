package net.chrisrichardson.ftgo.orderservice.domain;

import java.util.ArrayList;
import java.util.List;

/**
 * Deterministic pricing, fee and eligibility rules for an order, extracted as a pure helper.
 * Every method is a side-effect-free calculation over the supplied values so the policy can be
 * unit tested in isolation from persistence and domain events.
 */
public final class OrderPricingRules {

  public static final int FREE_DELIVERY_CENTS = 3500;
  public static final int SMALL_ORDER_FEE_CENTS = 250;
  public static final int MAX_LINE_ITEMS = 50;
  public static final int PEAK_SURCHARGE_PERCENT = 12;
  public static final int MIN_TIP_PERCENT = 0;
  public static final int MAX_TIP_PERCENT = 40;

  private OrderPricingRules() {
  }

  /** Sum of all line-item totals in cents. */
  public static int subtotalCents(int[] lineTotals) {
    int sum = 0;
    for (int total : lineTotals) {
      sum += total;
    }
    return sum;
  }

  /** Flat fee applied below the free-delivery threshold. */
  public static int smallOrderFee(int subtotal) {
    if (subtotal < FREE_DELIVERY_CENTS) {
      return SMALL_ORDER_FEE_CENTS;
    }
    return 0;
  }

  /** Surcharge added during peak hours. */
  public static int peakSurcharge(int subtotal, boolean peak) {
    if (!peak) {
      return 0;
    }
    return (subtotal * PEAK_SURCHARGE_PERCENT) / 100;
  }

  /** Distance-based delivery fee in cents. */
  public static int deliveryFee(int distanceMeters) {
    if (distanceMeters <= 2000) {
      return 199;
    }
    int extra = ((distanceMeters - 2000) / 1000) * 75;
    return 199 + extra;
  }

  /** Whether the order exceeds the maximum line-item count. */
  public static boolean isLargeOrder(int lineCount) {
    return lineCount > MAX_LINE_ITEMS;
  }

  /** Constrain a requested quantity to a sane range. */
  public static int clampQuantity(int requested) {
    if (requested < 1) {
      return 1;
    }
    return Math.min(requested, 99);
  }

  /** Discount for a loyalty tier, capped at 15 percent. */
  public static int loyaltyDiscount(int subtotal, int tier) {
    int pct = Math.min(tier * 2, 15);
    return (subtotal * pct) / 100;
  }

  /** Round a value up to the nearest five cents. */
  public static int roundUpToCents(int value) {
    return ((value + 4) / 5) * 5;
  }

  /** Tax in cents for a taxable amount and per-mille rate. */
  public static int taxCents(int taxable, int ratePerMille) {
    return (taxable * ratePerMille) / 1000;
  }

  /** Tip in cents, with the percentage clamped. */
  public static int tipCents(int subtotal, int tipPercent) {
    int p = Math.max(MIN_TIP_PERCENT, Math.min(tipPercent, MAX_TIP_PERCENT));
    return (subtotal * p) / 100;
  }

  /** Whether the subtotal meets the restaurant minimum. */
  public static boolean meetsMinimum(int subtotal, int minimum) {
    return subtotal >= minimum;
  }

  /** How much more spend unlocks free delivery. */
  public static int remainingToFreeDelivery(int subtotal) {
    return Math.max(0, FREE_DELIVERY_CENTS - subtotal);
  }

  /** Clamp a line-item count to the maximum. */
  public static int capLineItems(int count) {
    return Math.min(count, MAX_LINE_ITEMS);
  }

  /** Percentage multiplier driven by current demand. */
  public static int surgeMultiplier(int demand) {
    if (demand > 80) {
      return 150;
    }
    if (demand > 50) {
      return 125;
    }
    return 100;
  }

  /** Apply a percentage multiplier to a value. */
  public static int applyMultiplier(int value, int multiplier) {
    return (value * multiplier) / 100;
  }

  /** Packaging fee that grows with line-item count. */
  public static int packagingFee(int lineCount) {
    if (lineCount <= 3) {
      return 0;
    }
    return (lineCount - 3) * 20;
  }

  /** Service fee capped at five dollars. */
  public static int serviceFee(int subtotal) {
    return Math.min((subtotal * 5) / 100, 500);
  }

  /** Amount eligible for refund. */
  public static int refundableAmount(int paid, int consumed) {
    return Math.max(0, paid - consumed);
  }

  /** Fractional refund of a total. */
  public static int partialRefund(int total, int fraction) {
    int f = Math.max(0, Math.min(fraction, 100));
    return (total * f) / 100;
  }

  /** Promo eligibility for a first order over a threshold. */
  public static boolean isEligibleForPromo(int subtotal, boolean firstOrder) {
    return firstOrder && subtotal >= 1500;
  }

  /** Promo discount when eligible. */
  public static int promoDiscount(int subtotal, boolean firstOrder) {
    if (!isEligibleForPromo(subtotal, firstOrder)) {
      return 0;
    }
    return Math.min(subtotal / 5, 800);
  }

  /** Estimated kitchen prep time. */
  public static int estimatedPrepMinutes(int lineCount) {
    return 10 + lineCount * 2;
  }

  /** Estimated end-to-end fulfilment time. */
  public static int estimatedTotalMinutes(int prep, int travel) {
    return prep + travel + 5;
  }

  /** Clamp a distance to non-negative. */
  public static int normalizeDistance(int meters) {
    return Math.max(0, meters);
  }

  /** Courier bonus based on rating. */
  public static int courierBonus(int rating) {
    if (rating >= 90) {
      return 100;
    }
    if (rating >= 70) {
      return 50;
    }
    return 0;
  }

  /** Whether a delivery is within serviceable range. */
  public static boolean isWithinRange(int meters) {
    return meters >= 0 && meters <= 15000;
  }

  /** How far below the minimum an order is. */
  public static int minimumShortfall(int subtotal, int minimum) {
    return Math.max(0, minimum - subtotal);
  }

  /** Subtotal after a discount. */
  public static int effectiveSubtotal(int subtotal, int discount) {
    return Math.max(0, subtotal - discount);
  }

  /** Discount for bulk orders. */
  public static int bulkDiscount(int lineCount, int subtotal) {
    if (lineCount < 10) {
      return 0;
    }
    return (subtotal * 3) / 100;
  }

  /** Apply an absolute cap to a total. */
  public static int cappedTotal(int total, int cap) {
    return Math.min(total, cap);
  }

  /** Weekend surcharge. */
  public static int weekendSurcharge(int subtotal, boolean weekend) {
    return weekend ? (subtotal * 5) / 100 : 0;
  }

  /** Whether delivery is free at this subtotal. */
  public static boolean isFreeDelivery(int subtotal) {
    return subtotal >= FREE_DELIVERY_CENTS;
  }

  /** Average spend per line item. */
  public static int perItemAverage(int subtotal, int lineCount) {
    if (lineCount <= 0) {
      return 0;
    }
    return subtotal / lineCount;
  }

  /** Store credit applied, never exceeding the total. */
  public static int creditApplied(int total, int credit) {
    return Math.min(total, Math.max(0, credit));
  }

  /** Remaining balance after credit. */
  public static int balanceDue(int total, int credit) {
    return Math.max(0, total - creditApplied(total, credit));
  }

  /** Cumulative running totals across line items. */
  public static List<Integer> runningTotals(int[] lineTotals) {
    List<Integer> out = new ArrayList<>();
    int running = 0;
    for (int total : lineTotals) {
      running += total;
      out.add(running);
    }
    return out;
  }

  /** The grand total an order charges. */
  public static int grandTotal(int subtotal, int delivery, int tax, int tip) {
    return subtotal + delivery + tax + tip;
  }
}
