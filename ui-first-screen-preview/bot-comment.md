## Semantic review

> **Changes requested**
>
> 3 actionable findings and 1 FYI. Required test evidence is insufficient.

### Walkthrough

This PR changes **loan repayment** and the **lending API**. The declared intent is a refactor with no behavior changes. The review found a behavior delta that needs confirmation.

**3 actionable findings** · 1 informational note · 3 files reviewed

| Review finding | Evidence | Next step |
| --- | --- | --- |
| **⚠ Undisclosed change** — replay skips account validation | `LoanWritePlatformService.java:184` | Restore the guard or confirm intent with @lending-owner |
| **⚠ Placement / module fit** — fee policy moved into the API | `LoansApiResource.java:96` | Move the calculation or get both owners’ confirmation |
| **❌ Improper tests** — assertion verifies the mocked result | `LoanRepaymentTest.java:71` | Add a regression test for inactive-loan rejection |

<details>
<summary>File walkthrough</summary>

| File | Change |
| --- | --- |
| `LoanWritePlatformService.java` | Replay branch bypasses the account-status guard. |
| `LoansApiResource.java` | Repayment fee calculation added to request handling. |
| `LoanRepaymentTest.java` | New success assertion uses a stubbed service result. |

</details>

<details>
<summary>Informational note · no response required</summary>

**SR-API-002:** confirm that response formatting remains at the API boundary. Sample confidence: 0.64; this is an FYI, not a merge block.

</details>

**[Open CodeIntent review →](./?view=checks&from=github)**

Inspect the live gate results, source evidence, and owner decisions in the full review.

---

Updated for commit `7c4e9b1` · [View check details](./?view=checks&from=github)

<!-- Sample payload. Replace relative demo links with absolute hosted URLs when posting to GitHub. -->
