const builtinModules = require('builtin-modules');
const jetpack = require('fs-jetpack');
const path = require('path');
const { rollup } = require('rollup');
const commonjs = require('rollup-plugin-commonjs');
const istanbul = require('rollup-plugin-istanbul');
const json = require('rollup-plugin-json');
const nodeResolve = require('rollup-plugin-node-resolve');
const appManifest = require('../package.json');


const cached = {};

const bundle = async(src, dest, { coverage = false, rollupPlugins = [] } = {}) => {
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
			...(coverage ? [
				istanbul({
					exclude: ['**/*.spec.js', '**/*.specs.js'],
					sourcemap: true,
				}),
			] : []),
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

const bundleMany = async(srcDirPath, matching, dest, options) => {
	const srcDir = jetpack.cwd(srcDirPath);
	const src = srcDir.path(path.basename(dest));

	const entryFileContent = (await srcDir.findAsync({ matching }))
		.map((path) => `import './${ path.replace(/\\/g, '/') }';`)
		.join('\n');

	await jetpack.writeAsync(src, entryFileContent);
	await bundle(src, dest, options);
	await jetpack.removeAsync(src);
};

module.exports = bundle;
module.exports.many = bundleMany;
