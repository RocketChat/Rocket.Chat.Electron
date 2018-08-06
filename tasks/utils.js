'use strict';

const argv = require('minimist')(process.argv);

exports.getEnvName = () => argv.env || 'development';

exports.beepSound = () => process.stdout.write('\u0007');
