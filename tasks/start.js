'use strict';

const gulp = require('gulp');
const childProcess = require('child_process');
const electron = require('electron');

gulp.task('start', ['build-app', 'watch'], () => {
	childProcess.spawn(electron, ['.'], { stdio: 'inherit' })
		.on('close', () => process.exit());
});
