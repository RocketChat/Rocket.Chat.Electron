const gulp = require('gulp');
const minimist = require('minimist');


let { env } = minimist(process.argv, { default: { env: 'development' } });

const setEnv = (newEnv) => async () => (env = newEnv);
gulp.task('env:development', setEnv('development'));
gulp.task('env:test', setEnv('test'));
gulp.task('env:production', setEnv('production'));

module.exports = () => env;
