// Import the file-system module.
const fs = require("fs");

// Load the policy configuration.
const policyText = fs.readFileSync(
  "./config/policy.json",
  "utf8"
);

// Convert the JSON policy into a JavaScript object.
const policy = JSON.parse(policyText);

// A custom error for blocked policy decisions.
class PolicyViolationError extends Error {
  constructor(message) {
    super(message);
    this.name = "PolicyViolationError";
  }
}

// A custom error for actions requiring human approval.
class HumanApprovalRequiredError extends Error {
  constructor(message) {
    super(message);
    this.name = "HumanApprovalRequiredError";
  }
}

// Verify that navigation stays inside the allowlist.
function authorizeNavigation(targetUrl) {
  // Convert the URL string into a URL object.
  const parsedUrl = new URL(targetUrl);

  // Verify the website origin.
  const originAllowed =
    policy.allowedOrigins.includes(parsedUrl.origin);

  if (!originAllowed) {
    throw new PolicyViolationError(
      `Blocked origin: ${parsedUrl.origin}`
    );
  }

  // Verify the application route.
  const pathAllowed =
    policy.allowedPathPrefixes.some((prefix) =>
      parsedUrl.pathname.startsWith(prefix)
    );

  if (!pathAllowed) {
    throw new PolicyViolationError(
      `Blocked route: ${parsedUrl.pathname}`
    );
  }

  console.log(
    `Policy approved navigation: ${targetUrl}`
  );
}

// Verify that an action is permitted.
function authorizeAction(action) {
  // Check the action-type allowlist.
  const actionAllowed =
    policy.allowedActions.includes(action.type);

  if (!actionAllowed) {
    throw new PolicyViolationError(
      `Blocked action type: ${action.type}`
    );
  }

  // Require human approval for irreversible actions.
  if (
    action.risk === "irreversible" &&
    policy.riskyActionMode === "require_human"
  ) {
    throw new HumanApprovalRequiredError(
      `Human approval required for action: ${action.type}`
    );
  }

  console.log(
    `Policy approved action: ${action.type}`
  );
}

// Make sure the capability is not unreasonably long.
function authorizeCapability(artifact) {
  // Only reviewed artifacts may run unattended.
  if (
    artifact.approvalState !== "approved"
  ) {
    throw new PolicyViolationError(
      `Capability is not approved. Current state: ${artifact.approvalState}`
    );
  }

  if (artifact.steps.length > policy.maximumSteps) {
    throw new PolicyViolationError(
      `Capability contains too many steps. Maximum allowed: ${policy.maximumSteps}`
    );
  }

  console.log(
    `Policy approved capability with ${artifact.steps.length} steps`
  );
}

// Export the functions for other files.
module.exports = {
  authorizeNavigation,
  authorizeAction,
  authorizeCapability,
  PolicyViolationError,
  HumanApprovalRequiredError,
};