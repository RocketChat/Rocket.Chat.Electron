const gulp = require('gulp');
const bundle = require('./bundle');


gulp.task('build-unit-tests', ['build-app'], async() => {
	await bundle.many('src', 'background/*.spec.js', 'app/main.specs.js');
	await bundle.many('src', ['*.spec.js', '!background/*.spec.js'], 'app/renderer.specs.js');
});

gulp.task('build-coverage-tests', ['build-app'], async() => {
	await bundle.many('src', 'background/*.spec.js', 'app/main.specs.js', { coverage: true });
	await bundle.many('src', ['*.spec.js', '!background/*.spec.js'], 'app/renderer.specs.js', { coverage: true });
});

gulp.task('build-e2e-tests', ['build-app'], async() => {
	await bundle.many('src', '*.e2e.js', 'app/e2e.js');
});
