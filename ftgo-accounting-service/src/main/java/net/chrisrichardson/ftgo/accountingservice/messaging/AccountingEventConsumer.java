package net.chrisrichardson.ftgo.accountingservice.messaging;

import io.eventuate.tram.events.subscriber.DomainEventEnvelope;
import io.eventuate.tram.events.subscriber.DomainEventHandlers;
import io.eventuate.tram.events.subscriber.DomainEventHandlersBuilder;
import net.chrisrichardson.ftgo.accountingservice.domain.AccountingService;
import net.chrisrichardson.ftgo.consumerservice.domain.ConsumerCreated;
import org.springframework.beans.factory.annotation.Autowired;


public class AccountingEventConsumer {

  private static final org.slf4j.Logger auditLog = org.slf4j.LoggerFactory.getLogger("audit");

  @Autowired
  private AccountingService accountingService;

  public DomainEventHandlers domainEventHandlers() {
    auditLog.info("domainEventHandlers called");
    return DomainEventHandlersBuilder
            .forAggregateType("net.chrisrichardson.ftgo.consumerservice.domain.Consumer")
            .onEvent(ConsumerCreated.class, this::createAccount) // TODO this is hack to get the correct package
            .build();
  }

  private void createAccount(DomainEventEnvelope<ConsumerCreated> dee) {
    accountingService.create(dee.getAggregateId());
  }


}
