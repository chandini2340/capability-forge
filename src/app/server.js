// Import Node.js's built-in HTTP library.
const http = require("http");

// The local port where our banking application will run.
const PORT = 4173;

// Fake member records.
// These are fictional and do not contain real customer information.
const members = {
  "12345": {
    name: "Alex Rivera",
    savingsBalance: 2847.19,
  },
  "90001": {
    name: "Jamie Chen",
    savingsBalance: 152.06,
  },
};

// Create the web server.
const server = http.createServer((request, response) => {
  // Create a URL object from the incoming request.
  const url = new URL(
    request.url,
    `http://${request.headers.host}`
  );

  // Display the member-search page.
  if (url.pathname === "/legacy/search") {
    showSearchPage(response);
    return;
  }

  // Process the member-search request.
  if (url.pathname === "/legacy/member") {
    // Read the member ID from the URL.
    const memberId = url.searchParams.get("id");

    // Find the member in our fake database.
    const member = members[memberId];

    // Display an error when the member does not exist.
    if (!member) {
      showSearchPage(response, "Member not found");
      return;
    }

    // Display the matching member.
    showMemberPage(response, memberId, member);
    return;
  }

  // Return a 404 response for every unknown route.
  response.writeHead(404, {
    "Content-Type": "text/plain",
  });

  response.end("Page not found");
});

// Start the server.
server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `Legacy banking application is running at http://127.0.0.1:${PORT}/legacy/search`
  );
});

// Send an HTML page to the browser.
function sendHtml(response, html) {
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });

  response.end(html);
}

// Display the member-search page.
function showSearchPage(response, errorMessage = "") {
  const errorSection = errorMessage
    ? `<div role="alert" class="error">${errorMessage}</div>`
    : "";

  const page = createPage(`
    <form class="panel" method="GET" action="/legacy/member">
      <h1>Member Inquiry</h1>

      ${errorSection}

      <table>
        <tr>
          <td>
            <label for="member-number">Member Number</label>
          </td>

          <td>
            <input
              id="member-number"
              name="id"
              type="text"
              autocomplete="off"
            />
          </td>
        </tr>

        <tr>
          <td></td>

          <td>
            <button type="submit">Find Member</button>
          </td>
        </tr>
      </table>
    </form>
  `);

  sendHtml(response, page);
}

// Display the member-details page.
function showMemberPage(response, memberId, member) {
  const page = createPage(`
    <div class="panel">
      <h1>Member Detail</h1>

      <table>
        <tr>
          <td>Member Number</td>
          <td>${memberId}</td>
        </tr>

        <tr>
          <td>Member Name</td>
          <td>${member.name}</td>
        </tr>

        <tr>
          <td>Savings Balance</td>

          <td aria-label="Savings balance" class="balance">
            $${member.savingsBalance.toFixed(2)}
          </td>
        </tr>
      </table>

      <div role="status">Member loaded</div>

      <p>
        <a href="/legacy/search">New inquiry</a>
      </p>
    </div>
  `);

  sendHtml(response, page);
}

// Create the shared page layout.
function createPage(content) {
  return `
    <!DOCTYPE html>

    <html lang="en">
      <head>
        <meta charset="UTF-8" />

        <title>Legacy Member Console</title>

        <style>
          body {
            margin: 0;
            background: #d8d8d8;
            font-family: Arial, sans-serif;
            font-size: 14px;
          }

          .header {
            padding: 12px;
            background: #17365d;
            color: white;
            font-weight: bold;
          }

          .panel {
            width: 620px;
            margin: 40px auto;
            padding: 20px;
            background: white;
            border: 2px inset #aaaaaa;
          }

          table {
            border-collapse: collapse;
          }

          td {
            padding: 8px;
          }

          input {
            padding: 6px;
          }

          button {
            padding: 6px 14px;
          }

          .error {
            margin-bottom: 12px;
            color: #a00000;
            font-weight: bold;
          }

          .balance {
            font-size: 22px;
            font-weight: bold;
          }
        </style>
      </head>

      <body>
        <div class="header">
          COREPRO 7.4 | MEMBER SERVICING
        </div>

        ${content}
      </body>
    </html>
  `;
}