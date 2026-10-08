import tempfile
import unittest
from pathlib import Path

import intent_impact as impact

HANDLER = """package p;
public class AccountingServiceCommandHandler {
  public CommandHandlers commandHandlers() {
    return SagaCommandHandlersBuilder
            .onMessage(AuthorizeCommand.class, this::authorize)
            .onMessage(CancelCreateTicket.class, this::cancelCreateTicket)
            .build();
  }

  public void authorize(CommandMessage<AuthorizeCommand> cm) {
    AuthorizeCommand command = cm.getCommand();
    accountRepository.update(Long.toString(command.getConsumerId()),
            makeAuthorizeCommandInternal(command));
  }

  private Message cancelCreateTicket
          (CommandMessage<CancelCreateTicket> cm) {
    kitchenService.cancelCreateTicket(cm.getCommand().getTicketId());
    return withSuccess();
  }
}
"""
PROXY = """package p;
public class KitchenServiceProxy {
  public final CommandEndpoint<CancelCreateTicket> cancel = CommandEndpointBuilder
          .forCommand(CancelCreateTicket.class)
          .build();
}
"""
STATE = """package p;
class CreateOrderSagaState {
  AuthorizeCommand makeAuthorizeCommand() {
    return new AuthorizeCommand().withConsumerId(getOrderId());
  }
}
"""
SAGA_PATH = "ftgo-order-service/src/main/java/p/CreateOrderSaga.java"
PATCH = f"""diff --git a/{SAGA_PATH} b/{SAGA_PATH}
--- a/{SAGA_PATH}
+++ b/{SAGA_PATH}
@@ -24,4 +24,3 @@ public class CreateOrderSaga {{
               .invokeParticipant(kitchenService.create, CreateOrderSagaState::makeCreateTicketCommand)
-              .withCompensation(kitchenService.cancel, CreateOrderSagaState::makeCancelCreateTicketCommand)
             .step()
"""


class IntentImpactTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self.tmp.name)
        for path, text in {"ftgo-accounting-service/src/main/java/p/AccountingServiceCommandHandler.java": HANDLER,
                           "ftgo-order-service/src/main/java/p/KitchenServiceProxy.java": PROXY,
                           "ftgo-order-service/src/main/java/p/CreateOrderSagaState.java": STATE}.items():
            (self.repo / path).parent.mkdir(parents=True, exist_ok=True)
            (self.repo / path).write_text(text)

    def tearDown(self):
        self.tmp.cleanup()

    def test_command_value_lands_on_the_registered_handler_line_that_reads_it(self):
        link = impact._command_value_link(self.repo, {"slots": {"slot": "withConsumerId", "value": "getOrderId()"}},
                                          "    return new AuthorizeCommand().withConsumerId(getOrderId());")
        self.assertEqual("AccountingServiceCommandHandler.authorize", link["label"])
        self.assertEqual(12, link["anchor"])
        self.assertIn("getConsumerId()", link["lines"][link["anchor"] - link["start"]])

    def test_removed_compensation_lands_on_its_command_handler(self):
        link = impact._saga_compensation_link(self.repo, {"slots": {"participant": "kitchenService.cancel"}})
        self.assertEqual("AccountingServiceCommandHandler.cancelCreateTicket", link["label"])
        self.assertIn("CancelCreateTicket", link["note"])

    def test_deleted_line_is_located_in_the_old_file(self):
        section = impact._patch_sections(PATCH)[SAGA_PATH]
        self.assertEqual(25, impact._deleted_line(section, "cancel"))

    def test_sentences_are_filled_from_fact_slots(self):
        before = {"slots": {"allowed": ["ACCEPTED"], "writes": []}}
        after = {"slots": {"allowed": ["ACCEPTED", "PREPARING"], "writes": ["this.state=TicketState.ACCEPTED"]}}
        text = impact.sentence("state_transition", before, after)
        self.assertIn("allowed from <b>PREPARING</b>", text)
        self.assertIn("this.state=ACCEPTED", text)
        self.assertIn("compensates with <code>kitchenService.cancel</code>",
                      impact.sentence("saga_withCompensation", {"slots": {"participant": "kitchenService.cancel"}}, None))

    def test_removed_and_unknown_facts_still_get_specific_sentences(self):
        removed = impact.sentence("boundary_call", {"slots": {"receiver": "m1", "operation": "add"}}, None)
        self.assertIn("<code>m1.add</code> was removed", removed)
        self.assertEqual("A governed rest endpoint was added.", impact.sentence("rest_endpoint", None, {"slots": {}}))

    def test_intended_comes_from_the_catalog_question(self):
        self.assertEqual("Preserve the governed command field and its value provenance.",
                         impact.intended("Does the candidate preserve the governed command field and its value provenance?"))

    def test_service_and_method_labels(self):
        self.assertEqual("Order history", impact.service_name("ftgo-order-history-service/src/x.java"))
        self.assertEqual("Kitchen service", impact.service_name("ftgo-kitchen-service/src/x.java"))
        self.assertEqual("CreateOrderSaga definition", impact.method_label("p.CreateOrderSaga#<init>/4"))


class UnjudgedChangeTests(unittest.TestCase):
    def test_boundary_change_without_a_question_keeps_its_recorded_facts_and_stays_unjudged(self):
        flow = {"id": "boundary-impact:1", "change_kind": "governed_boundary_change", "title": "FTGO-AGGREGATE-STATE",
                "method": "p.Order#rejectRevision/0", "findings": [{"reason": "judgment_not_supplied"}],
                "fact_source_anchors": {"before": [{"file": "svc/Order.java", "line": 162, "form": "state_transition"}], "after": []},
                "observed_deltas": [{"kind": "normalized_boundary_fact", "fields": {"fact": {"after": None, "before": [
                    'state_transition {"allowed":["REVISION_PENDING"],"writes":["this.state=APPROVED"]}']}}}]}
        judged = {"id": "boundary-impact:2", "change_kind": "governed_boundary_change", "title": "X", "method": "p.Saga#make/0"}
        [row] = impact.unjudged_changes({"flows": [flow, judged]}, {("Saga.make()", "X")})
        self.assertEqual(("FTGO-AGGREGATE-STATE", "state_transition", "Order.rejectRevision()"),
                         (row["boundary_id"], row["form"], row["method"]))
        self.assertEqual({"file": "svc/Order.java", "line": 162, "side": "before"}, row["changed"])
        self.assertEqual([{"allowed": ["REVISION_PENDING"], "writes": ["this.state=APPROVED"]}], row["before"])
        self.assertEqual(([], ["judgment_not_supplied"]), (row["after"], row["reasons"]))
        self.assertNotIn("verdict", row)

    def test_question_for_one_boundary_does_not_hide_another_boundary_in_the_same_method(self):
        flow = {"id": "boundary-impact:1", "change_kind": "governed_boundary_change",
                "title": "FTGO-STATE", "method": "p.Order#revise/0"}
        [row] = impact.unjudged_changes({"flows": [flow]}, {("Order.revise()", "FTGO-COMMAND")})
        self.assertEqual("FTGO-STATE", row["boundary_id"])

    def test_complementary_facts_for_the_same_boundary_and_method_become_one_diff(self):
        common = {"change_kind": "governed_boundary_change", "title": "FTGO-STATE",
                  "method": "p.Ticket#accept/0", "findings": []}
        before = {**common, "id": "before", "fact_source_anchors": {"before": [{"file": "Ticket.java", "line": 7}]},
                  "observed_deltas": [{"fields": {"fact": {"before": ['state_transition {"allowed":["PENDING"],"writes":[]}']}}}]}
        after = {**common, "id": "after", "fact_source_anchors": {"after": [{"file": "Ticket.java", "line": 8}]},
                 "observed_deltas": [{"fields": {"fact": {"after": ['state_transition {"allowed":["PENDING"],"writes":["this.state=ACCEPTED"]}']}}}]}
        [row] = impact.unjudged_changes({"flows": [before, after]}, set())
        self.assertEqual(("before+after", "PENDING", 8),
                         (row["flow_id"], row["before"][0]["allowed"][0], row["changed"]["line"]))
        self.assertEqual(["this.state=ACCEPTED"], row["after"][0]["writes"])

    def test_state_transition_anchors_on_the_changed_write_instead_of_the_switch(self):
        rows = [{"id": "before", "change_kind": "governed_boundary_change", "title": "FTGO-STATE",
                 "method": "p.Ticket#accept/0", "findings": [],
                 "fact_source_anchors": {"before": [{"file": "Ticket.java", "line": 10}]},
                 "observed_deltas": [{"fields": {"fact": {"before": [
                     'state_transition {"allowed":["PENDING"],"writes":[]}']}}}]},
                {"id": "after", "change_kind": "governed_boundary_change", "title": "FTGO-STATE",
                 "method": "p.Ticket#accept/0", "findings": [],
                 "fact_source_anchors": {"after": [{"file": "Ticket.java", "line": 10}]},
                 "observed_deltas": [{"fields": {"fact": {"after": [
                     'state_transition {"allowed":["PENDING"],"writes":["this.state=ACCEPTED"]}']}}}]}]
        patch = "@@ -10,2 +10,3 @@\n switch (state) {\n+  this.state = TicketState.ACCEPTED;\n }\n"
        [row] = impact.unjudged_changes({"flows": rows}, set(), {"Ticket.java": patch})
        self.assertEqual({"file": "Ticket.java", "line": 11, "side": "after"}, row["changed"])


class CompactionTests(unittest.TestCase):
    def test_noise_keeps_flow_and_source_but_drops_repeated_ancestry(self):
        view = {"flows": [{"id": "a", "change_kind": "file_changed_without_method_delta", "potential_impact": [{"id": "application"}]},
                          {"id": "b", "change_kind": "source_changed", "potential_impact": [{"id": "application"}]}],
                "graph": {"nodes": [{"id": "episode:a", "kind": "change"}, {"id": "scope:application", "kind": "scope"},
                                    {"id": "scope:only-a", "kind": "scope"}],
                          "edges": [{"from": "source:x", "to": "episode:a", "kind": "source_of_change"},
                                    {"from": "episode:a", "to": "scope:only-a", "kind": "potential_impact"},
                                    {"from": "episode:b", "to": "scope:application", "kind": "potential_impact"}]}}
        record = impact.compact_noise(view)
        self.assertEqual((1, 1), (record["noise_flows"], record["dropped_ancestry_edges"]))
        self.assertEqual([], view["flows"][0]["potential_impact"])
        self.assertEqual([{"id": "application"}], view["flows"][1]["potential_impact"])
        self.assertIn("source_of_change", [e["kind"] for e in view["graph"]["edges"]])
        self.assertNotIn("scope:only-a", [n["id"] for n in view["graph"]["nodes"]])


if __name__ == "__main__":
    unittest.main()
