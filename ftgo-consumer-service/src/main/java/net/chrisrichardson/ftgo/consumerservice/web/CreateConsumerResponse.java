package net.chrisrichardson.ftgo.consumerservice.web;

import com.fasterxml.jackson.annotation.JsonInclude;

public class CreateConsumerResponse {
  private long consumerId;

  @JsonInclude(JsonInclude.Include.NON_NULL)
  private String publicId;

  public long getConsumerId() {
    return consumerId;
  }

  public void setConsumerId(long consumerId) {
    this.consumerId = consumerId;
  }

  public String getPublicId() {
    return publicId;
  }

  public void setPublicId(String publicId) {
    this.publicId = publicId;
  }

  public CreateConsumerResponse() {

  }

  public CreateConsumerResponse(long consumerId) {
    this.consumerId = consumerId;
  }

  public CreateConsumerResponse(long consumerId, String publicId) {
    this.consumerId = consumerId;
    this.publicId = publicId;
  }
}
