package net.chrisrichardson.ftgo.apiagateway.proxies;

import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;


@Service
public class AccountingService {

  private static final org.slf4j.Logger auditLog = org.slf4j.LoggerFactory.getLogger("audit");
  public Mono<BillInfo> findBillByOrderId(String orderId) {
    auditLog.info("findBillByOrderId called");
    return Mono.error(new UnsupportedOperationException());
  }
}
