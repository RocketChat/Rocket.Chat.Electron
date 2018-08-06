'use strict';

const gulp = require('gulp');
const less = require('gulp-less');
const watch = require('gulp-watch');
const batch = require('gulp-batch');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
const bundle = require('./bundle');
const utils = require('./utils');

gulp.task('public', () => {
    return gulp.src('src/public/**/*')
        .pipe(plumber())
        .pipe(gulp.dest('app/public'));
});

gulp.task('i18n', () => {
    return gulp.src('src/i18n/lang/**/*')
        .pipe(plumber())
        .pipe(gulp.dest('app/i18n/lang'));
});

gulp.task('bundle', () => {
    return Promise.all([
        bundle('src/background.js', 'app/background.js'),
        bundle('src/app.js', 'app/app.js'),
        bundle('src/i18n/index.js', 'app/i18n/index.js')
    ]);
});

gulp.task('less', () => {
    return gulp.src('src/stylesheets/main.less')
        .pipe(plumber())
        .pipe(less())
        .pipe(gulp.dest(('app/stylesheets')));
});

gulp.task('environment', () => {
    return gulp.src(`config/env_${ utils.getEnvName() }.json`)
        .pipe(plumber())
        .pipe(rename('env.json'))
        .pipe(gulp.dest('app/'));
});

gulp.task('watch', () => {
    const beepOnError = done => err => {
        if (err) {
            utils.beepSound();
        }
        done(err);
    };

    watch('src/**/*.js', batch((events, done) => {
        gulp.start('bundle', beepOnError(done));
    }));

    watch('src/**/*.less', batch((events, done) => {
        gulp.start('less', beepOnError(done));
    }));
});

gulp.task('build', [ 'public', 'i18n', 'bundle', 'less', 'environment' ]);
