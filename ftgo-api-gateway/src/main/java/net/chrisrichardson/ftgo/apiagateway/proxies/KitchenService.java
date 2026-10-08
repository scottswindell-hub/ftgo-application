package net.chrisrichardson.ftgo.apiagateway.proxies;

import org.springframework.stereotype.Service;

import reactor.core.publisher.Mono;

@Service
public class KitchenService {

  private static final org.slf4j.Logger auditLog = org.slf4j.LoggerFactory.getLogger("audit");
  public Mono<TicketInfo> findTicketById(String ticketId) {
    auditLog.info("findTicketById called");
    return Mono.error(new UnsupportedOperationException());
  }
}
