import { test, expect } from './fixtures/base';

test('test', async ({ webviewPage }) => {
  await webviewPage.getByRole('button', { name: 'Create new' }).click();
  await webviewPage.getByRole('menuitem', { name: 'Channel' }).click();
  await webviewPage.getByRole('textbox', { name: 'Name' }).fill('santam-dummy');
  await webviewPage.locator('.rcx-box.rcx-box--full.rcx-toggle-switch__fake').first().click();
  await webviewPage.getByRole('button', { name: 'Create', exact: true }).click();
});



// page.getByRole('button', { name: 'Create new' })
// page.getByRole('menuitem', { name: 'Channel' })
// page.getByRole('textbox', { name: 'Name' })
// <textbox role="textbox" aria-label="Name">
//   dummy
// </textbox>
// page.getByRole('checkbox', { name: 'Private' })
// page.getByRole('button', { name: 'Create', exact: true })
// <listitem>
//   <link href="/group/dummy">
//     <generic>dummy</generic>
//   </link>
// </listitem>