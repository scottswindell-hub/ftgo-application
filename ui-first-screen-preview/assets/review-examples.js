/* Fictional implementation fixtures; no measured FTGO results. */
window.REVIEW_EXAMPLES = [
  {
    "id": "helper",
    "title": "Helper extraction preserves behavior",
    "kind": "illustrative",
    "repository": "microservices-patterns/ftgo-application",
    "declared_intent": "Extract projection helper",
    "verdict": "PASS",
    "owner": "@order_history-owner",
    "baseline": "fixture:helper:baseline",
    "candidate": "fixture:helper:candidate",
    "policy": {
      "id": "example:helper",
      "version": "fixture-v1",
      "invariant": "Keep the OrderAuthorized projection at APPROVED."
    },
    "regions": {
      "behavior": [
        "Project authorized",
        "order_history.project_authorized"
      ],
      "context": [
        "Dependencies and tests",
        "Connected source and test evidence"
      ]
    },
    "evidence": [
      {
        "id": "changed-source",
        "label": "OrderHistoryHandler.java::onAuthorized",
        "kind": "source",
        "content": "Illustrative symbol: OrderHistoryHandler.java::onAuthorized\nBefore intent: project OrderAuthorized.state -> APPROVED\nAfter intent: invoke apply_authorized_state(event) -> APPROVED"
      },
      {
        "id": "relationship",
        "label": "OrderHistoryHandler.java::applyAuthorizedState",
        "kind": "relationship",
        "content": "OrderHistoryHandler.onAuthorized \u2192 applyAuthorizedState \u2192 OrderHistory.state"
      },
      {
        "id": "test",
        "label": "ProjectionTest::authorized_projects_approved",
        "kind": "test",
        "content": "Illustrative test anchor. No test execution is claimed by this fixture."
      }
    ],
    "tiles": [
      {
        "id": "helper:intent_diff",
        "check_id": "intent_diff",
        "label": "Intent differences",
        "status": "PASS",
        "title": "Helper extraction preserves behavior",
        "summary": "Compare the candidate intent with the accepted baseline.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Illustrative Analysis signals: {\"equivalent\": 0.97, \"different\": 0.01, \"uncertain\": 0.02}",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "before": "project OrderAuthorized.state -> APPROVED",
        "after": "invoke apply_authorized_state(event) -> APPROVED",
        "judgment": {
          "choice": "equivalent",
          "probabilities": {
            "equivalent": 0.97,
            "different": 0.01,
            "uncertain": 0.02
          }
        }
      },
      {
        "id": "helper:rule_impact",
        "check_id": "rule_impact",
        "label": "Governance-rule impact",
        "status": "PASS",
        "title": "Applicable governance",
        "summary": "Preserved: expanded helper writes the same field and value.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Keep the OrderAuthorized projection at APPROVED.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ]
      },
      {
        "id": "helper:connected_evidence",
        "check_id": "connected_evidence",
        "label": "Connected evidence",
        "status": "PASS",
        "title": "Source and relationship trace",
        "summary": "OrderHistoryHandler.onAuthorized \u2192 applyAuthorizedState \u2192 OrderHistory.state",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Evidence is illustrative; expand source anchors below. Source correspondence is available in this scenario.",
        "evidence_ids": [
          "changed-source",
          "relationship",
          "test"
        ]
      },
      {
        "id": "helper:governance_decision",
        "check_id": "governance_decision",
        "label": "Governance decision",
        "status": "PASS",
        "title": "Review may proceed",
        "summary": "No required action; retain comparison evidence.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Baseline unchanged. A response does not clear failed checks or promote a baseline.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "contributing_ids": [
          "helper:intent_diff",
          "helper:rule_impact",
          "helper:connected_evidence"
        ]
      },
      {
        "id": "helper:severity",
        "check_id": "severity",
        "label": "Analysis depth",
        "status": "PASS",
        "title": "Analysis selected",
        "summary": "Boundary-scoped analysis selected.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Analysis depth is workload selection, not a risk score.",
        "evidence_ids": []
      },
      {
        "id": "helper:coding_standards",
        "check_id": "coding_standards",
        "label": "Coding standards",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "helper:improper_tests",
        "check_id": "improper_tests",
        "label": "Improper tests",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "context"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": [
          "test"
        ]
      },
      {
        "id": "helper:placement",
        "check_id": "placement",
        "label": "Placement and module fit",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "helper:scope",
        "check_id": "scope",
        "label": "Scope and disclosure",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "helper:sabotage",
        "check_id": "sabotage",
        "label": "Security red flags",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      }
    ]
  },
  {
    "id": "mapping",
    "title": "Event maps to the wrong state",
    "kind": "illustrative",
    "repository": "microservices-patterns/ftgo-application",
    "declared_intent": "Simplify event projection",
    "verdict": "BLOCK",
    "owner": "@order_history-owner",
    "baseline": "fixture:mapping:baseline",
    "candidate": "fixture:mapping:candidate",
    "policy": {
      "id": "example:mapping",
      "version": "fixture-v1",
      "invariant": "OrderAuthorized must project APPROVED."
    },
    "regions": {
      "behavior": [
        "Project authorized",
        "order_history.project_authorized"
      ],
      "context": [
        "Dependencies and tests",
        "Connected source and test evidence"
      ]
    },
    "evidence": [
      {
        "id": "changed-source",
        "label": "OrderHistoryHandler.java::onAuthorized",
        "kind": "source",
        "content": "Illustrative symbol: OrderHistoryHandler.java::onAuthorized\nBefore intent: project OrderAuthorized.state -> APPROVED\nAfter intent: project OrderAuthorized.state -> REJECTED"
      },
      {
        "id": "relationship",
        "label": "OrderHistory.java::state",
        "kind": "relationship",
        "content": "OrderAuthorized \u2192 onAuthorized \u2192 OrderHistory.state"
      },
      {
        "id": "test",
        "label": "ProjectionTest::authorized_projects_approved",
        "kind": "test",
        "content": "Illustrative test anchor. No test execution is claimed by this fixture."
      }
    ],
    "tiles": [
      {
        "id": "mapping:intent_diff",
        "check_id": "intent_diff",
        "label": "Intent differences",
        "status": "WARN",
        "title": "Event maps to the wrong state",
        "summary": "Compare the candidate intent with the accepted baseline.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Confirm intended",
          "Request changes",
          "Dispute comparison"
        ],
        "details": "Illustrative Analysis signals: {\"equivalent\": 0.01, \"different\": 0.98, \"uncertain\": 0.01}",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "before": "project OrderAuthorized.state -> APPROVED",
        "after": "project OrderAuthorized.state -> REJECTED",
        "judgment": {
          "choice": "different",
          "probabilities": {
            "equivalent": 0.01,
            "different": 0.98,
            "uncertain": 0.01
          }
        }
      },
      {
        "id": "mapping:rule_impact",
        "check_id": "rule_impact",
        "label": "Governance-rule impact",
        "status": "BLOCK",
        "title": "Applicable governance",
        "summary": "Violated: the event now produces REJECTED.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Request exception",
          "Dispute policy match"
        ],
        "details": "OrderAuthorized must project APPROVED.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ]
      },
      {
        "id": "mapping:connected_evidence",
        "check_id": "connected_evidence",
        "label": "Connected evidence",
        "status": "PASS",
        "title": "Source and relationship trace",
        "summary": "OrderAuthorized \u2192 onAuthorized \u2192 OrderHistory.state",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Evidence is illustrative; expand source anchors below. Source correspondence is available in this scenario.",
        "evidence_ids": [
          "changed-source",
          "relationship",
          "test"
        ]
      },
      {
        "id": "mapping:governance_decision",
        "check_id": "governance_decision",
        "label": "Governance decision",
        "status": "BLOCK",
        "title": "Required check blocks merge",
        "summary": "Restore APPROVED and rerun the projection test.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [
          "Request changes",
          "Escalate"
        ],
        "details": "Baseline unchanged. A response does not clear failed checks or promote a baseline.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "contributing_ids": [
          "mapping:intent_diff",
          "mapping:rule_impact",
          "mapping:connected_evidence"
        ]
      },
      {
        "id": "mapping:severity",
        "check_id": "severity",
        "label": "Analysis depth",
        "status": "PASS",
        "title": "Analysis selected",
        "summary": "Boundary-scoped analysis selected.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Analysis depth is workload selection, not a risk score.",
        "evidence_ids": []
      },
      {
        "id": "mapping:coding_standards",
        "check_id": "coding_standards",
        "label": "Coding standards",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "mapping:improper_tests",
        "check_id": "improper_tests",
        "label": "Improper tests",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "context"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": [
          "test"
        ]
      },
      {
        "id": "mapping:placement",
        "check_id": "placement",
        "label": "Placement and module fit",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "mapping:scope",
        "check_id": "scope",
        "label": "Scope and disclosure",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "mapping:sabotage",
        "check_id": "sabotage",
        "label": "Security red flags",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      }
    ]
  },
  {
    "id": "retry",
    "title": "Retry budget changes",
    "kind": "illustrative",
    "repository": "microservices-patterns/ftgo-application",
    "declared_intent": "Increase retry count",
    "verdict": "WARN",
    "owner": "@payment-owner",
    "baseline": "fixture:retry:baseline",
    "candidate": "fixture:retry:candidate",
    "policy": {
      "id": "example:retry",
      "version": "fixture-v1",
      "invariant": "Changes to the payment retry budget require the payment owner."
    },
    "regions": {
      "behavior": [
        "Authorize payment",
        "payment.authorize_payment"
      ],
      "context": [
        "Dependencies and tests",
        "Connected source and test evidence"
      ]
    },
    "evidence": [
      {
        "id": "changed-source",
        "label": "PaymentGateway.java::authorize",
        "kind": "source",
        "content": "Illustrative symbol: PaymentGateway.java::authorize\nBefore intent: retry authorize_payment attempts=3 backoff=exponential\nAfter intent: retry authorize_payment attempts=8 backoff=exponential"
      },
      {
        "id": "relationship",
        "label": "RetryConfiguration.java::maxAttempts",
        "kind": "relationship",
        "content": "AuthorizePayment \u2192 paymentGateway.authorize \u2192 retry_policy"
      },
      {
        "id": "test",
        "label": "PaymentRetryTest::stops_at_budget",
        "kind": "test",
        "content": "Illustrative test anchor. No test execution is claimed by this fixture."
      }
    ],
    "tiles": [
      {
        "id": "retry:intent_diff",
        "check_id": "intent_diff",
        "label": "Intent differences",
        "status": "WARN",
        "title": "Retry budget changes",
        "summary": "Compare the candidate intent with the accepted baseline.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Confirm intended",
          "Request changes",
          "Dispute comparison"
        ],
        "details": "Illustrative Analysis signals: {\"equivalent\": 0.02, \"different\": 0.96, \"uncertain\": 0.02}",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "before": "retry authorize_payment attempts=3 backoff=exponential",
        "after": "retry authorize_payment attempts=8 backoff=exponential",
        "judgment": {
          "choice": "different",
          "probabilities": {
            "equivalent": 0.02,
            "different": 0.96,
            "uncertain": 0.02
          }
        }
      },
      {
        "id": "retry:rule_impact",
        "check_id": "rule_impact",
        "label": "Governance-rule impact",
        "status": "WARN",
        "title": "Applicable governance",
        "summary": "Review required: the attempt budget increases from 3 to 8.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Request exception",
          "Dispute policy match"
        ],
        "details": "Changes to the payment retry budget require the payment owner.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ]
      },
      {
        "id": "retry:connected_evidence",
        "check_id": "connected_evidence",
        "label": "Connected evidence",
        "status": "PASS",
        "title": "Source and relationship trace",
        "summary": "AuthorizePayment \u2192 paymentGateway.authorize \u2192 retry_policy",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Evidence is illustrative; expand source anchors below. Source correspondence is available in this scenario.",
        "evidence_ids": [
          "changed-source",
          "relationship",
          "test"
        ]
      },
      {
        "id": "retry:governance_decision",
        "check_id": "governance_decision",
        "label": "Governance decision",
        "status": "WARN",
        "title": "Owner review required",
        "summary": "Confirm the revised retry budget and its operational impact.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [
          "Record owner response",
          "Request changes"
        ],
        "details": "Baseline unchanged. A response does not clear failed checks or promote a baseline.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "contributing_ids": [
          "retry:intent_diff",
          "retry:rule_impact",
          "retry:connected_evidence"
        ]
      },
      {
        "id": "retry:severity",
        "check_id": "severity",
        "label": "Analysis depth",
        "status": "PASS",
        "title": "Analysis selected",
        "summary": "Boundary-scoped analysis selected.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Analysis depth is workload selection, not a risk score.",
        "evidence_ids": []
      },
      {
        "id": "retry:coding_standards",
        "check_id": "coding_standards",
        "label": "Coding standards",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "retry:improper_tests",
        "check_id": "improper_tests",
        "label": "Improper tests",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "context"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": [
          "test"
        ]
      },
      {
        "id": "retry:placement",
        "check_id": "placement",
        "label": "Placement and module fit",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "retry:scope",
        "check_id": "scope",
        "label": "Scope and disclosure",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "retry:sabotage",
        "check_id": "sabotage",
        "label": "Security red flags",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      }
    ]
  },
  {
    "id": "event",
    "title": "Published event loses its identity field",
    "kind": "illustrative",
    "repository": "microservices-patterns/ftgo-application",
    "declared_intent": "Reduce cancellation event payload",
    "verdict": "BLOCK",
    "owner": "@orders-owner",
    "baseline": "fixture:event:baseline",
    "candidate": "fixture:event:candidate",
    "policy": {
      "id": "example:event",
      "version": "fixture-v1",
      "invariant": "Cancellation events must carry restaurant_id for restaurant routing."
    },
    "regions": {
      "behavior": [
        "Publish order cancelled",
        "orders.publish_order_cancelled"
      ],
      "context": [
        "Dependencies and tests",
        "Connected source and test evidence"
      ]
    },
    "evidence": [
      {
        "id": "changed-source",
        "label": "Order.java::cancel",
        "kind": "source",
        "content": "Illustrative symbol: Order.java::cancel\nBefore intent: emit OrderCancelled(order_id, restaurant_id)\nAfter intent: emit OrderCancelled(order_id)"
      },
      {
        "id": "relationship",
        "label": "OrderCancelled.java::restaurantId",
        "kind": "relationship",
        "content": "Order.cancel \u2192 OrderCancelled \u2192 RestaurantEventHandler.route"
      },
      {
        "id": "test",
        "label": "CancellationContractTest::routes_to_restaurant",
        "kind": "test",
        "content": "Illustrative test anchor. No test execution is claimed by this fixture."
      }
    ],
    "tiles": [
      {
        "id": "event:intent_diff",
        "check_id": "intent_diff",
        "label": "Intent differences",
        "status": "WARN",
        "title": "Published event loses its identity field",
        "summary": "Compare the candidate intent with the accepted baseline.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Confirm intended",
          "Request changes",
          "Dispute comparison"
        ],
        "details": "Illustrative Analysis signals: {\"equivalent\": 0.01, \"different\": 0.98, \"uncertain\": 0.01}",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "before": "emit OrderCancelled(order_id, restaurant_id)",
        "after": "emit OrderCancelled(order_id)",
        "judgment": {
          "choice": "different",
          "probabilities": {
            "equivalent": 0.01,
            "different": 0.98,
            "uncertain": 0.01
          }
        }
      },
      {
        "id": "event:rule_impact",
        "check_id": "rule_impact",
        "label": "Governance-rule impact",
        "status": "BLOCK",
        "title": "Applicable governance",
        "summary": "Violated: a required consumer routing field is removed.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Request exception",
          "Dispute policy match"
        ],
        "details": "Cancellation events must carry restaurant_id for restaurant routing.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ]
      },
      {
        "id": "event:connected_evidence",
        "check_id": "connected_evidence",
        "label": "Connected evidence",
        "status": "PASS",
        "title": "Source and relationship trace",
        "summary": "Order.cancel \u2192 OrderCancelled \u2192 RestaurantEventHandler.route",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Evidence is illustrative; expand source anchors below. Source correspondence is available in this scenario.",
        "evidence_ids": [
          "changed-source",
          "relationship",
          "test"
        ]
      },
      {
        "id": "event:governance_decision",
        "check_id": "governance_decision",
        "label": "Governance decision",
        "status": "BLOCK",
        "title": "Required check blocks merge",
        "summary": "Restore the field or obtain a versioned contract migration.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [
          "Request changes",
          "Escalate"
        ],
        "details": "Baseline unchanged. A response does not clear failed checks or promote a baseline.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "contributing_ids": [
          "event:intent_diff",
          "event:rule_impact",
          "event:connected_evidence"
        ]
      },
      {
        "id": "event:severity",
        "check_id": "severity",
        "label": "Analysis depth",
        "status": "PASS",
        "title": "Analysis selected",
        "summary": "Boundary-scoped analysis selected.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Analysis depth is workload selection, not a risk score.",
        "evidence_ids": []
      },
      {
        "id": "event:coding_standards",
        "check_id": "coding_standards",
        "label": "Coding standards",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "event:improper_tests",
        "check_id": "improper_tests",
        "label": "Improper tests",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "context"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": [
          "test"
        ]
      },
      {
        "id": "event:placement",
        "check_id": "placement",
        "label": "Placement and module fit",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "event:scope",
        "check_id": "scope",
        "label": "Scope and disclosure",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "event:sabotage",
        "check_id": "sabotage",
        "label": "Security red flags",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      }
    ]
  },
  {
    "id": "compensation",
    "title": "Saga compensation removed",
    "kind": "illustrative",
    "repository": "microservices-patterns/ftgo-application",
    "declared_intent": "Simplify failed order handling",
    "verdict": "BLOCK",
    "owner": "@orders-owner",
    "baseline": "fixture:compensation:baseline",
    "candidate": "fixture:compensation:candidate",
    "policy": {
      "id": "example:compensation",
      "version": "fixture-v1",
      "invariant": "A rejected order must release its reserved credit."
    },
    "regions": {
      "behavior": [
        "Create order saga",
        "orders.create_order_saga"
      ],
      "context": [
        "Dependencies and tests",
        "Connected source and test evidence"
      ]
    },
    "evidence": [
      {
        "id": "changed-source",
        "label": "CreateOrderSaga.java::configure",
        "kind": "source",
        "content": "Illustrative symbol: CreateOrderSaga.java::configure\nBefore intent: on kitchen_rejected -> release_credit then reject_order\nAfter intent: on kitchen_rejected -> reject_order"
      },
      {
        "id": "relationship",
        "label": "AccountingService.java::releaseCredit",
        "kind": "relationship",
        "content": "CreateOrderSaga \u2192 KitchenRejected \u2192 releaseCredit (removed)"
      },
      {
        "id": "test",
        "label": "CreateOrderSagaTest::kitchen_rejection_releases_credit",
        "kind": "test",
        "content": "Illustrative test anchor. No test execution is claimed by this fixture."
      }
    ],
    "tiles": [
      {
        "id": "compensation:intent_diff",
        "check_id": "intent_diff",
        "label": "Intent differences",
        "status": "WARN",
        "title": "Saga compensation removed",
        "summary": "Compare the candidate intent with the accepted baseline.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Confirm intended",
          "Request changes",
          "Dispute comparison"
        ],
        "details": "Illustrative Analysis signals: {\"equivalent\": 0.01, \"different\": 0.97, \"uncertain\": 0.02}",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "before": "on kitchen_rejected -> release_credit then reject_order",
        "after": "on kitchen_rejected -> reject_order",
        "judgment": {
          "choice": "different",
          "probabilities": {
            "equivalent": 0.01,
            "different": 0.97,
            "uncertain": 0.02
          }
        }
      },
      {
        "id": "compensation:rule_impact",
        "check_id": "rule_impact",
        "label": "Governance-rule impact",
        "status": "BLOCK",
        "title": "Applicable governance",
        "summary": "Violated: failure compensation no longer releases credit.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Request exception",
          "Dispute policy match"
        ],
        "details": "A rejected order must release its reserved credit.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ]
      },
      {
        "id": "compensation:connected_evidence",
        "check_id": "connected_evidence",
        "label": "Connected evidence",
        "status": "PASS",
        "title": "Source and relationship trace",
        "summary": "CreateOrderSaga \u2192 KitchenRejected \u2192 releaseCredit (removed)",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Evidence is illustrative; expand source anchors below. Source correspondence is available in this scenario.",
        "evidence_ids": [
          "changed-source",
          "relationship",
          "test"
        ]
      },
      {
        "id": "compensation:governance_decision",
        "check_id": "governance_decision",
        "label": "Governance decision",
        "status": "BLOCK",
        "title": "Required check blocks merge",
        "summary": "Restore compensation before merging.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [
          "Request changes",
          "Escalate"
        ],
        "details": "Baseline unchanged. A response does not clear failed checks or promote a baseline.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "contributing_ids": [
          "compensation:intent_diff",
          "compensation:rule_impact",
          "compensation:connected_evidence"
        ]
      },
      {
        "id": "compensation:severity",
        "check_id": "severity",
        "label": "Analysis depth",
        "status": "PASS",
        "title": "Analysis selected",
        "summary": "Boundary-scoped analysis selected.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Analysis depth is workload selection, not a risk score.",
        "evidence_ids": []
      },
      {
        "id": "compensation:coding_standards",
        "check_id": "coding_standards",
        "label": "Coding standards",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "compensation:improper_tests",
        "check_id": "improper_tests",
        "label": "Improper tests",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "context"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": [
          "test"
        ]
      },
      {
        "id": "compensation:placement",
        "check_id": "placement",
        "label": "Placement and module fit",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "compensation:scope",
        "check_id": "scope",
        "label": "Scope and disclosure",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "compensation:sabotage",
        "check_id": "sabotage",
        "label": "Security red flags",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      }
    ]
  },
  {
    "id": "ownership",
    "title": "Service writes another service\u2019s data",
    "kind": "illustrative",
    "repository": "microservices-patterns/ftgo-application",
    "declared_intent": "Optimize ticket cancellation",
    "verdict": "BLOCK",
    "owner": "@orders-owner",
    "baseline": "fixture:ownership:baseline",
    "candidate": "fixture:ownership:candidate",
    "policy": {
      "id": "example:ownership",
      "version": "fixture-v1",
      "invariant": "Kitchen service owns ticket persistence."
    },
    "regions": {
      "behavior": [
        "Cancel ticket",
        "orders.cancel_ticket"
      ],
      "context": [
        "Dependencies and tests",
        "Connected source and test evidence"
      ]
    },
    "evidence": [
      {
        "id": "changed-source",
        "label": "OrderService.java::cancel",
        "kind": "source",
        "content": "Illustrative symbol: OrderService.java::cancel\nBefore intent: invoke kitchen.cancel_ticket(ticket_id)\nAfter intent: write kitchen_db.ticket.status = CANCELLED"
      },
      {
        "id": "relationship",
        "label": "KitchenRepository.java::update",
        "kind": "relationship",
        "content": "OrderService.cancel \u2192 KitchenRepository.update (new ownership crossing)"
      },
      {
        "id": "test",
        "label": "ServiceBoundaryTest::orders_do_not_write_kitchen",
        "kind": "test",
        "content": "Illustrative test anchor. No test execution is claimed by this fixture."
      }
    ],
    "tiles": [
      {
        "id": "ownership:intent_diff",
        "check_id": "intent_diff",
        "label": "Intent differences",
        "status": "WARN",
        "title": "Service writes another service\u2019s data",
        "summary": "Compare the candidate intent with the accepted baseline.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Confirm intended",
          "Request changes",
          "Dispute comparison"
        ],
        "details": "Illustrative Analysis signals: {\"equivalent\": 0.01, \"different\": 0.98, \"uncertain\": 0.01}",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "before": "invoke kitchen.cancel_ticket(ticket_id)",
        "after": "write kitchen_db.ticket.status = CANCELLED",
        "judgment": {
          "choice": "different",
          "probabilities": {
            "equivalent": 0.01,
            "different": 0.98,
            "uncertain": 0.01
          }
        }
      },
      {
        "id": "ownership:rule_impact",
        "check_id": "rule_impact",
        "label": "Governance-rule impact",
        "status": "BLOCK",
        "title": "Applicable governance",
        "summary": "Violated: Order service directly writes the Kitchen database.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Request exception",
          "Dispute policy match"
        ],
        "details": "Kitchen service owns ticket persistence.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ]
      },
      {
        "id": "ownership:connected_evidence",
        "check_id": "connected_evidence",
        "label": "Connected evidence",
        "status": "PASS",
        "title": "Source and relationship trace",
        "summary": "OrderService.cancel \u2192 KitchenRepository.update (new ownership crossing)",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Evidence is illustrative; expand source anchors below. Source correspondence is available in this scenario.",
        "evidence_ids": [
          "changed-source",
          "relationship",
          "test"
        ]
      },
      {
        "id": "ownership:governance_decision",
        "check_id": "governance_decision",
        "label": "Governance decision",
        "status": "BLOCK",
        "title": "Required check blocks merge",
        "summary": "Use the kitchen cancellation contract.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [
          "Request changes",
          "Escalate"
        ],
        "details": "Baseline unchanged. A response does not clear failed checks or promote a baseline.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "contributing_ids": [
          "ownership:intent_diff",
          "ownership:rule_impact",
          "ownership:connected_evidence",
          "ownership:placement"
        ]
      },
      {
        "id": "ownership:severity",
        "check_id": "severity",
        "label": "Analysis depth",
        "status": "PASS",
        "title": "Analysis selected",
        "summary": "Boundary-scoped analysis selected.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Analysis depth is workload selection, not a risk score.",
        "evidence_ids": []
      },
      {
        "id": "ownership:coding_standards",
        "check_id": "coding_standards",
        "label": "Coding standards",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "ownership:improper_tests",
        "check_id": "improper_tests",
        "label": "Improper tests",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "context"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": [
          "test"
        ]
      },
      {
        "id": "ownership:placement",
        "check_id": "placement",
        "label": "Placement and module fit",
        "status": "BLOCK",
        "title": "Database ownership crossed",
        "summary": "Use the kitchen cancellation contract.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Request fix",
          "Dispute finding"
        ],
        "details": "Kitchen service owns ticket persistence.",
        "evidence_ids": [
          "changed-source"
        ]
      },
      {
        "id": "ownership:scope",
        "check_id": "scope",
        "label": "Scope and disclosure",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "ownership:sabotage",
        "check_id": "sabotage",
        "label": "Security red flags",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      }
    ]
  },
  {
    "id": "ambiguous",
    "title": "Split introduces ambiguous correspondence",
    "kind": "illustrative",
    "repository": "microservices-patterns/ftgo-application",
    "declared_intent": "Split validation methods",
    "verdict": "GAP",
    "owner": "@orders-owner",
    "baseline": "fixture:ambiguous:baseline",
    "candidate": "fixture:ambiguous:candidate",
    "policy": {
      "id": "example:ambiguous",
      "version": "fixture-v1",
      "invariant": "All original order validations must remain on the submission path."
    },
    "regions": {
      "behavior": [
        "Validate order",
        "orders.validate_order"
      ],
      "context": [
        "Dependencies and tests",
        "Connected source and test evidence"
      ]
    },
    "evidence": [
      {
        "id": "changed-source",
        "label": "OrderValidator.java::validateOrder",
        "kind": "source",
        "content": "Illustrative symbol: OrderValidator.java::validateOrder\nBefore intent: validate_order { customer, restaurant, credit }\nAfter intent: validate_customer_order { customer, credit }; validate_restaurant { restaurant }"
      },
      {
        "id": "relationship",
        "label": "OrderService.java::submitOrder",
        "kind": "relationship",
        "content": "submitOrder \u2192 validateCustomerOrder; validateRestaurant reachability unresolved"
      },
      {
        "id": "test",
        "label": "OrderValidationTest::rejects_closed_restaurant",
        "kind": "test",
        "content": "Illustrative test anchor. No test execution is claimed by this fixture."
      }
    ],
    "tiles": [
      {
        "id": "ambiguous:intent_diff",
        "check_id": "intent_diff",
        "label": "Intent differences",
        "status": "GAP",
        "title": "Split introduces ambiguous correspondence",
        "summary": "Compare the candidate intent with the accepted baseline.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Request changes",
          "Dispute comparison"
        ],
        "details": "Illustrative Analysis signals: {\"equivalent\": 0.41, \"different\": 0.17, \"uncertain\": 0.42}",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "before": "validate_order { customer, restaurant, credit }",
        "after": "validate_customer_order { customer, credit }; validate_restaurant { restaurant }",
        "judgment": {
          "choice": "uncertain",
          "probabilities": {
            "equivalent": 0.41,
            "different": 0.17,
            "uncertain": 0.42
          }
        }
      },
      {
        "id": "ambiguous:rule_impact",
        "check_id": "rule_impact",
        "label": "Governance-rule impact",
        "status": "GAP",
        "title": "Applicable governance",
        "summary": "Undecided: two candidate units overlap the baseline validator.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Request exception",
          "Dispute policy match"
        ],
        "details": "All original order validations must remain on the submission path.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ]
      },
      {
        "id": "ambiguous:connected_evidence",
        "check_id": "connected_evidence",
        "label": "Connected evidence",
        "status": "GAP",
        "title": "Evidence trace needs resolution",
        "summary": "submitOrder \u2192 validateCustomerOrder; validateRestaurant reachability unresolved",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [
          "Supply evidence",
          "Request rerun"
        ],
        "details": "Evidence is illustrative; expand source anchors below. Unresolved context prevents a decision.",
        "evidence_ids": [
          "changed-source",
          "relationship",
          "test"
        ]
      },
      {
        "id": "ambiguous:governance_decision",
        "check_id": "governance_decision",
        "label": "Governance decision",
        "status": "GAP",
        "title": "Required evidence is incomplete",
        "summary": "Resolve the split and verify all validation paths before deciding.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [
          "Request changes",
          "Escalate"
        ],
        "details": "Baseline unchanged. A response does not clear failed checks or promote a baseline.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "contributing_ids": [
          "ambiguous:intent_diff",
          "ambiguous:rule_impact",
          "ambiguous:connected_evidence"
        ]
      },
      {
        "id": "ambiguous:severity",
        "check_id": "severity",
        "label": "Analysis depth",
        "status": "PASS",
        "title": "Analysis selected",
        "summary": "Boundary-scoped analysis selected.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Analysis depth is workload selection, not a risk score.",
        "evidence_ids": []
      },
      {
        "id": "ambiguous:coding_standards",
        "check_id": "coding_standards",
        "label": "Coding standards",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "ambiguous:improper_tests",
        "check_id": "improper_tests",
        "label": "Improper tests",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "context"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": [
          "test"
        ]
      },
      {
        "id": "ambiguous:placement",
        "check_id": "placement",
        "label": "Placement and module fit",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "ambiguous:scope",
        "check_id": "scope",
        "label": "Scope and disclosure",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "ambiguous:sabotage",
        "check_id": "sabotage",
        "label": "Security red flags",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      }
    ]
  },
  {
    "id": "dynamic",
    "title": "Changed dispatch target cannot be resolved",
    "kind": "illustrative",
    "repository": "microservices-patterns/ftgo-application",
    "declared_intent": "Use a configurable provider",
    "verdict": "GAP",
    "owner": "@payment-owner",
    "baseline": "fixture:dynamic:baseline",
    "candidate": "fixture:dynamic:candidate",
    "policy": {
      "id": "example:dynamic",
      "version": "fixture-v1",
      "invariant": "Every payment authorizer must enforce the accepted credit constraint."
    },
    "regions": {
      "behavior": [
        "Select authorizer",
        "payment.select_authorizer"
      ],
      "context": [
        "Dependencies and tests",
        "Connected source and test evidence"
      ]
    },
    "evidence": [
      {
        "id": "changed-source",
        "label": "PaymentService.java::authorize",
        "kind": "source",
        "content": "Illustrative symbol: PaymentService.java::authorize\nBefore intent: invoke DefaultAuthorizer.authorize(payment)\nAfter intent: invoke configured_provider.authorize(payment)"
      },
      {
        "id": "relationship",
        "label": "ProviderRegistry.java::lookup",
        "kind": "relationship",
        "content": "authorizePayment \u2192 providerRegistry.lookup \u2192 unresolved authorizer"
      },
      {
        "id": "test",
        "label": "PaymentProviderTest::configured_authorizer",
        "kind": "test",
        "content": "Illustrative test anchor. No test execution is claimed by this fixture."
      }
    ],
    "tiles": [
      {
        "id": "dynamic:intent_diff",
        "check_id": "intent_diff",
        "label": "Intent differences",
        "status": "GAP",
        "title": "Changed dispatch target cannot be resolved",
        "summary": "Compare the candidate intent with the accepted baseline.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Request changes",
          "Dispute comparison"
        ],
        "details": "Illustrative Analysis signals: {\"equivalent\": 0.1, \"different\": 0.12, \"uncertain\": 0.78}",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "before": "invoke DefaultAuthorizer.authorize(payment)",
        "after": "invoke configured_provider.authorize(payment)",
        "judgment": {
          "choice": "uncertain",
          "probabilities": {
            "equivalent": 0.1,
            "different": 0.12,
            "uncertain": 0.78
          }
        }
      },
      {
        "id": "dynamic:rule_impact",
        "check_id": "rule_impact",
        "label": "Governance-rule impact",
        "status": "GAP",
        "title": "Applicable governance",
        "summary": "Undecided: runtime provider configuration is absent from the evidence.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Request exception",
          "Dispute policy match"
        ],
        "details": "Every payment authorizer must enforce the accepted credit constraint.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ]
      },
      {
        "id": "dynamic:connected_evidence",
        "check_id": "connected_evidence",
        "label": "Connected evidence",
        "status": "GAP",
        "title": "Evidence trace needs resolution",
        "summary": "authorizePayment \u2192 providerRegistry.lookup \u2192 unresolved authorizer",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [
          "Supply evidence",
          "Request rerun"
        ],
        "details": "Evidence is illustrative; expand source anchors below. Unresolved context prevents a decision.",
        "evidence_ids": [
          "changed-source",
          "relationship",
          "test"
        ]
      },
      {
        "id": "dynamic:governance_decision",
        "check_id": "governance_decision",
        "label": "Governance decision",
        "status": "GAP",
        "title": "Required evidence is incomplete",
        "summary": "Attach provider configuration and resolve the target.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [
          "Request changes",
          "Escalate"
        ],
        "details": "Baseline unchanged. A response does not clear failed checks or promote a baseline.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "contributing_ids": [
          "dynamic:intent_diff",
          "dynamic:rule_impact",
          "dynamic:connected_evidence"
        ]
      },
      {
        "id": "dynamic:severity",
        "check_id": "severity",
        "label": "Analysis depth",
        "status": "PASS",
        "title": "Analysis selected",
        "summary": "Boundary-scoped analysis selected.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Analysis depth is workload selection, not a risk score.",
        "evidence_ids": []
      },
      {
        "id": "dynamic:coding_standards",
        "check_id": "coding_standards",
        "label": "Coding standards",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "dynamic:improper_tests",
        "check_id": "improper_tests",
        "label": "Improper tests",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "context"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": [
          "test"
        ]
      },
      {
        "id": "dynamic:placement",
        "check_id": "placement",
        "label": "Placement and module fit",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "dynamic:scope",
        "check_id": "scope",
        "label": "Scope and disclosure",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "dynamic:sabotage",
        "check_id": "sabotage",
        "label": "Security red flags",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      }
    ]
  },
  {
    "id": "logging",
    "title": "Logging-only change outside governed scope",
    "kind": "illustrative",
    "repository": "microservices-patterns/ftgo-application",
    "declared_intent": "Remove debug logging",
    "verdict": "PASS",
    "owner": "@orders-owner",
    "baseline": "fixture:logging:baseline",
    "candidate": "fixture:logging:candidate",
    "policy": {
      "id": "example:logging",
      "version": "fixture-v1",
      "invariant": "Accepted boundaries cover order state, messaging and ownership; debug logging is outside this fixture\u2019s policy."
    },
    "regions": {
      "behavior": [
        "Construct service",
        "orders.construct_service"
      ],
      "context": [
        "Dependencies and tests",
        "Connected source and test evidence"
      ]
    },
    "evidence": [
      {
        "id": "changed-source",
        "label": "OrderService.java::constructor",
        "kind": "source",
        "content": "Illustrative symbol: OrderService.java::constructor\nBefore intent: construct order_service; log.debug(started)\nAfter intent: construct order_service"
      },
      {
        "id": "relationship",
        "label": "Logger.java::debug",
        "kind": "relationship",
        "content": "OrderService constructor \u2192 logger.debug (removed)"
      },
      {
        "id": "test",
        "label": "OrderServiceTest::startup",
        "kind": "test",
        "content": "Illustrative test anchor. No test execution is claimed by this fixture."
      }
    ],
    "tiles": [
      {
        "id": "logging:intent_diff",
        "check_id": "intent_diff",
        "label": "Intent differences",
        "status": "PASS",
        "title": "Logging-only change outside governed scope",
        "summary": "No governed intent change.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Not judged: deterministic scope selection excluded this change.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "before": "construct order_service; log.debug(started)",
        "after": "construct order_service",
        "judgment": {
          "choice": "not_judged",
          "probabilities": null
        }
      },
      {
        "id": "logging:rule_impact",
        "check_id": "rule_impact",
        "label": "Governance-rule impact",
        "status": "PASS",
        "title": "Applicable governance",
        "summary": "Not applicable: complete scope analysis finds no governed witness affected.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Accepted boundaries cover order state, messaging and ownership; debug logging is outside this fixture\u2019s policy.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ]
      },
      {
        "id": "logging:connected_evidence",
        "check_id": "connected_evidence",
        "label": "Connected evidence",
        "status": "PASS",
        "title": "Source and relationship trace",
        "summary": "OrderService constructor \u2192 logger.debug (removed)",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Evidence is illustrative; expand source anchors below. Source correspondence is available in this scenario.",
        "evidence_ids": [
          "changed-source",
          "relationship",
          "test"
        ]
      },
      {
        "id": "logging:governance_decision",
        "check_id": "governance_decision",
        "label": "Governance decision",
        "status": "PASS",
        "title": "Review may proceed",
        "summary": "No semantic approval required under this policy scope.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Baseline unchanged. A response does not clear failed checks or promote a baseline.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "contributing_ids": [
          "logging:intent_diff",
          "logging:rule_impact",
          "logging:connected_evidence"
        ]
      },
      {
        "id": "logging:severity",
        "check_id": "severity",
        "label": "Analysis depth",
        "status": "PASS",
        "title": "Analysis selected",
        "summary": "Deterministic scope check; Analysis skipped.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Analysis depth is workload selection, not a risk score.",
        "evidence_ids": []
      },
      {
        "id": "logging:coding_standards",
        "check_id": "coding_standards",
        "label": "Coding standards",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "logging:improper_tests",
        "check_id": "improper_tests",
        "label": "Improper tests",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "context"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": [
          "test"
        ]
      },
      {
        "id": "logging:placement",
        "check_id": "placement",
        "label": "Placement and module fit",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "logging:scope",
        "check_id": "scope",
        "label": "Scope and disclosure",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "logging:sabotage",
        "check_id": "sabotage",
        "label": "Security red flags",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      }
    ]
  },
  {
    "id": "new_intent",
    "title": "New behavior has no accepted boundary",
    "kind": "illustrative",
    "repository": "microservices-patterns/ftgo-application",
    "declared_intent": "Add expired order cleanup",
    "verdict": "GAP",
    "owner": "@orders-owner",
    "baseline": "fixture:new_intent:baseline",
    "candidate": "fixture:new_intent:candidate",
    "policy": {
      "id": "example:new_intent",
      "version": "fixture-v1",
      "invariant": "New scheduled business behavior requires an accepted scope and owner."
    },
    "regions": {
      "behavior": [
        "Auto cancel expired",
        "orders.auto_cancel_expired"
      ],
      "context": [
        "Dependencies and tests",
        "Connected source and test evidence"
      ]
    },
    "evidence": [
      {
        "id": "changed-source",
        "label": "ExpiryScheduler.java::tick",
        "kind": "source",
        "content": "Illustrative symbol: ExpiryScheduler.java::tick\nBefore intent: no scheduled cancellation intent\nAfter intent: schedule every 5m -> cancel orders older_than=30m"
      },
      {
        "id": "relationship",
        "label": "OrderRepository.java::findExpired",
        "kind": "relationship",
        "content": "ExpiryScheduler.tick \u2192 OrderRepository.findExpired \u2192 Order.cancel"
      },
      {
        "id": "test",
        "label": "ExpirySchedulerTest::expires_old_orders",
        "kind": "test",
        "content": "Illustrative test anchor. No test execution is claimed by this fixture."
      }
    ],
    "tiles": [
      {
        "id": "new_intent:intent_diff",
        "check_id": "intent_diff",
        "label": "Intent differences",
        "status": "WARN",
        "title": "New behavior has no accepted boundary",
        "summary": "Compare the candidate intent with the accepted baseline.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Request changes",
          "Dispute comparison"
        ],
        "details": "Illustrative Analysis signals: {\"equivalent\": 0.01, \"different\": 0.96, \"uncertain\": 0.03}",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "before": "no scheduled cancellation intent",
        "after": "schedule every 5m -> cancel orders older_than=30m",
        "judgment": {
          "choice": "different",
          "probabilities": {
            "equivalent": 0.01,
            "different": 0.96,
            "uncertain": 0.03
          }
        }
      },
      {
        "id": "new_intent:rule_impact",
        "check_id": "rule_impact",
        "label": "Governance-rule impact",
        "status": "GAP",
        "title": "Applicable governance",
        "summary": "Uncovered: there is no accepted boundary for automatic cancellation.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Request exception",
          "Dispute policy match"
        ],
        "details": "New scheduled business behavior requires an accepted scope and owner.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ]
      },
      {
        "id": "new_intent:connected_evidence",
        "check_id": "connected_evidence",
        "label": "Connected evidence",
        "status": "GAP",
        "title": "Evidence trace needs resolution",
        "summary": "ExpiryScheduler.tick \u2192 OrderRepository.findExpired \u2192 Order.cancel",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [
          "Supply evidence",
          "Request rerun"
        ],
        "details": "Evidence is illustrative; expand source anchors below. Unresolved context prevents a decision.",
        "evidence_ids": [
          "changed-source",
          "relationship",
          "test"
        ]
      },
      {
        "id": "new_intent:governance_decision",
        "check_id": "governance_decision",
        "label": "Governance decision",
        "status": "GAP",
        "title": "Required evidence is incomplete",
        "summary": "Assign an owner and establish the new governed boundary.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [
          "Request changes",
          "Escalate"
        ],
        "details": "Baseline unchanged. A response does not clear failed checks or promote a baseline.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "contributing_ids": [
          "new_intent:intent_diff",
          "new_intent:rule_impact",
          "new_intent:connected_evidence"
        ]
      },
      {
        "id": "new_intent:severity",
        "check_id": "severity",
        "label": "Analysis depth",
        "status": "PASS",
        "title": "Analysis selected",
        "summary": "Boundary-scoped analysis selected.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Analysis depth is workload selection, not a risk score.",
        "evidence_ids": []
      },
      {
        "id": "new_intent:coding_standards",
        "check_id": "coding_standards",
        "label": "Coding standards",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "new_intent:improper_tests",
        "check_id": "improper_tests",
        "label": "Improper tests",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "context"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": [
          "test"
        ]
      },
      {
        "id": "new_intent:placement",
        "check_id": "placement",
        "label": "Placement and module fit",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "new_intent:scope",
        "check_id": "scope",
        "label": "Scope and disclosure",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "new_intent:sabotage",
        "check_id": "sabotage",
        "label": "Security red flags",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      }
    ]
  },
  {
    "id": "tests",
    "title": "Equivalent implementation with weakened tests",
    "kind": "illustrative",
    "repository": "microservices-patterns/ftgo-application",
    "declared_intent": "Refactor cancellation tests",
    "verdict": "BLOCK",
    "owner": "@orders-owner",
    "baseline": "fixture:tests:baseline",
    "candidate": "fixture:tests:candidate",
    "policy": {
      "id": "example:tests",
      "version": "fixture-v1",
      "invariant": "The required rejection test must exercise the real cancellation guard."
    },
    "regions": {
      "behavior": [
        "Cancel order",
        "orders.cancel_order"
      ],
      "context": [
        "Dependencies and tests",
        "Connected source and test evidence"
      ]
    },
    "evidence": [
      {
        "id": "changed-source",
        "label": "Order.java::cancel",
        "kind": "source",
        "content": "Illustrative symbol: Order.java::cancel\nBefore intent: requires state == APPROVED; transition -> CANCEL_PENDING\nAfter intent: requires state == APPROVED; transition -> CANCEL_PENDING"
      },
      {
        "id": "relationship",
        "label": "OrderTest.java::rejects_invalid_state",
        "kind": "relationship",
        "content": "OrderTest mocks cancel \u2192 asserts mocked result; real Order.cancel is bypassed"
      },
      {
        "id": "test",
        "label": "OrderTest::rejects_invalid_state",
        "kind": "test",
        "content": "Mocked return is asserted without calling production code."
      }
    ],
    "tiles": [
      {
        "id": "tests:intent_diff",
        "check_id": "intent_diff",
        "label": "Intent differences",
        "status": "PASS",
        "title": "Equivalent implementation with weakened tests",
        "summary": "Compare the candidate intent with the accepted baseline.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Illustrative Analysis signals: {\"equivalent\": 0.98, \"different\": 0.01, \"uncertain\": 0.01}",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "before": "requires state == APPROVED; transition -> CANCEL_PENDING",
        "after": "requires state == APPROVED; transition -> CANCEL_PENDING",
        "judgment": {
          "choice": "equivalent",
          "probabilities": {
            "equivalent": 0.98,
            "different": 0.01,
            "uncertain": 0.01
          }
        }
      },
      {
        "id": "tests:rule_impact",
        "check_id": "rule_impact",
        "label": "Governance-rule impact",
        "status": "PASS",
        "title": "Applicable governance",
        "summary": "Intent preserved; the independent test-integrity policy fails.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "The required rejection test must exercise the real cancellation guard.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ]
      },
      {
        "id": "tests:connected_evidence",
        "check_id": "connected_evidence",
        "label": "Connected evidence",
        "status": "PASS",
        "title": "Source and relationship trace",
        "summary": "OrderTest mocks cancel \u2192 asserts mocked result; real Order.cancel is bypassed",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Evidence is illustrative; expand source anchors below. Source correspondence is available in this scenario.",
        "evidence_ids": [
          "changed-source",
          "relationship",
          "test"
        ]
      },
      {
        "id": "tests:governance_decision",
        "check_id": "governance_decision",
        "label": "Governance decision",
        "status": "BLOCK",
        "title": "Required check blocks merge",
        "summary": "Restore an executable invalid-state regression test.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [
          "Request changes",
          "Escalate"
        ],
        "details": "Baseline unchanged. A response does not clear failed checks or promote a baseline.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "contributing_ids": [
          "tests:intent_diff",
          "tests:rule_impact",
          "tests:connected_evidence",
          "tests:improper_tests"
        ]
      },
      {
        "id": "tests:severity",
        "check_id": "severity",
        "label": "Analysis depth",
        "status": "PASS",
        "title": "Analysis selected",
        "summary": "Boundary-scoped analysis selected.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Analysis depth is workload selection, not a risk score.",
        "evidence_ids": []
      },
      {
        "id": "tests:coding_standards",
        "check_id": "coding_standards",
        "label": "Coding standards",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "tests:improper_tests",
        "check_id": "improper_tests",
        "label": "Improper tests",
        "status": "BLOCK",
        "title": "The test only verifies its mock",
        "summary": "Restore an executable invalid-state regression test.",
        "region_ids": [
          "context"
        ],
        "actions": [
          "Request fix",
          "Dispute finding"
        ],
        "details": "The required rejection test must exercise the real cancellation guard.",
        "evidence_ids": [
          "test"
        ]
      },
      {
        "id": "tests:placement",
        "check_id": "placement",
        "label": "Placement and module fit",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "tests:scope",
        "check_id": "scope",
        "label": "Scope and disclosure",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "tests:sabotage",
        "check_id": "sabotage",
        "label": "Security red flags",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      }
    ]
  },
  {
    "id": "stale",
    "title": "Approval belongs to an earlier revision",
    "kind": "illustrative",
    "repository": "microservices-patterns/ftgo-application",
    "declared_intent": "Revise previously reviewed retry budget",
    "verdict": "BLOCK",
    "owner": "@payment-owner",
    "baseline": "fixture:stale:baseline",
    "candidate": "fixture:stale:candidate",
    "policy": {
      "id": "example:stale",
      "version": "fixture-v1",
      "invariant": "An approval applies only to its exact candidate and evidence."
    },
    "regions": {
      "behavior": [
        "Authorize payment",
        "payment.authorize_payment"
      ],
      "context": [
        "Dependencies and tests",
        "Connected source and test evidence"
      ]
    },
    "evidence": [
      {
        "id": "changed-source",
        "label": "PaymentGateway.java::authorize",
        "kind": "source",
        "content": "Illustrative symbol: PaymentGateway.java::authorize\nBefore intent: approved candidate: retry attempts=4\nAfter intent: current candidate: retry attempts=9"
      },
      {
        "id": "relationship",
        "label": "RetryPolicy.java::attempts",
        "kind": "relationship",
        "content": "PaymentGateway.authorize \u2192 RetryPolicy.attempts; review points to prior candidate"
      },
      {
        "id": "test",
        "label": "PaymentRetryTest::attempt_limit",
        "kind": "test",
        "content": "Illustrative test anchor. No test execution is claimed by this fixture."
      }
    ],
    "tiles": [
      {
        "id": "stale:intent_diff",
        "check_id": "intent_diff",
        "label": "Intent differences",
        "status": "WARN",
        "title": "Approval belongs to an earlier revision",
        "summary": "Compare the candidate intent with the accepted baseline.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Confirm intended",
          "Request changes",
          "Dispute comparison"
        ],
        "details": "Illustrative Analysis signals: {\"equivalent\": 0.01, \"different\": 0.98, \"uncertain\": 0.01}",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "before": "approved candidate: retry attempts=4",
        "after": "current candidate: retry attempts=9",
        "judgment": {
          "choice": "different",
          "probabilities": {
            "equivalent": 0.01,
            "different": 0.98,
            "uncertain": 0.01
          }
        }
      },
      {
        "id": "stale:rule_impact",
        "check_id": "rule_impact",
        "label": "Governance-rule impact",
        "status": "BLOCK",
        "title": "Applicable governance",
        "summary": "Stale approval: the current request hash differs from the approved one.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Request exception",
          "Dispute policy match"
        ],
        "details": "An approval applies only to its exact candidate and evidence.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ]
      },
      {
        "id": "stale:connected_evidence",
        "check_id": "connected_evidence",
        "label": "Connected evidence",
        "status": "PASS",
        "title": "Source and relationship trace",
        "summary": "PaymentGateway.authorize \u2192 RetryPolicy.attempts; review points to prior candidate",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Evidence is illustrative; expand source anchors below. Source correspondence is available in this scenario.",
        "evidence_ids": [
          "changed-source",
          "relationship",
          "test"
        ]
      },
      {
        "id": "stale:governance_decision",
        "check_id": "governance_decision",
        "label": "Governance decision",
        "status": "BLOCK",
        "title": "Required check blocks merge",
        "summary": "Rerun analysis and obtain a decision for the new revision.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [
          "Request changes",
          "Escalate"
        ],
        "details": "Baseline unchanged. A response does not clear failed checks or promote a baseline.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "contributing_ids": [
          "stale:intent_diff",
          "stale:rule_impact",
          "stale:connected_evidence"
        ]
      },
      {
        "id": "stale:severity",
        "check_id": "severity",
        "label": "Analysis depth",
        "status": "PASS",
        "title": "Analysis selected",
        "summary": "Boundary-scoped analysis selected.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Analysis depth is workload selection, not a risk score.",
        "evidence_ids": []
      },
      {
        "id": "stale:coding_standards",
        "check_id": "coding_standards",
        "label": "Coding standards",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "stale:improper_tests",
        "check_id": "improper_tests",
        "label": "Improper tests",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "context"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": [
          "test"
        ]
      },
      {
        "id": "stale:placement",
        "check_id": "placement",
        "label": "Placement and module fit",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "stale:scope",
        "check_id": "scope",
        "label": "Scope and disclosure",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "stale:sabotage",
        "check_id": "sabotage",
        "label": "Security red flags",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      }
    ]
  },
  {
    "id": "security",
    "title": "Authorization bypass in a fast path",
    "kind": "illustrative",
    "repository": "microservices-patterns/ftgo-application",
    "declared_intent": "Add cached profile lookup",
    "verdict": "BLOCK",
    "owner": "@consumer-owner",
    "baseline": "fixture:security:baseline",
    "candidate": "fixture:security:candidate",
    "policy": {
      "id": "example:security",
      "version": "fixture-v1",
      "invariant": "Every profile read must enforce consumer ownership."
    },
    "regions": {
      "behavior": [
        "Read profile",
        "consumer.read_profile"
      ],
      "context": [
        "Dependencies and tests",
        "Connected source and test evidence"
      ]
    },
    "evidence": [
      {
        "id": "changed-source",
        "label": "ProfileController.java::get",
        "kind": "source",
        "content": "Illustrative symbol: ProfileController.java::get\nBefore intent: requires principal.consumer_id == requested_id; read profile\nAfter intent: if cached -> return profile; else requires principal.consumer_id == requested_id"
      },
      {
        "id": "relationship",
        "label": "ConsumerAuthorization.java::requireOwner",
        "kind": "relationship",
        "content": "ProfileController.get \u2192 cache.get \u2192 early return bypasses requireOwner"
      },
      {
        "id": "test",
        "label": "ProfileSecurityTest::rejects_other_consumer",
        "kind": "test",
        "content": "Illustrative test anchor. No test execution is claimed by this fixture."
      }
    ],
    "tiles": [
      {
        "id": "security:intent_diff",
        "check_id": "intent_diff",
        "label": "Intent differences",
        "status": "WARN",
        "title": "Authorization bypass in a fast path",
        "summary": "Compare the candidate intent with the accepted baseline.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Confirm intended",
          "Request changes",
          "Dispute comparison"
        ],
        "details": "Illustrative Analysis signals: {\"equivalent\": 0.01, \"different\": 0.98, \"uncertain\": 0.01}",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "before": "requires principal.consumer_id == requested_id; read profile",
        "after": "if cached -> return profile; else requires principal.consumer_id == requested_id",
        "judgment": {
          "choice": "different",
          "probabilities": {
            "equivalent": 0.01,
            "different": 0.98,
            "uncertain": 0.01
          }
        }
      },
      {
        "id": "security:rule_impact",
        "check_id": "rule_impact",
        "label": "Governance-rule impact",
        "status": "BLOCK",
        "title": "Applicable governance",
        "summary": "Violated: the cached path returns before the ownership check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Request exception",
          "Dispute policy match"
        ],
        "details": "Every profile read must enforce consumer ownership.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ]
      },
      {
        "id": "security:connected_evidence",
        "check_id": "connected_evidence",
        "label": "Connected evidence",
        "status": "PASS",
        "title": "Source and relationship trace",
        "summary": "ProfileController.get \u2192 cache.get \u2192 early return bypasses requireOwner",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Evidence is illustrative; expand source anchors below. Source correspondence is available in this scenario.",
        "evidence_ids": [
          "changed-source",
          "relationship",
          "test"
        ]
      },
      {
        "id": "security:governance_decision",
        "check_id": "governance_decision",
        "label": "Governance decision",
        "status": "BLOCK",
        "title": "Required check blocks merge",
        "summary": "Apply ownership validation to both cached and uncached reads.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [
          "Request changes",
          "Escalate"
        ],
        "details": "Baseline unchanged. A response does not clear failed checks or promote a baseline.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "contributing_ids": [
          "security:intent_diff",
          "security:rule_impact",
          "security:connected_evidence",
          "security:sabotage"
        ]
      },
      {
        "id": "security:severity",
        "check_id": "severity",
        "label": "Analysis depth",
        "status": "PASS",
        "title": "Analysis selected",
        "summary": "Boundary-scoped analysis selected.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Analysis depth is workload selection, not a risk score.",
        "evidence_ids": []
      },
      {
        "id": "security:coding_standards",
        "check_id": "coding_standards",
        "label": "Coding standards",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "security:improper_tests",
        "check_id": "improper_tests",
        "label": "Improper tests",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "context"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": [
          "test"
        ]
      },
      {
        "id": "security:placement",
        "check_id": "placement",
        "label": "Placement and module fit",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "security:scope",
        "check_id": "scope",
        "label": "Scope and disclosure",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "security:sabotage",
        "check_id": "sabotage",
        "label": "Security red flags",
        "status": "BLOCK",
        "title": "Cached path bypasses authorization",
        "summary": "Apply ownership validation to both cached and uncached reads.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Request fix",
          "Dispute finding"
        ],
        "details": "Every profile read must enforce consumer ownership.",
        "evidence_ids": [
          "changed-source"
        ]
      }
    ]
  },
  {
    "id": "standards",
    "title": "New endpoint misses the error contract",
    "kind": "illustrative",
    "repository": "microservices-patterns/ftgo-application",
    "declared_intent": "Expose a cancellation endpoint",
    "verdict": "BLOCK",
    "owner": "@orders-owner",
    "baseline": "fixture:standards:baseline",
    "candidate": "fixture:standards:candidate",
    "policy": {
      "id": "example:standards",
      "version": "fixture-v1",
      "invariant": "Public endpoints must use the accepted domain-error response mapping."
    },
    "regions": {
      "behavior": [
        "Http cancel",
        "orders.http_cancel"
      ],
      "context": [
        "Dependencies and tests",
        "Connected source and test evidence"
      ]
    },
    "evidence": [
      {
        "id": "changed-source",
        "label": "OrderController.java::cancel",
        "kind": "source",
        "content": "Illustrative symbol: OrderController.java::cancel\nBefore intent: POST cancel -> domain error mapped to HTTP 409\nAfter intent: POST cancel -> domain error becomes HTTP 500"
      },
      {
        "id": "relationship",
        "label": "ApiExceptionHandler.java::translate",
        "kind": "relationship",
        "content": "OrderController.cancel \u2192 Order.cancel throws InvalidState \u2192 generic HTTP 500"
      },
      {
        "id": "test",
        "label": "OrderHttpTest::invalid_state_returns_409",
        "kind": "test",
        "content": "Illustrative test anchor. No test execution is claimed by this fixture."
      }
    ],
    "tiles": [
      {
        "id": "standards:intent_diff",
        "check_id": "intent_diff",
        "label": "Intent differences",
        "status": "WARN",
        "title": "New endpoint misses the error contract",
        "summary": "Compare the candidate intent with the accepted baseline.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Confirm intended",
          "Request changes",
          "Dispute comparison"
        ],
        "details": "Illustrative Analysis signals: {\"equivalent\": 0.02, \"different\": 0.96, \"uncertain\": 0.02}",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "before": "POST cancel -> domain error mapped to HTTP 409",
        "after": "POST cancel -> domain error becomes HTTP 500",
        "judgment": {
          "choice": "different",
          "probabilities": {
            "equivalent": 0.02,
            "different": 0.96,
            "uncertain": 0.02
          }
        }
      },
      {
        "id": "standards:rule_impact",
        "check_id": "rule_impact",
        "label": "Governance-rule impact",
        "status": "BLOCK",
        "title": "Applicable governance",
        "summary": "Violated: the new handler omits the standard error translator.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Request exception",
          "Dispute policy match"
        ],
        "details": "Public endpoints must use the accepted domain-error response mapping.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ]
      },
      {
        "id": "standards:connected_evidence",
        "check_id": "connected_evidence",
        "label": "Connected evidence",
        "status": "PASS",
        "title": "Source and relationship trace",
        "summary": "OrderController.cancel \u2192 Order.cancel throws InvalidState \u2192 generic HTTP 500",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Evidence is illustrative; expand source anchors below. Source correspondence is available in this scenario.",
        "evidence_ids": [
          "changed-source",
          "relationship",
          "test"
        ]
      },
      {
        "id": "standards:governance_decision",
        "check_id": "governance_decision",
        "label": "Governance decision",
        "status": "BLOCK",
        "title": "Required check blocks merge",
        "summary": "Apply the standard domain-error mapping and rerun contract tests.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [
          "Request changes",
          "Escalate"
        ],
        "details": "Baseline unchanged. A response does not clear failed checks or promote a baseline.",
        "evidence_ids": [
          "changed-source",
          "relationship"
        ],
        "contributing_ids": [
          "standards:intent_diff",
          "standards:rule_impact",
          "standards:connected_evidence",
          "standards:coding_standards"
        ]
      },
      {
        "id": "standards:severity",
        "check_id": "severity",
        "label": "Analysis depth",
        "status": "PASS",
        "title": "Analysis selected",
        "summary": "Boundary-scoped analysis selected.",
        "region_ids": [
          "behavior",
          "context"
        ],
        "actions": [],
        "details": "Analysis depth is workload selection, not a risk score.",
        "evidence_ids": []
      },
      {
        "id": "standards:coding_standards",
        "check_id": "coding_standards",
        "label": "Coding standards",
        "status": "BLOCK",
        "title": "Error translation standard violated",
        "summary": "Apply the standard domain-error mapping and rerun contract tests.",
        "region_ids": [
          "behavior"
        ],
        "actions": [
          "Request fix",
          "Dispute finding"
        ],
        "details": "Public endpoints must use the accepted domain-error response mapping.",
        "evidence_ids": [
          "changed-source"
        ]
      },
      {
        "id": "standards:improper_tests",
        "check_id": "improper_tests",
        "label": "Improper tests",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "context"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": [
          "test"
        ]
      },
      {
        "id": "standards:placement",
        "check_id": "placement",
        "label": "Placement and module fit",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "standards:scope",
        "check_id": "scope",
        "label": "Scope and disclosure",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      },
      {
        "id": "standards:sabotage",
        "check_id": "sabotage",
        "label": "Security red flags",
        "status": "NOT_RUN",
        "title": "No result supplied",
        "summary": "This fixture supplies no result for this independent check.",
        "region_ids": [
          "behavior"
        ],
        "actions": [],
        "details": "Absence of a result is not a pass. Requiredness is configured per repository.",
        "evidence_ids": []
      }
    ]
  }
];
