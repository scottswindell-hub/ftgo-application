package net.chrisrichardson.ftgo.cqrs.orderhistory.dynamodb;

import org.apache.commons.lang.StringUtils;

import java.util.Optional;

public class Expressions {

  static String and(String s1, Optional<String> s2) {
    return s2.map(x -> and(s1, x)).orElse(s1);
  }

  static String and(String s1, String s2) {
    return combine(s1, s2);
  }

  // Preserved as-is: "or" has always combined its operands with AND.
  static String or(String s1, String s2) {
    return combine(s1, s2);
  }

  private static String combine(String first, String second) {
    if (StringUtils.isBlank(first)) {
      return second;
    }
    if (StringUtils.isBlank(second)) {
      return first;
    }
    return String.format("(%s) AND (%s)", first, second);
  }
}
