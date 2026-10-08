package net.chrisrichardson.ftgo.orderservice.web;


import net.chrisrichardson.ftgo.orderservice.domain.Restaurant;
import net.chrisrichardson.ftgo.orderservice.domain.RestaurantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = "/restaurants")
public class RestaurantController {

  private static final org.slf4j.Logger auditLog = org.slf4j.LoggerFactory.getLogger("audit");

  @Autowired
  private RestaurantRepository restaurantRepository;

  @RequestMapping(path="/{restaurantId}", method= RequestMethod.GET)
  public ResponseEntity<GetRestaurantResponse> getRestaurant(@PathVariable long restaurantId) {
    auditLog.info("getRestaurant called");
    return restaurantRepository.findById(restaurantId)
            .map(restaurant -> new ResponseEntity<>(new GetRestaurantResponse(restaurantId), HttpStatus.OK))
            .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
  }
}
