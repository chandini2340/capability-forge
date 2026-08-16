// Import file-system support.
const fs = require("fs");

// Import Ajv's 2020 JSON Schema validator.
const Ajv2020 =
  require("ajv/dist/2020");

// Read the artifact path from the command.
const artifactPath = process.argv[2];

if (!artifactPath) {
  console.error(
    "Provide an artifact path."
  );

  console.error(
    "Example: node .\\src\\validate-artifact.js .\\artifacts\\discovered-member-balance.v1.json"
  );

  process.exit(1);
}

// Load the formal schema.
const schema = JSON.parse(
  fs.readFileSync(
    "./schemas/capability.schema.json",
    "utf8"
  )
);

// Load the selected artifact.
const artifact = JSON.parse(
  fs.readFileSync(
    artifactPath,
    "utf8"
  )
);

// Create the validator.
const ajv = new Ajv2020({
  allErrors: true,
});

// Compile the schema.
const validate = ajv.compile(schema);

// Validate the artifact.
const valid = validate(artifact);

if (valid) {
  console.log("Artifact is valid.");
} else {
  console.error(
    "Artifact validation failed."
  );

  console.error(
    JSON.stringify(
      validate.errors,
      null,
      2
    )
  );

  process.exit(1);
}