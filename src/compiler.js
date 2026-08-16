// Convert a successful discovery history
// into a reusable capability artifact.
function compileCapability({
  goal,
  entrypoint,
  history,
}) {
  // Convert model decisions into replay steps.
  const steps = history.map(
    (decision, stepIndex) => {
      // Copy the discovered action.
      const action = {
        type: decision.action.type,
        risk: "reversible",
        target: {
          role: decision.action.target.role,
          name: decision.action.target.name,
        },
      };

      // Replace the concrete member ID with
      // a reusable input placeholder.
      if (decision.action.type === "fill") {
        action.value = "{{memberId}}";
      }

      // Create a postcondition for each step.
      let postcondition;

      if (decision.action.type === "fill") {
        postcondition = {
          kind: "visible",
          target: {
            role: "button",
            name: "Find Member",
          },
        };
      }

      if (decision.action.type === "click") {
        postcondition = {
          kind: "visible",
          target: {
            text: "Member loaded",
          },
        };
      }

      return {
        id: `discovered_step_${stepIndex + 1}`,
        description: decision.reason.replace(
  /\b\d{5}\b/g,
  "[REDACTED_MEMBER_ID]"
),
        action: action,
        postcondition: postcondition,
      };
    }
  );

  // Return the completed capability.
  return {
    schemaVersion: "1.0",

    id:
      "corepro.member.read_savings_balance",

    version: "1.0.0",

    title:
      "Read a member savings balance",

    description:
      "Looks up a member and returns the current savings balance.",

    // A discovered artifact should be reviewed
    // before unattended production use.
    approvalState: "draft",

    provenance: {
  source: "llm_discovery",

  recordedAt:
    new Date().toISOString(),

  // Store a generalized purpose, not the
  // concrete goal containing a member ID.
  goal:
    "Look up a member and read the current savings balance",
},

    target: {
      surface: "web",
      entrypoint: entrypoint,
    },

    contract: {
      inputs: {
        memberId: {
          type: "string",
          required: true,
          pattern: "^[0-9]{5}$",
          sensitive: true,
        },
      },

      outputs: {
        balance: {
          type: "number",
          sensitive: true,

          target: {
            css:
              "[aria-label='Savings balance']",
          },

          transform: "currency",
        },
      },
    },

    steps: steps,

    checkpoint: {
      kind: "visible",

      target: {
        text: "Member loaded",
      },
    },

    businessOutcomes: [
      {
        code: "MEMBER_NOT_FOUND",

        message:
          "No member exists for the supplied identifier",

        condition: {
          kind: "visible",

          target: {
            text: "Member not found",
          },
        },
      },
    ],

    locatorStrategy: {
      primary:
        "accessibility role and accessible name",

      fallback:
        "semantic CSS selector",

      reason:
        "Semantic locators are more stable than DOM position-based selectors.",
    },
  };
}

// Export the compiler.
module.exports = {
  compileCapability,
};