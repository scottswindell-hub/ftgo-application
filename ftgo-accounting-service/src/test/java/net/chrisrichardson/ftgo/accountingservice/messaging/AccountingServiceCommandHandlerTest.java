package net.chrisrichardson.ftgo.accountingservice.messaging;

import io.eventuate.javaclient.spring.jdbc.EmbeddedTestAggregateStoreConfiguration;
import io.eventuate.sync.AggregateRepository;
import io.eventuate.tram.commands.producer.CommandProducer;
import io.eventuate.tram.spring.commands.producer.TramCommandProducerConfiguration;
import io.eventuate.tram.events.publisher.DomainEventPublisher;
import io.eventuate.tram.spring.events.publisher.TramEventsPublisherConfiguration;
import io.eventuate.tram.sagas.common.SagaCommandHeaders;
import io.eventuate.tram.sagas.spring.inmemory.TramSagaInMemoryConfiguration;
import io.eventuate.tram.testutil.TestMessageConsumer;
import io.eventuate.tram.testutil.TestMessageConsumerFactory;
import io.eventuate.util.test.async.Eventually;
import net.chrisrichardson.ftgo.accountingservice.domain.Account;
import net.chrisrichardson.ftgo.accountingservice.domain.AccountCommand;
import net.chrisrichardson.ftgo.accountingservice.domain.AuthorizeCommandInternal;
import net.chrisrichardson.ftgo.accountservice.api.AccountingServiceChannels;
import net.chrisrichardson.ftgo.accountservice.api.AuthorizeCommand;
import net.chrisrichardson.ftgo.common.Money;
import net.chrisrichardson.ftgo.consumerservice.domain.ConsumerCreated;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.junit4.SpringRunner;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.junit.Assert.assertEquals;
import static org.mockito.Matchers.any;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.verify;

@RunWith(SpringRunner.class)
@SpringBootTest(classes = AccountingServiceCommandHandlerTest.AccountingServiceCommandHandlerTestConfiguration.class)
public class AccountingServiceCommandHandlerTest {

  @Configuration
  @EnableAutoConfiguration
  @Import({AccountingMessagingConfiguration.class,
          TramCommandProducerConfiguration.class,
          EmbeddedTestAggregateStoreConfiguration.class,
          TramEventsPublisherConfiguration.class, // TODO
          TramSagaInMemoryConfiguration.class})
  static public class AccountingServiceCommandHandlerTestConfiguration {
    @Bean
    public TestMessageConsumerFactory testMessageConsumerFactory() {
      return new TestMessageConsumerFactory();
    }

  }

  @Autowired
  private CommandProducer commandProducer;

  @Autowired
  private TestMessageConsumerFactory testMessageConsumerFactory;

  @Autowired
  private DomainEventPublisher domainEventPublisher;


  @SpyBean
  private AggregateRepository<Account, AccountCommand> accountRepository;

  @Test
  public void shouldReply() {

    TestMessageConsumer testMessageConsumer = testMessageConsumerFactory.make();

    long consumerId = System.currentTimeMillis();
    long orderId = 102L;

    domainEventPublisher.publish("net.chrisrichardson.ftgo.consumerservice.domain.Consumer", consumerId, Collections.singletonList(new ConsumerCreated()));

    Eventually.eventually(() -> {
      accountRepository.find(Long.toString(consumerId));
    });

    Money orderTotal = new Money(123);

    String messageId = commandProducer.send(AccountingServiceChannels.accountingServiceChannel, null,
            new AuthorizeCommand(consumerId, orderId, orderTotal),
            testMessageConsumer.getReplyChannel(), withSagaCommandHeaders());

    testMessageConsumer.assertHasReplyTo(messageId);

    ArgumentCaptor<AuthorizeCommandInternal> authorization = ArgumentCaptor.forClass(AuthorizeCommandInternal.class);
    verify(accountRepository).update(eq(Long.toString(consumerId)), authorization.capture(), any());
    assertEquals(Long.toString(consumerId), authorization.getValue().getConsumerId());
    assertEquals(Long.toString(orderId), authorization.getValue().getOrderId());
    assertEquals(orderTotal, authorization.getValue().getOrderTotal());

  }

  // TODO duplicate

  private Map<String, String> withSagaCommandHeaders() {
    Map<String, String> result = new HashMap<>();
    result.put(SagaCommandHeaders.SAGA_TYPE, "MySagaType");
    result.put(SagaCommandHeaders.SAGA_ID, "MySagaId");
    return result;
  }

}
