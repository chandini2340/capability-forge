// Collect a compact description of the current page.
async function observePage(page) {
  // Read the current URL.
  const url = page.url();

  // Read the page title.
  const title = await page.title();

  // Read visible text from the page.
  const visibleText = await page
    .locator("body")
    .innerText();

  // Find interactive controls on the page.
  const controls = await page
    .locator(
      "input, button, a, select, textarea"
    )
    .evaluateAll((elements) => {
      return elements
        // Ignore invisible controls.
        .filter((element) => {
          const style =
            window.getComputedStyle(element);

          return (
            style.display !== "none" &&
            style.visibility !== "hidden"
          );
        })

        // Convert each control into a small object.
        .map((element, index) => {
          // Determine the control's semantic role.
          let role =
            element.getAttribute("role");

          if (!role) {
            if (element.tagName === "BUTTON") {
              role = "button";
            } else if (
              element.tagName === "A"
            ) {
              role = "link";
            } else if (
              element.tagName === "INPUT"
            ) {
              const inputType =
                element.getAttribute("type") ||
                "text";

              role =
                inputType === "text"
                  ? "textbox"
                  : inputType;
            } else {
              role =
                element.tagName.toLowerCase();
            }
          }

          // Find the accessible or visible name.
          let name =
            element.getAttribute(
              "aria-label"
            ) ||
            element.innerText ||
            element.getAttribute(
              "placeholder"
            ) ||
            element.getAttribute("name") ||
            "";

          // Use the connected label for form fields.
          if (
            element.labels &&
            element.labels.length > 0
          ) {
            name =
              element.labels[0].innerText.trim();
          }

          return {
            index: index,
            role: role,
            name: name.trim(),
            type:
              element.getAttribute("type"),
          };
        });
    });

  // Return the complete observation.
  return {
    url: url,
    title: title,

    // Limit the text so the prompt cannot grow forever.
    visibleText: visibleText.slice(0, 4000),

    controls: controls,
  };
}

// Export the function.
module.exports = {
  observePage,
};