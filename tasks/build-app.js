'use strict';

const gulp = require('gulp');
const less = require('gulp-less');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
const bundle = require('./bundle');
const utils = require('./utils');
const { srcDir, configDir, appDir } = require('./utils');

gulp.task('public', () => {
    return gulp.src(srcDir.path('public/**/*'))
        .pipe(plumber())
        .pipe(gulp.dest(appDir.path('public')));
});

gulp.task('i18n', () => {
    return gulp.src(srcDir.path('i18n/lang/**/*'))
        .pipe(plumber())
        .pipe(gulp.dest(appDir.path('i18n/lang')));
});

gulp.task('bundle', () => {
    return Promise.all([
        bundle(srcDir.path('background.js'), appDir.path('background.js')),
        bundle(srcDir.path('app.js'), appDir.path('app.js')),
        bundle(srcDir.path('i18n/index.js'), appDir.path('i18n/index.js'))
    ]);
});

gulp.task('less', () => {
    return gulp.src(srcDir.path('stylesheets/main.less'))
        .pipe(plumber())
        .pipe(less())
        .pipe(gulp.dest(appDir.path('stylesheets')));
});

gulp.task('environment', () => {
    return gulp.src(configDir.path(`env_${ utils.getEnvName() }.json`))
        .pipe(plumber())
        .pipe(rename('env.json'))
        .pipe(gulp.dest(appDir.path('.')));
});

gulp.task('build-app', [ 'public', 'i18n', 'bundle', 'less', 'environment' ]);
