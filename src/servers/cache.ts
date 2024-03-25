import type { WebContents } from 'electron';

export const clearWebviewStorageKeepingLogin = async (
  guestWebContents: WebContents
) => {
  const key = 'Meteor.loginToken';
  const result = await guestWebContents
    ?.executeJavaScript(`localStorage.getItem('${key}')`)
    .then((value) => value);

  await guestWebContents?.session.clearCache();
  await guestWebContents?.session.clearStorageData();

  await guestWebContents?.executeJavaScript(
    `localStorage.setItem('${key}', '${result}')`
  );
  guestWebContents?.reloadIgnoringCache();
};
