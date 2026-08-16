// Import Node.js testing utilities.
const test = require("node:test");
const assert = require("node:assert/strict");

// Import the formal validator.
const {
  validateArtifact,
} = require(
  "../src/artifact-validator"
);

// Load the approved artifact.
const approvedArtifact = require(
  "../artifacts/member-balance.v1.json"
);

test(
  "validator accepts a valid artifact",
  () => {
    assert.doesNotThrow(() => {
      validateArtifact(
        approvedArtifact
      );
    });
  }
);

test(
  "validator rejects an invalid version",
  () => {
    // Copy the artifact so the original is unchanged.
    const invalidArtifact =
      structuredClone(
        approvedArtifact
      );

    invalidArtifact.version =
      "invalid-version";

    assert.throws(
      () => {
        validateArtifact(
          invalidArtifact
        );
      },
      {
        name:
          "ArtifactValidationError",
      }
    );
  }
);

test(
  "validator rejects an unknown action",
  () => {
    const invalidArtifact =
      structuredClone(
        approvedArtifact
      );

    invalidArtifact.steps[0]
      .action.type =
      "run_unapproved_program";

    assert.throws(
      () => {
        validateArtifact(
          invalidArtifact
        );
      },
      {
        name:
          "ArtifactValidationError",
      }
    );
  }
);

test(
  "validator accepts a bounded recovery policy",
  () => {
    const artifactWithRecovery =
      structuredClone(approvedArtifact);

    artifactWithRecovery.steps[1]
      .action.recovery = {
        maxAttempts: 3,
        delayMilliseconds: 500,
      };

    assert.doesNotThrow(() => {
      validateArtifact(artifactWithRecovery);
    });
  }
);

test(
  "validator rejects an excessive recovery policy",
  () => {
    const artifactWithRecovery =
      structuredClone(approvedArtifact);

    artifactWithRecovery.steps[1]
      .action.recovery = {
        maxAttempts: 100,
        delayMilliseconds: 500,
      };

    assert.throws(
      () => {
        validateArtifact(artifactWithRecovery);
      },
      {
        name: "ArtifactValidationError",
      }
    );
  }
);