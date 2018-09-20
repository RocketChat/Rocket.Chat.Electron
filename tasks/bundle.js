'use strict';

const path = require('path');
const { rollup } = require('rollup');
const rollupJson = require('rollup-plugin-json');
const appManifest = require('../package.json');

const nodeBuiltInModules = ['assert', 'buffer', 'child_process', 'cluster', 'console', 'constants', 'crypto', 'dgram',
	'dns', 'domain', 'events', 'fs', 'http', 'https', 'module', 'net', 'os', 'path', 'process', 'punycode', 'querystring',
	'readline', 'repl', 'stream', 'string_decoder', 'timers', 'tls', 'tty', 'url', 'util', 'v8', 'vm', 'zlib'];

const electronBuiltInModules = ['electron'];

const externalModulesList = [
	...nodeBuiltInModules,
	...electronBuiltInModules,
	...Object.keys(appManifest.dependencies),
	...Object.keys(appManifest.devDependencies),
];

const cached = {};

module.exports = async(src, dest, opts = {}) => {
	const inputOptions = {
		input: src,
		external: externalModulesList,
		cache: cached[src],
		plugins: [
			...(opts.rollupPlugins || []),
			rollupJson(),
		],
	};

	const outputOptions = {
		format: 'cjs',
		file: dest,
		intro: '(function () {',
		outro: '})()',
		sourcemap: true,
		sourcemapFile: path.basename(dest),
	};

	const bundle = await rollup(inputOptions);
	cached[src] = bundle;
	await bundle.write(outputOptions);
};
