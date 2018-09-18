import jetpack from 'fs-jetpack';

export const userDataDir = jetpack.cwd(app.getPath('userData'));
export const preferencesStoreFile = `preferences.json`;