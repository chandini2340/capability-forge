// Import Node.js modules.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Create one unique ID for this run.
const runId = crypto.randomUUID();

// Create a separate evidence folder for this run.
const runDirectory = path.join(
  "evidence",
  `run-${runId}`
);

// Create the directory if it does not exist.
fs.mkdirSync(runDirectory, {
  recursive: true,
});

// Location of the structured event log.
const logFile = path.join(
  runDirectory,
  "events.jsonl"
);

// Redact sensitive information from strings.
function redactString(value) {
  return value
  .replace(
      /\b\d{5}\b/g,
      "[REDACTED_MEMBER_ID]"
    )
    // Redact Social Security numbers.
    .replace(
      /\b\d{3}-\d{2}-\d{4}\b/g,
      "[REDACTED_SSN]"
    )

    // Redact long account or card numbers.
    .replace(
      /\b(?:\d[ -]*?){9,19}\b/g,
      "[REDACTED_ACCOUNT]"
    )

    // Redact common secret values.
    .replace(
      /(password|token|secret|authorization)(["' :=]+)[^\s,"']+/gi,
      "$1$2[REDACTED]"
    );
}

// Recursively redact strings inside objects and arrays.
function redactValue(value) {
  if (typeof value === "string") {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    const redactedObject = {};

    for (const [key, nestedValue] of
      Object.entries(value)) {
      // Completely hide explicitly sensitive fields.
      if (
        key.toLowerCase().includes("memberid") ||
        key.toLowerCase().includes("password") ||
        key.toLowerCase().includes("token")
      ) {
        redactedObject[key] = "[REDACTED]";
      } else {
        redactedObject[key] =
          redactValue(nestedValue);
      }
    }

    return redactedObject;
  }

  return value;
}

// Write one structured event.
function logEvent(eventType, data = {}) {
  const event = {
    timestamp: new Date().toISOString(),
    runId: runId,
    type: eventType,
    data: redactValue(data),
  };

  // JSONL stores one JSON object per line.
  fs.appendFileSync(
    logFile,
    JSON.stringify(event) + "\n"
  );

  return event;
}

// Return the evidence directory to other files.
function getRunDirectory() {
  return runDirectory;
}

// Export the logger functions.
module.exports = {
  logEvent,
  getRunDirectory,
  runId,
};