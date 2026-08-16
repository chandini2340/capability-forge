// Import the official OpenAI JavaScript SDK.
const OpenAI = require("openai");

// Create the client.
//
// The SDK automatically reads OPENAI_API_KEY
// from the Windows environment.
const client = new OpenAI();

// Test the API connection.
async function testOpenAI() {
  try {
    // Send a small request through the Responses API.
    const response = await client.responses.create({
      model: "gpt-5.6",
      input:
        "Return exactly this text: OpenAI connection works",
      store: false,
    });

    // Print only the model's text response.
    console.log(response.output_text);
  } catch (error) {
    console.error("OpenAI connection failed.");

    console.error(
      error.status || error.code || error.name
    );

    console.error(error.message);
  }
}

// Run the test.
testOpenAI();