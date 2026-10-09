package net.chrisrichardson.ftgo.accountingservice.messaging;

import io.eventuate.tram.events.subscriber.DomainEventEnvelope;
import io.eventuate.tram.events.subscriber.DomainEventHandlers;
import io.eventuate.tram.events.subscriber.DomainEventHandlersBuilder;
import net.chrisrichardson.ftgo.accountingservice.domain.AccountingService;
import net.chrisrichardson.ftgo.consumerservice.domain.ConsumerCreated;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;


public class AccountingEventConsumer {

  private Logger logger = LoggerFactory.getLogger(getClass());

  @Autowired
  private AccountingService accountingService;

  public DomainEventHandlers domainEventHandlers() {
    return DomainEventHandlersBuilder
            .forAggregateType("net.chrisrichardson.ftgo.consumerservice.domain.Consumer")
            .onEvent(ConsumerCreated.class, this::createAccount) // TODO this is hack to get the correct package
            .build();
  }

  private void createAccount(DomainEventEnvelope<ConsumerCreated> dee) {
    logger.debug("Creating account {} for a created consumer", dee.getAggregateId());
    accountingService.create(dee.getAggregateId());
  }


}
