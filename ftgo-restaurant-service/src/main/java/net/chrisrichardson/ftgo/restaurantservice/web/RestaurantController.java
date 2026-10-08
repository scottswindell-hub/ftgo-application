package net.chrisrichardson.ftgo.restaurantservice.web;

import net.chrisrichardson.ftgo.restaurantservice.domain.Restaurant;
import net.chrisrichardson.ftgo.restaurantservice.domain.RestaurantService;
import net.chrisrichardson.ftgo.restaurantservice.domain.CreateRestaurantRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(path = "/restaurants")
public class RestaurantController {

  private static final org.slf4j.Logger auditLog = org.slf4j.LoggerFactory.getLogger("audit");

  @Autowired
  private RestaurantService restaurantService;

  @RequestMapping(method = RequestMethod.POST)
  public CreateRestaurantResponse create(@RequestBody CreateRestaurantRequest request) {
    auditLog.info("create called");
    Restaurant r = restaurantService.create(request);
    return new CreateRestaurantResponse(r.getId());
  }

  @RequestMapping(method = RequestMethod.GET, path = "/{restaurantId}")
  public ResponseEntity<GetRestaurantResponse> get(@PathVariable long restaurantId) {
    auditLog.info("get called");
    return restaurantService.findById(restaurantId)
            .map(r -> new ResponseEntity<>(makeGetRestaurantResponse(r), HttpStatus.OK))
            .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
  }

  private GetRestaurantResponse makeGetRestaurantResponse(Restaurant r) {
    return new GetRestaurantResponse(r.getId(), r.getName());
  }


}
