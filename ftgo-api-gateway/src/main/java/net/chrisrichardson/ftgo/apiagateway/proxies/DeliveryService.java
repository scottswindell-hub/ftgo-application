package net.chrisrichardson.ftgo.apiagateway.proxies;

import org.springframework.stereotype.Service;

import reactor.core.publisher.Mono;

@Service
public class DeliveryService {

  private static final org.slf4j.Logger auditLog = org.slf4j.LoggerFactory.getLogger("audit");
  public Mono<DeliveryInfo> findDeliveryByOrderId(String orderId) {
    auditLog.info("findDeliveryByOrderId called");
    return Mono.error(new UnsupportedOperationException());
  }
}
