// Import file-system support.
const fs = require("fs");

// Import the JSON Schema validator.
const Ajv2020 =
  require("ajv/dist/2020");

// Load the capability schema once.
const schema = JSON.parse(
  fs.readFileSync(
    "./schemas/capability.schema.json",
    "utf8"
  )
);

// Create and compile the validator once.
const ajv = new Ajv2020({
  allErrors: true,
});

const validate = ajv.compile(schema);

// Validate one capability artifact.
function validateArtifact(artifact) {
  const valid = validate(artifact);

  if (!valid) {
    const details = validate.errors
      .map((error) => {
        return `${error.instancePath || "/"} ${error.message}`;
      })
      .join("; ");

    const validationError =
      new Error(details);

    validationError.name =
      "ArtifactValidationError";

    throw validationError;
  }
}

// Export the validator.
module.exports = {
  validateArtifact,
};