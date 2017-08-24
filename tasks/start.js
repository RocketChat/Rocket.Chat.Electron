'use strict';

const childProcess = require('child_process');
const electron = require('electron');
const gulp = require('gulp');

gulp.task('start', ['build', 'watch'], function () {
    childProcess.spawn(electron, ['.'], {
        stdio: 'inherit'
    })
        .on('close', function () {
        // User closed the app. Kill the host process.
            process.exit();
        });
});
