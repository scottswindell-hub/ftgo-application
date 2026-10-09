package net.chrisrichardson.ftgo.kitchenservice.messagehandlers;

import io.eventuate.tram.commands.consumer.CommandHandlers;
import io.eventuate.tram.commands.consumer.CommandMessage;
import io.eventuate.tram.messaging.common.Message;
import io.eventuate.tram.sagas.participant.SagaCommandHandlersBuilder;
import net.chrisrichardson.ftgo.kitchenservice.api.*;
import net.chrisrichardson.ftgo.kitchenservice.domain.RestaurantDetailsVerificationException;
import net.chrisrichardson.ftgo.kitchenservice.domain.Ticket;
import net.chrisrichardson.ftgo.kitchenservice.domain.KitchenService;
import org.springframework.beans.factory.annotation.Autowired;

import static io.eventuate.tram.commands.consumer.CommandHandlerReplyBuilder.withFailure;
import static io.eventuate.tram.commands.consumer.CommandHandlerReplyBuilder.withSuccess;
import static io.eventuate.tram.sagas.participant.SagaReplyMessageBuilder.withLock;

/**
 * Saga participant for the kitchen: handles the ticket commands sent by the
 * Create Order, Cancel Order and Revise Order sagas on
 * {@link KitchenServiceChannels#COMMAND_CHANNEL}.
 *
 * <p>Each handler reads its command once, delegates to {@link KitchenService}
 * and replies with success; only ticket creation can reply with failure.
 */
public class KitchenServiceCommandHandler {

  @Autowired
  private KitchenService kitchenService;

  public CommandHandlers commandHandlers() {
    return SagaCommandHandlersBuilder
            .fromChannel(KitchenServiceChannels.COMMAND_CHANNEL)
            // Create Order saga
            .onMessage(CreateTicket.class, this::createTicket)
            .onMessage(ConfirmCreateTicket.class, this::confirmCreateTicket)
            .onMessage(CancelCreateTicket.class, this::cancelCreateTicket)
            // Cancel Order saga
            .onMessage(BeginCancelTicketCommand.class, this::beginCancelTicket)
            .onMessage(ConfirmCancelTicketCommand.class, this::confirmCancelTicket)
            .onMessage(UndoBeginCancelTicketCommand.class, this::undoBeginCancelTicket)
            // Revise Order saga
            .onMessage(BeginReviseTicketCommand.class, this::beginReviseTicket)
            .onMessage(UndoBeginReviseTicketCommand.class, this::undoBeginReviseTicket)
            .onMessage(ConfirmReviseTicketCommand.class, this::confirmReviseTicket)
            .build();
  }

  // ---------------------------------------------------------------------------
  // Create Order saga
  // ---------------------------------------------------------------------------

  /**
   * Creates the ticket for a new order and locks it for the rest of the saga.
   * Replies with failure when the restaurant details cannot be verified.
   */
  private Message createTicket(CommandMessage<CreateTicket> cm) {
    CreateTicket command = cm.getCommand();
    long restaurantId = command.getRestaurantId();
    Long ticketId = command.getOrderId();
    TicketDetails ticketDetails = command.getTicketDetails();

    try {
      Ticket ticket = kitchenService.createTicket(restaurantId, ticketId, ticketDetails);
      CreateTicketReply reply = new CreateTicketReply(ticket.getId());
      return withLock(Ticket.class, ticket.getId()).withSuccess(reply);
    } catch (RestaurantDetailsVerificationException e) {
      return withFailure();
    }
  }

  /** Confirms a ticket once the order has been authorized. */
  private Message confirmCreateTicket(CommandMessage<ConfirmCreateTicket> cm) {
    Long ticketId = cm.getCommand().getTicketId();
    kitchenService.confirmCreateTicket(ticketId);
    return withSuccess();
  }

  /** Compensates ticket creation when the Create Order saga fails. */
  private Message cancelCreateTicket(CommandMessage<CancelCreateTicket> cm) {
    Long ticketId = cm.getCommand().getTicketId();
    kitchenService.cancelCreateTicket(ticketId);
    return withSuccess();
  }

  // ---------------------------------------------------------------------------
  // Cancel Order saga
  // ---------------------------------------------------------------------------

  /** Begins cancelling the order's ticket. */
  private Message beginCancelTicket(CommandMessage<BeginCancelTicketCommand> cm) {
    BeginCancelTicketCommand command = cm.getCommand();
    kitchenService.cancelTicket(command.getRestaurantId(), command.getOrderId());
    return withSuccess();
  }

  /** Completes the cancellation of the order's ticket. */
  private Message confirmCancelTicket(CommandMessage<ConfirmCancelTicketCommand> cm) {
    ConfirmCancelTicketCommand command = cm.getCommand();
    kitchenService.confirmCancelTicket(command.getRestaurantId(), command.getOrderId());
    return withSuccess();
  }

  /** Compensates a cancellation that could not be completed. */
  private Message undoBeginCancelTicket(CommandMessage<UndoBeginCancelTicketCommand> cm) {
    UndoBeginCancelTicketCommand command = cm.getCommand();
    kitchenService.undoCancel(command.getRestaurantId(), command.getOrderId());
    return withSuccess();
  }

  // ---------------------------------------------------------------------------
  // Revise Order saga
  // ---------------------------------------------------------------------------

  /** Begins revising the order's ticket. */
  public Message beginReviseTicket(CommandMessage<BeginReviseTicketCommand> cm) {
    BeginReviseTicketCommand command = cm.getCommand();
    kitchenService.beginReviseOrder(command.getRestaurantId(), command.getOrderId(),
            command.getRevisedOrderLineItems());
    return withSuccess();
  }

  /** Compensates a revision that could not be completed. */
  public Message undoBeginReviseTicket(CommandMessage<UndoBeginReviseTicketCommand> cm) {
    UndoBeginReviseTicketCommand command = cm.getCommand();
    kitchenService.undoBeginReviseOrder(command.getRestaurantId(), command.getOrderId());
    return withSuccess();
  }

  /** Completes the revision of the order's ticket. */
  public Message confirmReviseTicket(CommandMessage<ConfirmReviseTicketCommand> cm) {
    ConfirmReviseTicketCommand command = cm.getCommand();
    kitchenService.confirmReviseTicket(command.getRestaurantId(), command.getOrderId(),
            command.getRevisedOrderLineItems());
    return withSuccess();
  }
}
