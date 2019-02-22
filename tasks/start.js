const gulp = require('gulp');
const childProcess = require('child_process');
const electron = require('electron');

const spawnElectron = () => (
	childProcess
		.spawn(electron, ['.'], { stdio: 'inherit' })
		.on('close', spawnElectron)
);

gulp.task('start', gulp.series('build-app', gulp.parallel('watch', spawnElectron)));
