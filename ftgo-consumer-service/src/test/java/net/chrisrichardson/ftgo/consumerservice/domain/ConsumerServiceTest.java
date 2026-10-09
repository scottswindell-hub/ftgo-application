package net.chrisrichardson.ftgo.consumerservice.domain;

import io.eventuate.tram.events.common.DomainEvent;
import io.eventuate.tram.events.publisher.DomainEventPublisher;
import io.eventuate.tram.events.publisher.ResultWithEvents;
import net.chrisrichardson.ftgo.common.PersonName;
import org.junit.Before;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class ConsumerServiceTest {

  private static final long CONSUMER_ID = 42L;

  private ConsumerRepository consumerRepository;
  private DomainEventPublisher domainEventPublisher;
  private ConsumerService consumerService;

  @Before
  public void setUp() {
    consumerRepository = mock(ConsumerRepository.class);
    domainEventPublisher = mock(DomainEventPublisher.class);
    consumerService = new ConsumerService();
    ReflectionTestUtils.setField(consumerService, "consumerRepository", consumerRepository);
    ReflectionTestUtils.setField(consumerService, "domainEventPublisher", domainEventPublisher);

    doAnswer(invocation -> {
      Consumer consumer = invocation.getArgument(0);
      ReflectionTestUtils.setField(consumer, "id", CONSUMER_ID);
      return consumer;
    }).when(consumerRepository).save(any(Consumer.class));
  }

  @Test
  public void shouldSaveTheConsumer() {
    ResultWithEvents<Consumer> result = consumerService.create(new PersonName("John", "Doe"));

    verify(consumerRepository).save(result.result);
    assertEquals(Long.valueOf(CONSUMER_ID), result.result.getId());
  }

  @Test
  public void shouldPublishConsumerCreatedUnderThePublicId() {
    consumerService.create(new PersonName("John", "Doe"));

    @SuppressWarnings("unchecked")
    ArgumentCaptor<List<DomainEvent>> events = ArgumentCaptor.forClass(List.class);
    verify(domainEventPublisher).publish(eq(Consumer.class), eq("0000000042"), events.capture());
    assertEquals(1, events.getValue().size());
    assertTrue(events.getValue().get(0) instanceof ConsumerCreated);
  }

  @Test
  public void shouldExposeThePublicIdOfTheSavedConsumer() {
    ResultWithEvents<Consumer> result = consumerService.create(new PersonName("Jane", "Roe"));

    assertEquals(ConsumerPublicId.of(CONSUMER_ID), result.result.getPublicId());
    assertEquals("0000000042", result.result.getPublicId().value());
  }

  @Test
  public void shouldStillFindConsumersByNumericId() {
    Consumer consumer = new Consumer(new PersonName("John", "Doe"));
    when(consumerRepository.findById(CONSUMER_ID)).thenReturn(Optional.of(consumer));

    assertEquals(Optional.of(consumer), consumerService.findById(CONSUMER_ID));
  }

  @Test(expected = IllegalStateException.class)
  public void shouldNotCreatePublicIdBeforeTheConsumerIsSaved() {
    new Consumer(new PersonName("John", "Doe")).getPublicId();
  }
}
