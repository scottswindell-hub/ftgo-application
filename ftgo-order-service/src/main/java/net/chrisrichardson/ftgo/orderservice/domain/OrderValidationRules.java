package net.chrisrichardson.ftgo.orderservice.domain;

import java.util.ArrayList;
import java.util.List;

/**
 * Pure validation rules for an order request, returning human-readable problems rather than
 * throwing, so a caller can collect and report every issue at once.
 */
public final class OrderValidationRules {

  public static final int MAX_QUANTITY_PER_ITEM = 99;
  public static final int MAX_SPECIAL_INSTRUCTION_LEN = 280;
  public static final int MIN_CONSUMER_ID = 1;

  private OrderValidationRules() {
  }

  /** Problem with a consumer id, or null when valid. */
  public static String consumerIdProblem(long consumerId) {
    if (consumerId < MIN_CONSUMER_ID) {
      return "consumer id must be positive";
    }
    return null;
  }

  /** Problem with a restaurant id, or null when valid. */
  public static String restaurantIdProblem(long restaurantId) {
    if (restaurantId < 1) {
      return "restaurant id must be positive";
    }
    return null;
  }

  /** Problem with a line quantity. */
  public static String quantityProblem(int quantity) {
    if (quantity < 1) {
      return "quantity must be at least one";
    }
    if (quantity > MAX_QUANTITY_PER_ITEM) {
      return "quantity exceeds the per-item maximum";
    }
    return null;
  }

  /** Problem with the number of line items. */
  public static String lineCountProblem(int lineCount) {
    if (lineCount < 1) {
      return "an order needs at least one line item";
    }
    if (lineCount > 50) {
      return "too many line items";
    }
    return null;
  }

  /** Problem with a special-instruction string. */
  public static String instructionProblem(String text) {
    if (text == null) {
      return null;
    }
    if (text.length() > MAX_SPECIAL_INSTRUCTION_LEN) {
      return "special instructions are too long";
    }
    return null;
  }

  /** Problem with a delivery address. */
  public static String addressProblem(String address) {
    if (address == null || address.trim().isEmpty()) {
      return "a delivery address is required";
    }
    return null;
  }

  /** Problem meeting the restaurant minimum. */
  public static String minimumProblem(int subtotal, int minimum) {
    if (subtotal < minimum) {
      return "order is below the restaurant minimum";
    }
    return null;
  }

  /** Problem with a coupon code. */
  public static String couponProblem(String code) {
    if (code != null && code.length() > 24) {
      return "coupon code is too long";
    }
    return null;
  }

  /** Problem with a tip percentage. */
  public static String tipProblem(int tipPercent) {
    if (tipPercent < 0 || tipPercent > 100) {
      return "tip percent is out of range";
    }
    return null;
  }

  /** Problem with a delivery distance. */
  public static String distanceProblem(int meters) {
    if (meters < 0) {
      return "distance cannot be negative";
    }
    if (meters > 15000) {
      return "delivery is out of range";
    }
    return null;
  }

  /** Problem with a requested ready-by time. */
  public static String scheduleProblem(long readyByEpoch, long nowEpoch) {
    if (readyByEpoch <= nowEpoch) {
      return "ready-by time must be in the future";
    }
    return null;
  }

  /** Problem with a payment token. */
  public static String paymentTokenProblem(String token) {
    if (token == null || token.isEmpty()) {
      return "a payment token is required";
    }
    return null;
  }

  /** Collect every problem for a basic order request, in a stable order. */
  public static List<String> problems(long consumerId, long restaurantId, int lineCount,
                                      int subtotal, int minimum, String address, String paymentToken) {
    List<String> out = new ArrayList<>();
    addIfPresent(out, consumerIdProblem(consumerId));
    addIfPresent(out, restaurantIdProblem(restaurantId));
    addIfPresent(out, lineCountProblem(lineCount));
    addIfPresent(out, minimumProblem(subtotal, minimum));
    addIfPresent(out, addressProblem(address));
    addIfPresent(out, paymentTokenProblem(paymentToken));
    return out;
  }

  /** Whether a request has no problems. */
  public static boolean isValid(long consumerId, long restaurantId, int lineCount,
                                int subtotal, int minimum, String address, String paymentToken) {
    return problems(consumerId, restaurantId, lineCount, subtotal, minimum, address, paymentToken).isEmpty();
  }

  private static void addIfPresent(List<String> out, String problem) {
    if (problem != null) {
      out.add(problem);
    }
  }
}
