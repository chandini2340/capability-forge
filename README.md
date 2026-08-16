# Capability Forge

Capability Forge is a computer-use automation system that converts one successful LLM-driven browser session into a typed, reviewable capability that can replay deterministically without an LLM.

The demonstration uses a local legacy-style banking application. An LLM discovers how to search for a fictional member and read a savings balance. The successful interaction is compiled into a parameterized JSON artifact. The replay engine can then invoke that artifact with different member IDs without calling the model.

## Core flow

1. A user supplies a natural-language goal.
2. Playwright observes the current application state.
3. An LLM chooses one structured action.
4. Policy validates the action before execution.
5. The observe, decide, and act loop continues until the goal is complete.
6. The successful history is compiled into a reusable capability.
7. A human reviews and approves the generated artifact.
8. Replay executes the artifact deterministically without an LLM.
9. Replay returns success, a known business outcome, an escalation, or a technical failure.

## Implemented requirements

- Genuine LLM-driven browser discovery
- Bounded observe, decide, and act loop
- Structured Outputs for model decisions
- Versioned and parameterized capability artifacts
- Formal JSON Schema validation
- Deterministic replay without an LLM
- Typed invocation inputs and extracted outputs
- Accessibility-first element targeting
- Step postconditions and final checkpoints
- Known business-outcome handling
- Technical-failure evidence
- Domain, route, and action allowlists
- Risk classification and approval enforcement
- Same-session human control transfer
- Structured JSONL evidence
- Screenshots for discovery, replay, failure, and handoff
- Sensitive-data and secret redaction
- Automated tests for core guarantees

## Requirements

- Node.js 20 or newer
- npm
- Chromium installed through Playwright
- An OpenAI API key for discovery only
- API billing or credits for one genuine discovery run

Deterministic replay does not require an API key.

## Installation

Clone the repository and enter the project:

```bash
git clone YOUR_REPOSITORY_URL
cd capability-forge
```

Install dependencies:

```bash
npm install
```

Install the Playwright Chromium browser:

```bash
npx playwright install chromium
```

## API configuration

Create an OpenAI API key and store it as an environment variable.

### Windows PowerShell

```powershell
setx OPENAI_API_KEY "your-api-key"
```

Open a new terminal after setting the variable.

### macOS or Linux

```bash
export OPENAI_API_KEY="your-api-key"
```

Never place the API key in source code, artifacts, logs, screenshots, or committed environment files.

Test the connection:

```bash
node src/test-openai.js
```

Expected output:

```text
OpenAI connection works
```

## Run the local application

Start the fictional legacy banking application:

```bash
npm run app
```

The application is available at:

```text
http://127.0.0.1:4173/legacy/search
```

Fictional demonstration records:

| Member ID | Member | Savings balance |
|---|---|---:|
| 12345 | Alex Rivera | $2,847.19 |
| 90001 | Jamie Chen | $152.06 |
| Any other five-digit ID | Member not found | N/A |

The sample records are fictional and must never be replaced with real customer data.

## Run LLM discovery

Keep the local application running in the first terminal.

In a second terminal:

```bash
npm run discover
```

The discovery process:

1. Observes the page.
2. Sends a compact page representation and goal to the LLM.
3. Receives one schema-constrained decision.
4. Applies policy checks.
5. Executes the action through Playwright.
6. Repeats until the goal is complete.
7. Generates a draft capability.

Generated artifact:

```text
artifacts/discovered-member-balance.v1.json
```

Discovery evidence is written to a unique directory under:

```text
evidence/run-<run-id>/
```

Generated artifacts default to:

```json
"approvalState": "draft"
```

Review the steps, input contract, output contract, locators, checkpoint, business outcomes, and data handling before changing the state to:

```json
"approvalState": "approved"
```

## Validate an artifact

Validate the generated capability against the formal JSON Schema:

```bash
node src/validate-artifact.js artifacts/discovered-member-balance.v1.json
```

Expected output:

```text
Artifact is valid.
```

## Deterministic replay

Replay the generated capability with a different member ID:

```bash
node src/replay.js 90001 artifacts/discovered-member-balance.v1.json
```

Expected result:

```json
{
  "status": "success",
  "capability": {
    "id": "corepro.member.read_savings_balance",
    "version": "1.0.0"
  },
  "outputs": {
    "balance": 152.06
  }
}
```

Replay reads all actions, locators, postconditions, outputs, and checkpoints from the artifact. It does not import the OpenAI SDK or call an LLM.

To demonstrate this, remove the API key from the current terminal before replay.

### Windows PowerShell

```powershell
$env:OPENAI_API_KEY = $null
node src/replay.js 90001 artifacts/discovered-member-balance.v1.json
```

### macOS or Linux

```bash
unset OPENAI_API_KEY
node src/replay.js 90001 artifacts/discovered-member-balance.v1.json
```

Replay should still succeed.

## Business-outcome demonstration

Run replay with an unknown fictional member:

```bash
node src/replay.js 77777 artifacts/discovered-member-balance.v1.json
```

Expected result:

```json
{
  "status": "business_outcome",
  "outcome": {
    "code": "MEMBER_NOT_FOUND",
    "message": "No member exists for the supplied identifier"
  }
}
```

`MEMBER_NOT_FOUND` is a valid business result, not a software crash.

## Human-handoff demonstration

To demonstrate human approval:

1. Open `artifacts/discovered-member-balance.v1.json`.
2. Find `discovered_step_2`.
3. Change its risk from `reversible` to `irreversible`.
4. Run replay:

```bash
node src/replay.js 90001 artifacts/discovered-member-balance.v1.json
```

When replay pauses:

1. Use the open Playwright browser.
2. Manually click **Find Member**.
3. Return to the terminal.
4. Press Enter.

Automation verifies the postcondition and continues in the same browser session.

After the demonstration, restore the step risk to `reversible`.

## Run tests

```bash
npm test
```

The tests verify:

- Capability parameterization
- Removal of concrete member values
- Artifact approval defaults
- Allowed and blocked navigation
- Human approval for irreversible actions
- Draft capability rejection
- JSON Schema validation
- Invalid action rejection

## Result categories

Replay returns one of the following categories:

### Success

```json
{
  "status": "success",
  "outputs": {}
}
```

### Business outcome

```json
{
  "status": "business_outcome",
  "outcome": {
    "code": "MEMBER_NOT_FOUND",
    "message": "No member exists for the supplied identifier"
  }
}
```

### Failure

```json
{
  "status": "failure",
  "error": {
    "code": "TimeoutError",
    "message": "Expected control was not found",
    "step": {
      "index": 1,
      "id": "submit_lookup"
    }
  }
}
```

### Human intervention

Control-transfer events are written to evidence while the live process pauses. After the human completes the manual action, control returns to automation.

## Safety model

The policy configuration is stored in:

```text
config/policy.json
```

It controls:

- Allowed origins
- Allowed route prefixes
- Allowed action types
- Maximum capability steps
- Treatment of irreversible actions

Every discovery and replay action is checked before execution.

Artifacts generated by discovery are drafts. Unapproved artifacts cannot replay unattended.

Sensitive member identifiers, balances, credentials, tokens, account-number patterns, and Social Security-number patterns are excluded or redacted from persisted evidence.

## Evidence

Sanitized submission evidence is available under:

```text
evidence/submission/
```

It contains:

- Genuine LLM discovery
- Generated capability
- Deterministic replay
- Known business outcome
- Technical failure
- Same-session human handoff

See:

```text
evidence/README.md
```

for details.

## Project structure

```text
capability-forge/
├── artifacts/
│   ├── member-balance.v1.json
│   └── discovered-member-balance.v1.json
├── config/
│   └── policy.json
├── evidence/
│   ├── submission/
│   └── README.md
├── schemas/
│   └── capability.schema.json
├── src/
│   ├── app/
│   │   └── server.js
│   ├── artifact-validator.js
│   ├── compiler.js
│   ├── discovery.js
│   ├── handoff.js
│   ├── logger.js
│   ├── observe.js
│   ├── planner.js
│   ├── policy.js
│   ├── replay.js
│   └── validate-artifact.js
├── tests/
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── REPORT.md
```

## Design report

The architecture, artifact design, error taxonomy, multi-tenant strategy, human handoff, safety model, and deliberate cuts are documented in:

```text
REPORT.md
```

## Limitations

This is a focused vertical slice rather than a production platform.

- The demonstration implements a web surface adapter.
- The local application represents a legacy banking interface.
- Desktop automation is described but not implemented.
- Artifact compilation is specialized to the demonstrated capability.
- The human operator interface is terminal-based.
- Artifacts and evidence use local storage rather than durable services.
- Authentication and browser-session infrastructure are outside the demonstration scope.