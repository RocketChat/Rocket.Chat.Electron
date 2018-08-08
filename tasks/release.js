'use strict';

const gulp = require('gulp');
const childProcess = require('child_process');
const os = require('os');
const { getEnvName } = require('./utils');

const getElectronBuilderArgs = () => {
    const argv = process.argv.filter(arg => !arg.startsWith('--env'));
    const publishArgs = getEnvName() !== 'production' ? [ '--publish', 'never' ] : [];

    const platform = os.platform();
    const arch = os.arch();

    if (platform === 'darwin' && arch === 'x64') {
        return [ ...argv, ...publishArgs, '--x64', '--mac' ];
    } else if (platform === 'linux' && arch === 'x64') {
        return [ ...argv, ...publishArgs, '--x64', '--linux' ];
    } else if (platform === 'linux' && arch === 'ia32') {
        return [ ...argv, ...publishArgs, '--ia32', '--linux', 'deb', 'rpm' ];
    } else if (os.platform() === 'win32') {
        return [ ...argv, ...publishArgs, '--ia32', '--x64', '--win', 'nsis', 'appx' ];
    }

    throw new Error(`The OS platform "${ os.platform() }" is unsupported`);
};

gulp.task('release', [ 'build-app' ], () => {
    childProcess.spawn('node_modules/.bin/build', getElectronBuilderArgs(), { stdio: 'inherit' })
        .on('close', () => process.exit());
});
