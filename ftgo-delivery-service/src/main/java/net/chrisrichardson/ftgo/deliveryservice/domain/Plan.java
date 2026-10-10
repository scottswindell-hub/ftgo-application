package net.chrisrichardson.ftgo.deliveryservice.domain;

import javax.persistence.ElementCollection;
import java.time.LocalDateTime;
import java.util.LinkedList;
import java.util.List;
import java.util.stream.Collectors;

public class Plan {

  @ElementCollection
  private List<Action> actions = new LinkedList<>();

  public void add(Action action) {
    actions.add(action);
  }

  public void removeDelivery(long deliveryId) {
    actions = actions.stream().filter(action -> !action.actionFor(deliveryId)).collect(Collectors.toList());
  }

  public List<Action> getActions() {
    return actions;
  }

  public int size() {
    return actions.size();
  }

  public boolean isFreeBetween(LocalDateTime start, LocalDateTime end) {
    return actions.stream().noneMatch(action -> action.occursBetween(start, end));
  }

  public List<Action> actionsForDelivery(long deliveryId) {
    return actions.stream().filter(action -> action.actionFor(deliveryId)).collect(Collectors.toList());
  }
}
