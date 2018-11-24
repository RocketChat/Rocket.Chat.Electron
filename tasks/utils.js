const minimist = require('minimist');

const { env } = minimist(process.argv, { default: { env: 'development' } });

exports.getEnvName = () => env;
exports.env = env;
