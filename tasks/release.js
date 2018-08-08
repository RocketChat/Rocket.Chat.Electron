'use strict';

const gulp = require('gulp');
const childProcess = require('child_process');

gulp.task('release', [ 'build-app' ], () => {
    childProcess.spawn('node_modules/.bin/build',
        process.argv.filter(arg => !arg.startsWith('--env')), { stdio: 'inherit' })
        .on('close', () => process.exit());
});
