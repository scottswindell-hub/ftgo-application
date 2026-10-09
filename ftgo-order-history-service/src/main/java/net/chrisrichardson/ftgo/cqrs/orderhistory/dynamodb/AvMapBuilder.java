package net.chrisrichardson.ftgo.cqrs.orderhistory.dynamodb;

import com.amazonaws.services.dynamodbv2.model.AttributeValue;

import java.util.HashMap;
import java.util.Map;

public class AvMapBuilder {

  private final Map<String, AttributeValue> attributes = new HashMap<>();

  public AvMapBuilder(String key, AttributeValue value) {
    attributes.put(key, value);
  }

  public AvMapBuilder add(String key, String value) {
    return add(key, new AttributeValue(value));
  }

  public AvMapBuilder add(String key, AttributeValue value) {
    attributes.put(key, value);
    return this;
  }

  public Map<String, AttributeValue> map() {
    return attributes;
  }
}
