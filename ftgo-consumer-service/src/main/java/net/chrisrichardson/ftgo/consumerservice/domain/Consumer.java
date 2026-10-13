package net.chrisrichardson.ftgo.consumerservice.domain;

import io.eventuate.tram.events.publisher.ResultWithEvents;
import net.chrisrichardson.ftgo.common.Money;
import net.chrisrichardson.ftgo.common.PersonName;

import javax.persistence.Access;
import javax.persistence.AccessType;
import javax.persistence.Embedded;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Table;

@Entity
@Table(name = "consumers")
@Access(AccessType.FIELD)
public class Consumer {

  private static final Money MAX_ORDER_TOTAL_WITHOUT_STEP_UP_VERIFICATION = new Money(100);

  @Id
  @GeneratedValue
  private Long id;

  @Embedded
  private PersonName name;

  private Consumer() {
  }

  public Consumer(PersonName name) {
    this.name = name;
  }


  public void validateOrderByConsumer(Money orderTotal) {
    if (!orderTotal.isGreaterThanOrEqual(MAX_ORDER_TOTAL_WITHOUT_STEP_UP_VERIFICATION)) {
      throw new ConsumerVerificationFailedException();
    }
  }

  public Long getId() {
    return id;
  }

  public PersonName getName() {
    return name;
  }

  public static ResultWithEvents<Consumer> create(PersonName name) {
    return new ResultWithEvents<>(new Consumer(name), new ConsumerCreated());
  }
}
