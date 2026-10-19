package net.chrisrichardson.ftgo.cqrs.orderhistory.dynamodb;

import com.amazonaws.services.dynamodbv2.document.PrimaryKey;
import com.amazonaws.services.dynamodbv2.model.AttributeValue;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import net.chrisrichardson.ftgo.orderservice.api.events.OrderState;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Paging tokens and filter expressions for order-history queries.
 */
final class OrderHistoryQueries {

  private OrderHistoryQueries() {
  }

  static PrimaryKey toStartingPrimaryKey(String token) {
    ObjectMapper om = new ObjectMapper();
    Map<String, Object> map;
    try {
      map = om.readValue(token, Map.class);
    } catch (IOException e) {
      throw new RuntimeException();
    }
    PrimaryKey pk = new PrimaryKey();
    map.entrySet().forEach(key -> {
      pk.addComponent(key.getKey(), key.getValue());
    });
    return pk;
  }

  static String toStartKeyToken(Map<String, AttributeValue> lastEvaluatedKey) {
    Map<String, Object> map = new HashMap<>();
    lastEvaluatedKey.entrySet().forEach(entry -> {
      String value = entry.getValue().getS();
      if (value == null) {
        value = entry.getValue().getN();
        map.put(entry.getKey(), Long.parseLong(value));
      } else {
        map.put(entry.getKey(), value);
      }
    });
    ObjectMapper om = new ObjectMapper();
    try {
      return om.writeValueAsString(map);
    } catch (JsonProcessingException e) {
      throw new RuntimeException();
    }
  }

  static Optional<String> statusFilterExpression(Map<String, Object>
                                                          expressionAttributeValuesBuilder, Optional<OrderState> status) {
    return status.map(s -> {
      expressionAttributeValuesBuilder.put(":orderStatus", s.toString());
      return "orderStatus = :orderStatus";
    });
  }

  static String keywordFilterExpression(Map<String, Object>
                                                 expressionAttributeValuesBuilder, Set<String> kw) {
    Set<String> keywords = OrderHistoryItemMapper.tokenize(kw);
    if (keywords.isEmpty()) {
      return "";
    }
    String cuisinesExpression = "";
    int idx = 0;
    for (String cuisine : keywords) {
      String var = ":keyword" + idx;
      String cuisineExpression = String.format("contains(keywords, %s)", var);
      cuisinesExpression = Expressions.or(cuisinesExpression, cuisineExpression);
      expressionAttributeValuesBuilder.put(var, cuisine);
    }

    return cuisinesExpression;
  }
}
