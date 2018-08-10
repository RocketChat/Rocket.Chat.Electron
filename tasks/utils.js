'use strict';

const jetpack = require('fs-jetpack');
const minimist = require('minimist');

const argv = minimist(process.argv);

exports.getEnvName = () => argv.env || 'development';

exports.beepSound = () => process.stdout.write('\u0007');

exports.appDir = jetpack.cwd('app');
exports.configDir = jetpack.cwd('config');
exports.srcDir = jetpack.cwd('src');
