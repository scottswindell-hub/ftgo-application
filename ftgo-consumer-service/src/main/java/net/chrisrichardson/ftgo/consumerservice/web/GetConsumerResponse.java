package net.chrisrichardson.ftgo.consumerservice.web;

import net.chrisrichardson.ftgo.common.PersonName;

public class GetConsumerResponse extends CreateConsumerResponse {
  private PersonName name;

  public PersonName getName() {
    return name;
  }

  public GetConsumerResponse(long consumerId, PersonName name) {
    super(consumerId);
    this.name = name;
  }
}
