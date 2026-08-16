const path = require("path");

const {
  logEvent,
  getRunDirectory,
  runId,
} = require("./logger");

// Import the file-system module.
const fs = require("fs");

// Import Playwright.
const { chromium } = require("playwright");

// Import policy-enforcement functions.
const {
  authorizeNavigation,
  authorizeAction,
  authorizeCapability,
  HumanApprovalRequiredError,
} = require("./policy");

// Import same-session human handoff.
const {
  requestHumanIntervention,
} = require("./handoff");

// Read the member ID from the command.
const memberId = process.argv[2];

// Read an optional artifact path from the command.
//
// If no path is provided, use the original artifact.
const artifactPath =
  process.argv[3] ||
  "./artifacts/member-balance.v1.json";

// Load the capability artifact.
const artifactText = fs.readFileSync(
  artifactPath,
  "utf8"
);

// Convert the JSON text into a JavaScript object.
const artifact = JSON.parse(artifactText);

// Store invocation inputs in an object.
const inputs = {
  memberId: memberId,
};

// Import formal artifact validation.
const {
  validateArtifact,
} = require("./artifact-validator");

// Replace placeholders such as {{memberId}} with runtime values.
function replaceParameters(value) {
  // Return non-string values without changing them.
  if (typeof value !== "string") {
    return value;
  }

  // Find every {{parameterName}} placeholder.
  return value.replace(
    /\{\{([a-zA-Z0-9_]+)\}\}/g,
    (placeholder, parameterName) => {
      // Make sure the required parameter exists.
      if (!(parameterName in inputs)) {
        throw new Error(
          `Missing input parameter: ${parameterName}`
        );
      }

      // Replace the placeholder with its runtime value.
      return String(inputs[parameterName]);
    }
  );
}

// Validate inputs using the artifact's input contract.
function validateInputs() {
  // Read all declared input fields.
  const inputDefinitions = artifact.contract.inputs;

  // Examine every declared input.
  for (const [inputName, rules] of Object.entries(
    inputDefinitions
  )) {
    const value = inputs[inputName];

    // Check required fields.
    if (
      rules.required &&
      (value === undefined || value === "")
    ) {
      throw new Error(
        `Required input is missing: ${inputName}`
      );
    }

    // Check the declared data type.
    if (
      value !== undefined &&
      rules.type === "string" &&
      typeof value !== "string"
    ) {
      throw new Error(
        `Input ${inputName} must be a string`
      );
    }

    // Check the declared pattern.
    if (
      value !== undefined &&
      rules.pattern &&
      !new RegExp(rules.pattern).test(value)
    ) {
      throw new Error(
        `Input ${inputName} has an invalid format`
      );
    }
  }
}

// Convert an artifact target into a Playwright locator.
function createLocator(page, target) {
  // Prefer accessibility role and name.
  if (target.role && target.name) {
    return page.getByRole(target.role, {
      name: replaceParameters(target.name),
      exact: true,
    });
  }

  // Use visible text when declared.
  if (target.text) {
    return page.getByText(
      replaceParameters(target.text),
      {
        exact: true,
      }
    );
  }

  // Use CSS as a fallback.
  if (target.css) {
    return page.locator(target.css);
  }

  throw new Error(
    "The artifact target does not contain a supported locator"
  );
}

// Execute one artifact action.
async function executeAction(page, action) {
  console.log(`Executing action: ${action.type}`);

  // Fill a textbox.
  if (action.type === "fill") {
    const locator = createLocator(page, action.target);
    const value = replaceParameters(action.value);

    await locator.fill(value);
    return;
  }

  // Click a control.
  if (action.type === "click") {
    const locator = createLocator(page, action.target);

    await locator.click();
    return;
  }

  // Wait when the artifact requests a delay.
  if (action.type === "wait") {
    await page.waitForTimeout(action.milliseconds);
    return;
  }

  throw new Error(
    `Unsupported action type: ${action.type}`
  );
}

// Check a condition declared by the artifact.
async function checkCondition(page, condition) {
  const locator = createLocator(page, condition.target);

  if (condition.kind === "visible") {
    return locator.isVisible();
  }

  throw new Error(
    `Unsupported condition type: ${condition.kind}`
  );
}

// Look for declared business outcomes.
async function detectBusinessOutcome(page) {
  const outcomes = artifact.businessOutcomes || [];

  for (const outcome of outcomes) {
    const detected = await checkCondition(
      page,
      outcome.condition
    );

    if (detected) {
      return {
        status: "business_outcome",
        outcome: {
          code: outcome.code,
          message: outcome.message,
        },
      };
    }
  }

  return null;
}

// Convert extracted text into its declared output type.
function transformOutput(value, transform) {
  if (transform === "currency") {
    return Number(
      value.replace(/[^0-9.-]/g, "")
    );
  }

  return value.trim();
}

// Run the capability.
async function replayCapability() {
  // Validate input before opening the browser.
  // Validate the artifact structure first.
try {
  validateArtifact(artifact);
} catch (error) {
  console.error(
    JSON.stringify(
      {
        status: "failure",
        error: {
          code:
            "ARTIFACT_VALIDATION_FAILED",
          message: error.message,
        },
      },
      null,
      2
    )
  );

  return;
}

// Validate invocation inputs separately.
try {
  validateInputs();
} catch (error) {
  console.error(
    JSON.stringify(
      {
        status: "failure",
        error: {
          code:
            "INPUT_VALIDATION_FAILED",
          message: error.message,
        },
      },
      null,
      2
    )
  );

  return;
}

// Enforce capability and navigation policy.
try {
  authorizeCapability(artifact);

  authorizeNavigation(
    artifact.target.entrypoint
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        status: "failure",
        error: {
          code: "POLICY_BLOCKED",
          message: error.message,
        },
      },
      null,
      2
    )
  );

  return;
}

// Start evidence only after validation succeeds.
logEvent("replay_started", {
  capabilityId: artifact.id,
  capabilityVersion: artifact.version,
  artifactPath: artifactPath,
  inputs: inputs,
});

console.log(`Run ID: ${runId}`);

  // Start a visible browser.
  const browser = await chromium.launch({
    headless: false,
  });

  // Open a new page.
  const page = await browser.newPage();
  // Track which step is currently running.
  let currentStep = null;

  try {
    // Open the artifact's declared entry point.
    await page.goto(artifact.target.entrypoint);

    // Execute each step in order.
    for (
      let stepIndex = 0;
      stepIndex < artifact.steps.length;
      stepIndex++
    ) {
      const step = artifact.steps[stepIndex];

      // Remember the currently executing step.
      currentStep = {
        index: stepIndex,
        id: step.id,
      };

      // Record that this step is starting.
      logEvent("step_started", {
        stepIndex: stepIndex,
        stepId: step.id,
        actionType: step.action.type,
    });

      console.log(
  `     Running step ${stepIndex + 1}: ${step.id}`
      );

      // Check the action before execution.
     try {
  // Check the action before execution.
  authorizeAction(step.action);

  // Execute approved actions automatically.
  await executeAction(
    page,
    step.action
  );
} catch (error) {
  // Transfer the same browser session to a human
  // when policy requires manual approval.
  if (
    error instanceof
    HumanApprovalRequiredError
  ) {
    await requestHumanIntervention({
      page: page,
      step: step,
      reason: error.message,
    });
  } else {
    // Unknown errors continue to the outer
    // technical-failure handler.
    throw error;
  }
}

      // Check the step's postcondition when present.
      if (step.postcondition) {
        const conditionPassed = await checkCondition(
          page,
          step.postcondition
        );

        if (!conditionPassed) {
          // Check whether this is a known business outcome.
          const businessOutcome =
            await detectBusinessOutcome(page);

          if (businessOutcome) {
            // Record the expected business outcome.
            logEvent("business_outcome", {
                stepIndex: stepIndex,
                stepId: step.id,
                 outcome: businessOutcome.outcome,
            });

            // Store the screenshot inside this run's folder.
            await page.screenshot({
                path: path.join(
                    getRunDirectory(),
                    "business-outcome.png"
                ),
                 fullPage: true,
            });

             // Print the result for the calling user or agent.
            console.log(
                 JSON.stringify(businessOutcome, null, 2)
            );

            return businessOutcome;
        }

          // The expected condition was not present.
          throw new Error(
            `Postcondition failed for step: ${step.id}`
          );
        }
      }
      logEvent("step_completed", {
        stepIndex: stepIndex,
        stepId: step.id,
      });
    }

    // Verify the final capability checkpoint.
    const checkpointPassed = await checkCondition(
      page,
      artifact.checkpoint
    );

    if (!checkpointPassed) {
      throw new Error(
        "The final capability checkpoint failed"
      );
    }

    // Extract all declared outputs.
    const outputs = {};

    for (const [outputName, outputDefinition] of
      Object.entries(artifact.contract.outputs)) {
      const locator = createLocator(
        page,
        outputDefinition.target
      );

      const rawValue = await locator.textContent();

      outputs[outputName] = transformOutput(
        rawValue,
        outputDefinition.transform
      );
    }

    // Build the structured success result.
    const result = {
      status: "success",
      capability: {
        id: artifact.id,
        version: artifact.version,
      },
      outputs: outputs,
    };
    logEvent("replay_succeeded", {
        capabilityId: artifact.id,
        capabilityVersion: artifact.version,
        outputs: {
            balance: "[REDACTED]",
        },
    });

    // Save success evidence.
    await page.screenshot({
        path: path.join(
            getRunDirectory(),
            "success.png"
        ),
        fullPage: true,
    });

    console.log(JSON.stringify(result, null, 2));

    // Keep the browser open briefly.
    await page.waitForTimeout(3000);

    return result;
  } catch (error) {
    // Capture evidence when replay fails unexpectedly.
    await page.screenshot({
        path: path.join(
            getRunDirectory(),
            "failure.png"
        ),
        fullPage: true,
    });

    const result = {
        status: "failure",
        error: {
            code: error.name,
            message: error.message,
            step: currentStep,
            currentUrl: page.url(),
        },
    };
    // Save the technical failure to the evidence log.
    logEvent("replay_failed", {
         error: result.error,
    });

    console.error(JSON.stringify(result, null, 2));

    return result;
  } finally {
    await browser.close();
  }
}

// Start deterministic replay.
replayCapability();