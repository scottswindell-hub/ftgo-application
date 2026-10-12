package net.chrisrichardson.ftgo.consumerservice.domain;

import io.eventuate.tram.commands.consumer.CommandHandlers;
import io.eventuate.tram.commands.consumer.CommandMessage;
import io.eventuate.tram.messaging.common.Message;
import io.eventuate.tram.sagas.participant.SagaCommandHandlersBuilder;
import net.chrisrichardson.ftgo.consumerservice.api.ValidateOrderByConsumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import static io.eventuate.tram.commands.consumer.CommandHandlerReplyBuilder.withSuccess;

public class ConsumerServiceCommandHandlers  {

  private Logger logger = LoggerFactory.getLogger(getClass());

  @Autowired
  private ConsumerService consumerService;

  public CommandHandlers commandHandlers() {
    return SagaCommandHandlersBuilder
              .fromChannel("consumerService")
              .onMessage(ValidateOrderByConsumer.class, this::validateOrderForConsumer)
              .build();
  }

  private Message validateOrderForConsumer(CommandMessage<ValidateOrderByConsumer> cm) {
    try {
      consumerService.validateOrderForConsumer(cm.getCommand().getConsumerId(), cm.getCommand().getOrderTotal());
      return withSuccess();
    } catch (Exception e) {
      // Don't let a problem validating the consumer block the saga from proceeding
      logger.warn("Consumer validation step failed, continuing", e);
      return withSuccess();
    }
  }
}
