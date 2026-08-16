// Import the OpenAI SDK.
const OpenAI = require("openai");

// Create the OpenAI client.
const client = new OpenAI();

// Define the exact structure the model must return.
const decisionSchema = {
  type: "object",

  properties: {
    // True when the goal has been completed.
    done: {
      type: "boolean",
    },

    // A short explanation of the decision.
    reason: {
      type: "string",
    },

    // The next browser action.
    action: {
      type: "object",

      properties: {
        // "none" is used when the goal is complete.
        type: {
          type: "string",
          enum: [
            "fill",
            "click",
            "wait",
            "none",
          ],
        },

        // The control the action should use.
        target: {
          type: "object",

          properties: {
            role: {
              type: ["string", "null"],
            },

            name: {
              type: ["string", "null"],
            },
          },

          required: [
            "role",
            "name",
          ],

          additionalProperties: false,
        },

        // Used by fill actions.
        value: {
          type: ["string", "null"],
        },
      },

      required: [
        "type",
        "target",
        "value",
      ],

      additionalProperties: false,
    },

    // The extracted result when the goal is complete.
    output: {
      type: ["string", "null"],
    },
  },

  required: [
    "done",
    "reason",
    "action",
    "output",
  ],

  additionalProperties: false,
};

// Ask the LLM to choose one browser action.
async function decideNextAction({
  goal,
  observation,
  history,
}) {
  // Build the prompt using the current state.
  const prompt = `
You are controlling a banking application through a browser.

Goal:
${goal}

Current page observation:
${JSON.stringify(observation, null, 2)}

Previous decisions:
${JSON.stringify(history, null, 2)}

Choose exactly one next action.

Rules:
1. Use only controls listed in the observation.
2. Use the exact role and name from the observation.
3. Use "fill" to enter text.
4. Use "click" to press a button or link.
5. Use "wait" only when the page appears to be loading.
6. Set done to true only when the requested result is visible.
7. When done is true, use action type "none".
8. When done is true, put the requested visible result in output.
9. Never invent a control that is not in the observation.
10. Do not navigate to another website.
`;

  // Send the prompt using the Responses API.
  const response =
    await client.responses.create({
      model: "gpt-5.6",

      input: prompt,

      // Require the response to match our schema.
      text: {
        format: {
          type: "json_schema",
          name: "browser_decision",
          strict: true,
          schema: decisionSchema,
        },
      },

      // Do not store the API response.
      store: false,
    });

  // Convert the JSON response text into an object.
  const decision = JSON.parse(
    response.output_text
  );

  return decision;
}

// Export the decision function.
module.exports = {
  decideNextAction,
};
