const { spawn } = require('child_process');

const electron = require('electron');
const { parallel, series, task } = require('gulp');

require('./tasks');

task('start:electron', () => spawn(electron, [__dirname], { stdio: 'inherit', shell: true }));

task('start', series('build', parallel('watch', 'start:electron')));
