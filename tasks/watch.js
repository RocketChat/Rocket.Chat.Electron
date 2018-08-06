'use strict';

const gulp = require('gulp');
const batch = require('gulp-batch');
const watch = require('gulp-watch');
const { beepSound, srcDir, appDir } = require('./utils');

gulp.task('watch', () => {
  const beepOnError = done => err => {
      if (err) {
          beepSound();
      }
      done(err);
  };

  watch(srcDir.path('**/*.js'), batch((events, done) => {
      gulp.start('bundle', beepOnError(done));
  }));

  watch(srcDir.path('**/*.less'), batch((events, done) => {
      gulp.start('less', beepOnError(done));
  }));
});
