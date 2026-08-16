// Import Node.js utilities.
const path = require("path");
const readline = require("readline");

// Import evidence logging.
const {
  logEvent,
  getRunDirectory,
} = require("./logger");

// Wait for the operator to press Enter.
function waitForOperator() {
  return new Promise((resolve) => {
    const interface = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    interface.question(
      "\nComplete the required action in the open browser, then press Enter here to resume: ",
      () => {
        interface.close();
        resolve();
      }
    );
  });
}

// Pause automation and transfer control to a human.
async function requestHumanIntervention({
  page,
  step,
  reason,
}) {
  // Capture the state before human control.
  const beforeUrl = page.url();

  await page.screenshot({
    path: path.join(
      getRunDirectory(),
      "handoff-before.png"
    ),
    fullPage: true,
  });

  // Record ownership transfer.
  logEvent("control_transferred_to_human", {
    stepId: step.id,
    reason: reason,
    currentUrl: beforeUrl,
    owner: "human",
  });

  console.log("\n=================================");
  console.log("HUMAN INTERVENTION REQUIRED");
  console.log("=================================");
  console.log(`Step: ${step.id}`);
  console.log(`Reason: ${reason}`);
  console.log(`Current URL: ${beforeUrl}`);
  console.log(
    "Browser control has been transferred to you."
  );

  // Keep the same page and browser session open.
  await waitForOperator();

  // Capture the state after human control.
  const afterUrl = page.url();

  await page.screenshot({
    path: path.join(
      getRunDirectory(),
      "handoff-after.png"
    ),
    fullPage: true,
  });

  // Record the human action and control return.
  logEvent("human_action_completed", {
    stepId: step.id,
    action:
      "Operator completed the blocked step manually",
    beforeUrl: beforeUrl,
    afterUrl: afterUrl,
  });

  logEvent(
    "control_returned_to_automation",
    {
      stepId: step.id,
      owner: "automation",
    }
  );

  console.log(
    "Control returned to automation."
  );
}

// Export the handoff function.
module.exports = {
  requestHumanIntervention,
};