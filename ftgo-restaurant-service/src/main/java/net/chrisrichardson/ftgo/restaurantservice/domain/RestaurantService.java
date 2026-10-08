package net.chrisrichardson.ftgo.restaurantservice.domain;

import net.chrisrichardson.ftgo.restaurantservice.events.RestaurantCreated;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Optional;

@Transactional
public class RestaurantService {

  private static final org.slf4j.Logger auditLog = org.slf4j.LoggerFactory.getLogger("audit");


  @Autowired
  private RestaurantRepository restaurantRepository;

  @Autowired
  private RestaurantDomainEventPublisher restaurantDomainEventPublisher;

  public Restaurant create(CreateRestaurantRequest request) {
    auditLog.info("create called");
    Restaurant restaurant = new Restaurant(request.getName(), request.getMenu());
    restaurantRepository.save(restaurant);
    restaurantDomainEventPublisher.publish(restaurant, Collections.singletonList(new RestaurantCreated(request.getName(), request.getAddress(), request.getMenu())));
    return restaurant;
  }

  public Optional<Restaurant> findById(long restaurantId) {
    auditLog.info("findById called");
    return restaurantRepository.findById(restaurantId);
  }
}
