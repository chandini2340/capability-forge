// Import Node.js testing utilities.
const test = require("node:test");
const assert = require("node:assert/strict");

// Import policy functions and errors.
const {
  authorizeNavigation,
  authorizeAction,
  authorizeCapability,
  PolicyViolationError,
  HumanApprovalRequiredError,
} = require("../src/policy");

test(
  "policy allows the approved local application",
  () => {
    assert.doesNotThrow(() => {
      authorizeNavigation(
        "http://127.0.0.1:4173/legacy/search"
      );
    });
  }
);

test(
  "policy blocks an unauthorized website",
  () => {
    assert.throws(
      () => {
        authorizeNavigation(
          "https://example.com"
        );
      },
      PolicyViolationError
    );
  }
);

test(
  "policy requires a human for irreversible actions",
  () => {
    assert.throws(
      () => {
        authorizeAction({
          type: "click",
          risk: "irreversible",
        });
      },
      HumanApprovalRequiredError
    );
  }
);

test(
  "policy blocks draft capabilities",
  () => {
    assert.throws(
      () => {
        authorizeCapability({
          approvalState: "draft",
          steps: [],
        });
      },
      PolicyViolationError
    );
  }
);