package net.chrisrichardson.ftgo.orderservice.web;

import net.chrisrichardson.ftgo.orderservice.api.web.CreateOrderRequest;
import net.chrisrichardson.ftgo.orderservice.api.web.CreateOrderResponse;
import net.chrisrichardson.ftgo.orderservice.api.web.ReviseOrderRequest;
import net.chrisrichardson.ftgo.orderservice.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;
import java.util.function.Supplier;

import static java.util.stream.Collectors.toList;

@RestController
@RequestMapping(path = "/orders")
public class OrderController {

  private OrderService orderService;

  private OrderRepository orderRepository;


  public OrderController(OrderService orderService, OrderRepository orderRepository) {
    this.orderService = orderService;
    this.orderRepository = orderRepository;
  }

  @PostMapping
  public CreateOrderResponse create(@RequestBody CreateOrderRequest request) {
    Order order = orderService.createOrder(request.getConsumerId(),
            request.getRestaurantId(),
            new DeliveryInformation(request.getDeliveryTime(), request.getDeliveryAddress()),
            request.getLineItems().stream().map(x -> new MenuItemIdAndQuantity(x.getMenuItemId(), x.getQuantity())).collect(toList())
    );
    return new CreateOrderResponse(order.getId());
  }


  @GetMapping("/{orderId}")
  public ResponseEntity<GetOrderResponse> getOrder(@PathVariable long orderId) {
    Optional<Order> order = orderRepository.findById(orderId);
    return order.map(this::successfulResponse).orElseGet(this::notFoundResponse);
  }

  private GetOrderResponse makeGetOrderResponse(Order order) {
    return new GetOrderResponse(order.getId(), order.getState(), order.getOrderTotal());
  }

  @PostMapping("/{orderId}/cancel")
  public ResponseEntity<GetOrderResponse> cancel(@PathVariable long orderId) {
    return changeOrder(() -> orderService.cancel(orderId));
  }

  @PostMapping("/{orderId}/revise")
  public ResponseEntity<GetOrderResponse> revise(@PathVariable long orderId, @RequestBody ReviseOrderRequest request) {
    return changeOrder(() -> orderService.reviseOrder(
            orderId,
            new OrderRevision(Optional.empty(), request.getRevisedOrderLineItems())));
  }

  private ResponseEntity<GetOrderResponse> changeOrder(Supplier<Order> operation) {
    try {
      return successfulResponse(operation.get());
    } catch (OrderNotFoundException e) {
      return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }
  }

  private ResponseEntity<GetOrderResponse> successfulResponse(Order order) {
    return new ResponseEntity<>(makeGetOrderResponse(order), HttpStatus.OK);
  }

  private ResponseEntity<GetOrderResponse> notFoundResponse() {
    return new ResponseEntity<>(HttpStatus.NOT_FOUND);
  }

}
