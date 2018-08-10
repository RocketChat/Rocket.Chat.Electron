'use strict';

const gulp = require('gulp');
const sequence = require('gulp-sequence');
const childProcess = require('child_process');
const os = require('os');
const path = require('path');
const { getEnvName } = require('./utils');

const argv = process.argv.slice(3).filter(arg => !arg.startsWith('--env'));
const publishArgs = getEnvName() !== 'production' ? [ '--publish', 'never' ] : [];

const buildRelease = (...args) => cb => {
    const buildPath = path.join('node_modules', '.bin', os.platform() === 'win32' ? 'build.cmd' : 'build');
    childProcess.spawn(buildPath, [ ...argv, ...publishArgs, ...args ], { stdio: 'inherit' })
        .on('close', () => cb());
};

gulp.task('release:osx', [ 'build-app' ], buildRelease('--x64', '--mac'));
gulp.task('release:win', [ 'build-app' ], buildRelease('--ia32', '--x64', '--win', 'nsis', 'appx'));
gulp.task('release:linux-x64', buildRelease('--x64', '--linux'));
gulp.task('release:linux-ia32', buildRelease('--ia32', '--linux', 'deb', 'rpm'));
gulp.task('release:linux', [ 'build-app' ], sequence('release:linux-x64', 'release:linux-ia32'));

gulp.task('release', cb => {
    switch (os.platform()) {
        case 'darwin':
            return gulp.start('release:osx', cb);

        case 'win32':
            return gulp.start('release:win', cb);

        case 'linux':
            return gulp.start('release:linux', cb);
    }
});
