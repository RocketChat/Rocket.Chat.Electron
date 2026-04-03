
# AI Helper: Convert Markdown Test Plan to Playwright Code

## Purpose
This document provides instructions for an AI assistant to convert a **Markdown test plan** into a **Playwright test script** for the Rocket.Chat Electron application.

The generated code must follow the **exact project conventions** described below.

---

# Environment

Application: Rocket.Chat Electron  
Testing Framework: Playwright  
Language: TypeScript  

The tests run inside a **webview context** and therefore must use:

webviewPage

instead of the default Playwright `page`.

---

# Mandatory Code Structure

Every generated test **must follow this structure exactly**.

```ts
import { test, expect } from './fixtures/base';

test('test', async ({ webviewPage }) => {

});
```

### Rules

1. The import **must always be**

import { test, expect } from './fixtures/base';

2. The test callback must always include

({ webviewPage })

3. Do **NOT** use

page
browser
context

4. All interactions must use

webviewPage

Example:

```ts
await webviewPage.getByRole('button', { name: 'Create new' }).click();
```

---

# Selector Priority Rules

Selectors must follow this priority order.

### 1️⃣ Preferred
Use **ARIA role selectors**

getByRole()

Example

```ts
webviewPage.getByRole('button', { name: 'Create new' })
```

---

### 2️⃣ Secondary

getByLabel()

Example

```ts
webviewPage.getByLabel('Name')
```

---

### 3️⃣ Third option

getByPlaceholder()

Example

```ts
webviewPage.getByPlaceholder('Message')
```

---

### 4️⃣ Last resort

locator()

Use `locator()` only when no accessible selector exists.

Example

```ts
webviewPage.locator('.rcx-toggle-switch__fake')
```

---

# Mapping Markdown Steps to Playwright Code

The AI must convert **test steps** into Playwright commands.

---

# Click Actions

Markdown example

Click the "Create new" button

Generated code

```ts
await webviewPage.getByRole('button', { name: 'Create new' }).click();
```

---

# Typing Text

Markdown

Type "dummy" in the Name field

Code

```ts
await webviewPage.getByRole('textbox', { name: 'Name' }).fill('dummy');
```

---

# Checkbox / Toggle

Markdown

Ensure Private toggle is checked

Code

```ts
await webviewPage.getByRole('checkbox', { name: 'Private' }).check();
```

If the checkbox selector is unavailable, use:

```ts
await webviewPage.locator('.rcx-toggle-switch__fake').first().click();
```

---

# Menu Selection

Markdown

Click "Channel"

Code

```ts
await webviewPage.getByRole('menuitem', { name: 'Channel' }).click();
```

---

# Dialog Validation

Markdown

Expected Result: Create channel dialog appears

Code

```ts
await expect(webviewPage.getByRole('dialog')).toBeVisible();
```

---

# Success Alert Verification

Markdown

Expected Result: Room has been created

Code

```ts
await expect(webviewPage.getByText('Room has been created')).toBeVisible();
```

---

# URL Verification

Markdown

User navigates to /group/dummy

Code

```ts
await expect(webviewPage).toHaveURL(/group\/dummy/);
```

---

# Sidebar Verification

Markdown

Channel appears in sidebar

Code

```ts
await expect(webviewPage.getByRole('link', { name: 'dummy' })).toBeVisible();
```

---

# Heading Verification

Markdown

Channel heading displays "dummy"

Code

```ts
await expect(webviewPage.getByRole('heading', { name: 'dummy' })).toBeVisible();
```

---

# Page Title Verification

Markdown

Page title updates to "dummy - Santam Private Server"

Code

```ts
await expect(webviewPage).toHaveTitle(/dummy/);
```

---

# Code Generation Guidelines

The AI must follow these rules when generating tests.

### Rule 1
Convert **each numbered step** into one or more Playwright commands.

---

### Rule 2
Add comments for clarity.

Example

```ts
// Open create new menu
await webviewPage.getByRole('button', { name: 'Create new' }).click();
```

---

### Rule 3
Add assertions whenever an **Expected Result** exists.

Use:

expect()

---

### Rule 4
Do not generate unnecessary waits.

Avoid:

waitForTimeout()

Prefer Playwright auto waiting.

---

### Rule 5
Generate **clean and readable TypeScript**.

---

# Markdown Sections to Ignore

The AI should **ignore** these sections when generating code.

Overview
Test Environment
Notes
Related Documentation
Test Execution Record

Focus only on:

Step-by-Step Instructions
Selectors
Expected Result

---

# Example Generated Test

Example output produced from a Markdown test plan.

```ts
import { test, expect } from './fixtures/base';

test('test', async ({ webviewPage }) => {

  // Open create new menu
  await webviewPage.getByRole('button', { name: 'Create new' }).click();

  // Select channel option
  await webviewPage.getByRole('menuitem', { name: 'Channel' }).click();

  // Enter channel name
  await webviewPage.getByRole('textbox', { name: 'Name' }).fill('dummy');

  // Ensure private toggle is enabled
  await webviewPage.locator('.rcx-box.rcx-box--full.rcx-toggle-switch__fake').first().click();

  // Create the channel
  await webviewPage.getByRole('button', { name: 'Create', exact: true }).click();

  // Verify success alert
  await expect(webviewPage.getByText('Room has been created')).toBeVisible();

  // Verify navigation
  await expect(webviewPage).toHaveURL(/group\/dummy/);

  // Verify channel heading
  await expect(webviewPage.getByRole('heading', { name: 'dummy' })).toBeVisible();

});
```

---

# Output Requirements

The AI output must contain:

- Valid Playwright TypeScript code
- Correct imports
- Use of `webviewPage`
- Playwright best practices
- Assertions when possible

The AI must **output only the test code**.

Do **not include explanations**.
