# Evidence

This directory contains sanitized evidence from the complete computer-use automation workflow. All member records and financial values belong to the local fictional demonstration application.

## discovery

Contains evidence from a genuine LLM-driven browser session.

- `events.jsonl` records the observe, decide, and act loop.
- `discovery-success.png` shows the completed goal.
- `capability.json` is the parameterized artifact generated from the successful run.

The LLM selected the controls and actions. Concrete member identifiers and financial outputs were redacted from persisted evidence.

## replay-success

Contains evidence from deterministic replay using a different member input.

- `events.jsonl` records the artifact-driven steps.
- `success.png` shows the completed replay.

The OpenAI API key was removed from the active terminal before this run, proving that replay did not use an LLM.

## business-outcome

Demonstrates an expected domain result rather than a technical crash.

- `events.jsonl` records the `MEMBER_NOT_FOUND` outcome.
- `business-outcome.png` shows the application response.

## technical-failure

Demonstrates failure reporting when a declared control cannot be found.

- `events.jsonl` identifies the failed step.
- `failure.png` captures the application state at failure time.

The result contains the error category, step index, step ID, and current URL.

## human-handoff

Demonstrates same-session human intervention.

- `handoff-before.png` shows the session when automation paused.
- `handoff-after.png` shows the state after manual action.
- `success.png` shows successful completion after control returned.
- `events.jsonl` records control transfer, human action, control return, and final success.

The human operated the same live Playwright browser session used by automation.

## Data handling

Sensitive input values, balances, secrets, and member identifiers are excluded or replaced with redaction markers. No real credentials, customer data, or personally identifiable information were used.