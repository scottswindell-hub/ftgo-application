package net.chrisrichardson.ftgo.deliveryservice.domain;

import net.chrisrichardson.ftgo.deliveryservice.api.web.DeliveryActionType;
import net.chrisrichardson.ftgo.deliveryservice.api.web.DeliveryState;
import org.junit.Before;
import org.junit.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

public class DeliveryServiceTest {

  private static final long COURIER_ID = 101L;
  private static final long ORDER_ID = 102L;
  private static final long RESTAURANT_ID = 103L;
  private static final LocalDateTime READY_BY = LocalDateTime.now();

  private Courier courier;

  private RestaurantRepository restaurantRepository;
  private DeliveryRepository deliveryRepository;
  private CourierRepository courierRepository;
  private DeliveryService deliveryService;
  private Restaurant restaurant;

  @Before
  public void setUp() {
    this.restaurantRepository = mock(RestaurantRepository.class);
    this.deliveryRepository = mock(DeliveryRepository.class);
    this.courierRepository = mock(CourierRepository.class);
    this.courier = Courier.create(COURIER_ID);
    this.restaurant = mock(Restaurant.class);

    this.deliveryService = new DeliveryService(restaurantRepository, deliveryRepository, courierRepository);

  }

  @Test
  public void shouldCreateCourier() {
    when(courierRepository.findOrCreateCourier(COURIER_ID)).thenReturn(courier);
    deliveryService.noteAvailable(COURIER_ID);
    assertTrue(courier.isAvailable());
  }

  // should Create Restaurant

  @Test
  public void shouldCreateDelivery() {

    when(restaurantRepository.findById(RESTAURANT_ID)).thenReturn(Optional.of(restaurant));
    when(restaurant.getAddress()).thenReturn(DeliveryServiceTestData.PICKUP_ADDRESS);
    deliveryService.createDelivery(ORDER_ID, RESTAURANT_ID, DeliveryServiceTestData.DELIVERY_ADDRESS);

    ArgumentCaptor<Delivery> arg = ArgumentCaptor.forClass(Delivery.class);
    verify(deliveryRepository).save(arg.capture());

    Delivery delivery  = arg.getValue();
    assertNotNull(delivery);

    assertEquals(ORDER_ID, delivery.getId());
    assertEquals(DeliveryState.PENDING, delivery.getState());
    assertEquals(RESTAURANT_ID, delivery.getRestaurantId());
    assertEquals(DeliveryServiceTestData.PICKUP_ADDRESS, delivery.getPickupAddress());
    assertEquals(DeliveryServiceTestData.DELIVERY_ADDRESS, delivery.getDeliveryAddress());

  }

  @Test
  public void shouldScheduleDelivery() {
    Delivery delivery = Delivery.create(ORDER_ID, RESTAURANT_ID, DeliveryServiceTestData.PICKUP_ADDRESS, DeliveryServiceTestData.DELIVERY_ADDRESS);

    when(deliveryRepository.findById(ORDER_ID)).thenReturn(Optional.of(delivery));
    when(courierRepository.findAllAvailable()).thenReturn(Collections.singletonList(courier));

    deliveryService.scheduleDelivery(ORDER_ID, READY_BY);

    assertEquals(DeliveryState.SCHEDULED, delivery.getState());
    assertSame(courier.getId(), delivery.getAssignedCourier());

    List<Action> actions = courier.getPlan().getActions();
    assertEquals(2, actions.size());
    assertEquals(DeliveryActionType.PICKUP, actions.get(0).getType());
    assertEquals(DeliveryServiceTestData.PICKUP_ADDRESS, actions.get(0).getAddress());
    assertEquals(DeliveryActionType.DROPOFF, actions.get(1).getType());
    assertEquals(DeliveryServiceTestData.DELIVERY_ADDRESS, actions.get(1).getAddress());
  }

  @Test
  public void shouldScheduleThePickupAtReadyByAndTheDropoffAfterTheEstimatedTravelTime() {
    Delivery delivery = Delivery.create(ORDER_ID, RESTAURANT_ID, DeliveryServiceTestData.PICKUP_ADDRESS, DeliveryServiceTestData.DELIVERY_ADDRESS);

    when(deliveryRepository.findById(ORDER_ID)).thenReturn(Optional.of(delivery));
    when(courierRepository.findAllAvailable()).thenReturn(Collections.singletonList(courier));

    deliveryService.scheduleDelivery(ORDER_ID, READY_BY);

    List<Action> actions = courier.getPlan().getActions();
    assertEquals(READY_BY, actions.get(0).getTime());
    assertEquals(READY_BY.plusMinutes(15), actions.get(1).getTime());
  }

  @Test
  public void shouldAssignTheCourierWithTheLeastWork() {
    Delivery delivery = Delivery.create(ORDER_ID, RESTAURANT_ID, DeliveryServiceTestData.PICKUP_ADDRESS, DeliveryServiceTestData.DELIVERY_ADDRESS);
    Courier busy = Courier.create(1L);
    busy.addAction(Action.makePickup(1, DeliveryServiceTestData.PICKUP_ADDRESS, READY_BY.plusHours(3)));
    busy.addAction(Action.makeDropoff(1, DeliveryServiceTestData.DELIVERY_ADDRESS, READY_BY.plusHours(4)));
    Courier idle = Courier.create(2L);

    when(deliveryRepository.findById(ORDER_ID)).thenReturn(Optional.of(delivery));
    when(courierRepository.findAllAvailable()).thenReturn(Arrays.asList(busy, idle));

    deliveryService.scheduleDelivery(ORDER_ID, READY_BY);

    assertEquals(Long.valueOf(2L), delivery.getAssignedCourier());
    assertEquals(2, busy.getPlan().getActions().size());
    assertEquals(2, idle.getPlan().getActions().size());
  }

  @Test
  public void shouldNotAssignACourierWhoIsBusyAtTheTime() {
    Delivery delivery = Delivery.create(ORDER_ID, RESTAURANT_ID, DeliveryServiceTestData.PICKUP_ADDRESS, DeliveryServiceTestData.DELIVERY_ADDRESS);
    Courier occupied = Courier.create(1L);
    occupied.addAction(Action.makePickup(9, DeliveryServiceTestData.PICKUP_ADDRESS, READY_BY.plusMinutes(5)));

    when(deliveryRepository.findById(ORDER_ID)).thenReturn(Optional.of(delivery));
    when(courierRepository.findAllAvailable()).thenReturn(Arrays.asList(occupied, courier));

    deliveryService.scheduleDelivery(ORDER_ID, READY_BY);

    assertEquals(Long.valueOf(COURIER_ID), delivery.getAssignedCourier());
    assertEquals(1, occupied.getPlan().getActions().size());
  }

  @Test(expected = NoCourierAvailableException.class)
  public void shouldFailWhenNoCourierIsAvailable() {
    Delivery delivery = Delivery.create(ORDER_ID, RESTAURANT_ID, DeliveryServiceTestData.PICKUP_ADDRESS, DeliveryServiceTestData.DELIVERY_ADDRESS);

    when(deliveryRepository.findById(ORDER_ID)).thenReturn(Optional.of(delivery));
    when(courierRepository.findAllAvailable()).thenReturn(Collections.emptyList());

    deliveryService.scheduleDelivery(ORDER_ID, READY_BY);
  }

  @Test
  public void shouldLeaveTheDeliveryPendingWhenNoCourierIsAvailable() {
    Delivery delivery = Delivery.create(ORDER_ID, RESTAURANT_ID, DeliveryServiceTestData.PICKUP_ADDRESS, DeliveryServiceTestData.DELIVERY_ADDRESS);

    when(deliveryRepository.findById(ORDER_ID)).thenReturn(Optional.of(delivery));
    when(courierRepository.findAllAvailable()).thenReturn(Collections.emptyList());

    try {
      deliveryService.scheduleDelivery(ORDER_ID, READY_BY);
      fail("expected NoCourierAvailableException");
    } catch (NoCourierAvailableException e) {
      assertEquals(ORDER_ID, e.getDeliveryId());
    }
    assertEquals(DeliveryState.PENDING, delivery.getState());
  }

}