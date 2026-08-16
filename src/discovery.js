// Import Node.js utilities.
const fs = require("fs");
const path = require("path");

// Import Playwright.
const { chromium } = require("playwright");

// Import the page observer.
const {
  observePage,
} = require("./observe");

// Import the LLM planner.
const {
  decideNextAction,
} = require("./planner");

// Import safety-policy functions.
const {
  authorizeNavigation,
  authorizeAction,
} = require("./policy");

// Import evidence logging.
const {
  logEvent,
  getRunDirectory,
  runId,
} = require("./logger");

// Import the capability compiler.
const {
  compileCapability,
} = require("./compiler");

// The goal the LLM must complete.
const goal =
  "Look up member 12345 and read the current savings balance.";

// The only page discovery may initially open.
const entrypoint =
  "http://127.0.0.1:4173/legacy/search";

// Prevent an unlimited model loop.
const maximumSteps = 10;

// Convert an LLM target into a Playwright locator.
function createDiscoveryLocator(page, target) {
  // Require both a semantic role and name.
  if (!target.role || !target.name) {
    throw new Error(
      "The LLM returned an incomplete target"
    );
  }

  // Use the exact role and accessible name.
  return page.getByRole(target.role, {
    name: target.name,
    exact: true,
  });
}

// Execute one policy-approved LLM action.
async function executeDiscoveryAction(
  page,
  action
) {
  // Fill a text field.
  if (action.type === "fill") {
    const locator =
      createDiscoveryLocator(
        page,
        action.target
      );

    if (!action.value) {
      throw new Error(
        "The fill action did not include a value"
      );
    }

    await locator.fill(action.value);
    return;
  }

  // Click a button or link.
  if (action.type === "click") {
    const locator =
      createDiscoveryLocator(
        page,
        action.target
      );

    await locator.click();
    return;
  }

  // Wait briefly.
  if (action.type === "wait") {
    await page.waitForTimeout(1000);
    return;
  }

  throw new Error(
    `Unsupported discovery action: ${action.type}`
  );
}

// Remove sensitive values before logging a decision.
function createSafeDecision(decision) {
  return {
    done: decision.done,
    reason: decision.reason.replace(
  /\b\d{5}\b/g,
  "[REDACTED_MEMBER_ID]"
),

    action: {
      type: decision.action.type,
      target: decision.action.target,

      // Never persist text entered into a form.
      value:
        decision.action.type === "fill"
          ? "[REDACTED]"
          : decision.action.value,
    },

    // Never persist the extracted financial output.
    output:
      decision.output === null
        ? null
        : "[REDACTED]",
  };
}

// Run the complete LLM discovery process.
async function runDiscovery() {
  // Check navigation before opening the browser.
  authorizeNavigation(entrypoint);

  // Start a visible browser.
  const browser = await chromium.launch({
    headless: false,
  });

  // Open a new page.
  const page = await browser.newPage();

  // Keep decisions in memory for the current run.
  const history = [];

  // Track the current step for failure reports.
  let currentStep = null;

  try {
    // Open the banking application.
    await page.goto(entrypoint);

    // Record the start of discovery.
    logEvent("discovery_started", {
      goal:
        "Look up a member and read the savings balance",
      entrypoint: entrypoint,
      maximumSteps: maximumSteps,
    });

    console.log(`Discovery Run ID: ${runId}`);
    console.log(`Goal: ${goal}`);

    // Begin the bounded agent loop.
    for (
      let stepIndex = 0;
      stepIndex < maximumSteps;
      stepIndex++
    ) {
      currentStep = stepIndex;

      console.log(
        `\nDiscovery step ${stepIndex + 1}`
      );

      // OBSERVE: Read the current browser state.
      const observation =
        await observePage(page);

      console.log(
        `Observed: ${observation.title}`
      );

      // Log only safe observation metadata.
      logEvent("page_observed", {
        stepIndex: stepIndex,
        url: observation.url,
        title: observation.title,
        controls: observation.controls,
      });

      // DECIDE: Ask the LLM for one action.
      const decision =
        await decideNextAction({
          goal: goal,
          observation: observation,
          history: history,
        });

      console.log(
        "LLM decision:",
        JSON.stringify(decision, null, 2)
      );

      // Store a redacted version in evidence.
      logEvent(
        "model_decision",
        {
          stepIndex: stepIndex,
          decision:
            createSafeDecision(decision),
        }
      );

      // Stop when the model says the goal is complete.
      if (decision.done) {
  // Convert the successful action history into
  // a reusable capability artifact.
  const capability =
    compileCapability({
      goal: goal,
      entrypoint: entrypoint,
      history: history,
    });

  // Save a copy with the discovery evidence.
  const evidenceArtifactPath =
    path.join(
      getRunDirectory(),
      "capability.json"
    );

  fs.writeFileSync(
    evidenceArtifactPath,
    JSON.stringify(
      capability,
      null,
      2
    )
  );

  // Save the latest discovered capability
  // in the artifacts folder for replay.
  const reusableArtifactPath =
    path.join(
      "artifacts",
      "discovered-member-balance.v1.json"
    );

  fs.writeFileSync(
    reusableArtifactPath,
    JSON.stringify(
      capability,
      null,
      2
    )
  );

  // Build the discovery result.
  const result = {
    status: "success",
    output: decision.output,
    stepsTaken: history.length,
    artifact: reusableArtifactPath,
  };

        // Redact the financial output in evidence.
        logEvent(
          "discovery_succeeded",
          {
            stepsTaken: history.length,
            output: "[REDACTED]",
          }
        );

        // Save final visual evidence.
        await page.screenshot({
          path: path.join(
            getRunDirectory(),
            "discovery-success.png"
          ),
          fullPage: true,
        });

        console.log(
          "\nDiscovery completed:"
        );

        console.log(
          JSON.stringify(result, null, 2)
        );

        await page.waitForTimeout(5000);

        return result;
      }

      // Add a risk classification before policy review.
      const policyAction = {
        ...decision.action,
        risk: "reversible",
      };

      // Check the decision before execution.
      authorizeAction(policyAction);

      // ACT: Let Playwright perform the action.
      await executeDiscoveryAction(
        page,
        decision.action
      );

      // Wait for page activity to settle.
      await page.waitForLoadState(
        "domcontentloaded"
      );

      // Keep the decision in memory for the next prompt.
      history.push(decision);

      logEvent("discovery_action_completed", {
        stepIndex: stepIndex,
        actionType: decision.action.type,
        target: decision.action.target,
      });
    }

    // The model used every allowed step.
    throw new Error(
      `Discovery exceeded ${maximumSteps} steps`
    );
  } catch (error) {
    // Capture the browser state on failure.
    await page.screenshot({
      path: path.join(
        getRunDirectory(),
        "discovery-failure.png"
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

    logEvent("discovery_failed", {
      error: result.error,
    });

    console.error(
      JSON.stringify(result, null, 2)
    );

    return result;
  } finally {
    await browser.close();
  }
}

// Start the discovery run.
runDiscovery();