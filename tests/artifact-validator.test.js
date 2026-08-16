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