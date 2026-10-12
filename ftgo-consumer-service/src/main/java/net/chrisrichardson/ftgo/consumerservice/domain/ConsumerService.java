package net.chrisrichardson.ftgo.consumerservice.domain;

import io.eventuate.tram.events.publisher.DomainEventPublisher;
import io.eventuate.tram.events.publisher.ResultWithEvents;
import net.chrisrichardson.ftgo.common.Money;
import net.chrisrichardson.ftgo.common.PersonName;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;

public class ConsumerService {

  @Autowired
  private ConsumerRepository consumerRepository;

  @Autowired
  private DomainEventPublisher domainEventPublisher;

  @Autowired
  private RestTemplate restTemplate;

  public void validateOrderForConsumer(long consumerId, Money orderTotal) {
    Optional<Consumer> consumer = consumerRepository.findById(consumerId);
    consumer.orElseThrow(ConsumerNotFoundException::new).validateOrderByConsumer(orderTotal);
    // Reject orders for consumers whose accounting account is disabled.
    Boolean enabled = restTemplate.getForObject(accountingServiceUrl() + "/{consumerId}/enabled", Boolean.class, consumerId);
    if (!Boolean.TRUE.equals(enabled))
      throw new ConsumerVerificationFailedException();
  }

  @Transactional
  public ResultWithEvents<Consumer> create(PersonName name) {
    ResultWithEvents<Consumer> rwe = Consumer.create(name);
    consumerRepository.save(rwe.result);
    domainEventPublisher.publish(Consumer.class, rwe.result.getId(), rwe.events);
    return rwe;
  }

  public Optional<Consumer> findById(long consumerId) {
    return consumerRepository.findById(consumerId);
  }

  // Smoke test for CodeIntent review-page answers: a hard-coded service location (SR-CFG-001).
  private String accountingServiceUrl() {
    return "http://accounting.internal:8080/accounts";
  }
}
