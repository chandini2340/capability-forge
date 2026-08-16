// Import Node.js test utilities.
const test = require("node:test");
const assert = require("node:assert/strict");

// Import the capability compiler.
const {
  compileCapability,
} = require("../src/compiler");

test(
  "compiler replaces the discovered member ID with a parameter",
  () => {
    // Simulate a successful discovery history.
    const history = [
      {
        reason:
          "Enter the member number.",

        action: {
          type: "fill",

          target: {
            role: "textbox",
            name: "Member Number",
          },

          value: "12345",
        },
      },

      {
        reason:
          "Submit the member search.",

        action: {
          type: "click",

          target: {
            role: "button",
            name: "Find Member",
          },

          value: null,
        },
      },
    ];

    // Compile the discovery into an artifact.
    const capability =
      compileCapability({
        goal: "Read a savings balance",
        entrypoint:
          "http://127.0.0.1:4173/legacy/search",
        history: history,
      });

    // Check that the real member ID was removed.
    assert.equal(
      capability.steps[0].action.value,
      "{{memberId}}"
    );

    assert.equal(
      JSON.stringify(capability).includes(
        '"value":"12345"'
      ),
      false
    );

    // New discoveries must require review.
    assert.equal(
      capability.approvalState,
      "draft"
    );
  }
);