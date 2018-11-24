const path = require('path');
const builtinModules = require('builtin-modules');
const appManifest = require('../package.json');
const { rollup } = require('rollup');
const json = require('rollup-plugin-json');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');


const cached = {};

module.exports = async(src, dest, { rollupPlugins = [] } = {}) => {
	const inputOptions = {
		input: src,
		external: [
			...builtinModules,
			...Object.keys(appManifest.dependencies),
			...Object.keys(appManifest.devDependencies),
		],
		cache: cached[src],
		plugins: [
			...rollupPlugins,
			json(),
			nodeResolve(),
			commonjs(),
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
