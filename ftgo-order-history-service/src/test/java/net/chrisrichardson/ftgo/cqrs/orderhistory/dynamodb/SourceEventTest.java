package net.chrisrichardson.ftgo.cqrs.orderhistory.dynamodb;

import com.amazonaws.services.dynamodbv2.document.spec.UpdateItemSpec;
import org.junit.Test;

import java.util.Collections;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

public class SourceEventTest {

  private static final String AGGREGATE_TYPE = "net.chrisrichardson.ftgo.orderservice.domain.Order";

  private final SourceEvent sourceEvent = new SourceEvent(AGGREGATE_TYPE, "42", "event-1");

  private UpdateItemSpec baseSpec() {
    return new UpdateItemSpec()
            .withUpdateExpression("SET #orderStatus = :orderStatus")
            .withNameMap(Collections.singletonMap("#orderStatus", "orderStatus"))
            .withValueMap(Collections.singletonMap(":orderStatus", "APPROVED"));
  }

  @Test
  public void shouldAppendDuplicateDetectionToUpdateExpression() {
    UpdateItemSpec spec = sourceEvent.addDuplicateDetection(baseSpec());
    assertEquals("SET #orderStatus = :orderStatus , #duplicateDetection = :eventId", spec.getUpdateExpression());
  }

  @Test
  public void shouldKeepExistingNamesAndValues() {
    UpdateItemSpec spec = sourceEvent.addDuplicateDetection(baseSpec());
    assertEquals("orderStatus", spec.getNameMap().get("#orderStatus"));
    assertEquals("APPROVED", spec.getValueMap().get(":orderStatus"));
  }

  @Test
  public void shouldRecordEventByAggregateTypeAndId() {
    UpdateItemSpec spec = sourceEvent.addDuplicateDetection(baseSpec());
    assertEquals("events." + AGGREGATE_TYPE + "42", spec.getNameMap().get("#duplicateDetection"));
    assertEquals("event-1", spec.getValueMap().get(":eventId"));
  }

  @Test
  public void shouldCreateNameMapWhenSpecHasNone() {
    UpdateItemSpec spec = new UpdateItemSpec()
            .withUpdateExpression("SET x = :x")
            .withValueMap(Collections.singletonMap(":x", 1));
    UpdateItemSpec result = sourceEvent.addDuplicateDetection(spec);
    assertEquals(1, result.getNameMap().size());
    assertTrue(result.getNameMap().containsKey("#duplicateDetection"));
  }

  @Test
  public void shouldOnlyWriteWhenEventIsNew() {
    UpdateItemSpec spec = sourceEvent.addDuplicateDetection(baseSpec());
    assertEquals("attribute_not_exists(#duplicateDetection) OR #duplicateDetection < :eventId",
            spec.getConditionExpression());
  }

  @Test
  public void shouldAndWithAnExistingCondition() {
    UpdateItemSpec spec = sourceEvent.addDuplicateDetection(baseSpec().withConditionExpression("attribute_exists(orderId)"));
    assertEquals("(attribute_exists(orderId)) AND (attribute_not_exists(#duplicateDetection) OR #duplicateDetection < :eventId)",
            spec.getConditionExpression());
  }
}
