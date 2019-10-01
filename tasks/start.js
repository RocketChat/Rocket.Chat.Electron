const childProcess = require('child_process');
const electron = require('electron');
const gulp = require('gulp');


gulp.task('electron', () => {
	childProcess
		.spawn(electron, ['.'], { stdio: 'inherit', shell: true })
		.on('close', gulp.task('electron'));
});

gulp.task('start', gulp.series('build', gulp.parallel('watch', 'electron')));
