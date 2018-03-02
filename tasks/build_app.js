'use strict';

const gulp = require('gulp');
const less = require('gulp-less');
const watch = require('gulp-watch');
const batch = require('gulp-batch');
const plumber = require('gulp-plumber');
const jetpack = require('fs-jetpack');
const bundle = require('./bundle');
const utils = require('./utils');

const projectDir = jetpack;
const srcDir = jetpack.cwd('./src');
const destDir = jetpack.cwd('./app');

gulp.task('bundle', function () {
    return Promise.all([
        bundle(srcDir.path('background.js'), destDir.path('background.js')),
        bundle(srcDir.path('app.js'), destDir.path('app.js')),
        bundle(srcDir.path('i18n/index.js'), destDir.path('i18n/index.js')),
        gulp.src(srcDir.path('public')+'/**/*').pipe(gulp.dest(destDir.path('public'))),
        gulp.src(srcDir.path('i18n/lang')+'/**/*').pipe(gulp.dest(destDir.path('i18n/lang')))
    ]);
});

gulp.task('less', function () {
    return gulp.src(srcDir.path('stylesheets/main.less'))
        .pipe(plumber())
        .pipe(less())
        .pipe(gulp.dest(destDir.path('stylesheets')));
});

gulp.task('environment', function () {
    const configFile = 'config/env_' + utils.getEnvName() + '.json';
    projectDir.copy(configFile, destDir.path('env.json'), { overwrite: true });
});

gulp.task('watch', function () {
    const beepOnError = function (done) {
        return function (err) {
            if (err) {
                utils.beepSound();
            }
            done(err);
        };
    };

    watch('src/**/*.js', batch(function (events, done) {
        gulp.start('bundle', beepOnError(done));
    }));
    watch('src/**/*.less', batch(function (events, done) {
        gulp.start('less', beepOnError(done));
    }));
});

gulp.task('build', ['bundle', 'less', 'environment']);
