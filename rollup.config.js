import builtinModules from 'builtin-modules';
import jetpack from 'fs-jetpack';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import nodeResolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';

import appManifest from './package.json';

const NODE_ENV = process.env.NODE_ENV || 'development';

const bundleOptions = {
	external: [
		...builtinModules,
		...Object.keys(appManifest.dependencies),
		...Object.keys(appManifest.devDependencies),
	],
	plugins: [
		json(),
		replace({
			'process.env.BUGSNAG_API_KEY': JSON.stringify(process.env.BUGSNAG_API_KEY),
			'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
		}),
		babel(),
		nodeResolve(),
		commonjs(),
	],
};

const createTestEntries = () => {
	if (NODE_ENV !== 'test') {
		return [];
	}

	const mainSpecs = jetpack.find('src/main', { matching: '*.spec.js' });
	const rendererSpecs = [
		...jetpack.find('src/scripts', { matching: '*.spec.js' }),
		...jetpack.find('src/preload', { matching: '*.spec.js' }),
	];
	return [
		...mainSpecs.length
			? [{
				input: mainSpecs,
				...bundleOptions,
				output: {
					dir: 'app/main.specs',
					format: 'cjs',
					sourcemap: true,
				},
			}]
			: [],
		...rendererSpecs.length
			? [{
				input: rendererSpecs,
				...bundleOptions,
				output: {
					dir: 'app/renderer.specs',
					format: 'cjs',
					sourcemap: true,
				},
			}]
			: [],
	];
};

export default [
	{
		input: 'src/main.js',
		...bundleOptions,
		output: {
			file: 'app/main.js',
			format: 'cjs',
			sourcemap: true,
		},
	},
	{
		input: 'src/app.js',
		...bundleOptions,
		output: [
			{
				file: 'app/app.js',
				format: 'cjs',
				sourcemap: true,
			},
		],
	},
	{
		input: 'src/i18n/index.js',
		...bundleOptions,
		output: [
			{
				file: 'app/i18n/index.js',
				format: 'cjs',
				intro: '(function () {',
				outro: '})()',
				sourcemap: true,
			},
		],
	},
	{
		input: 'src/preload.js',
		...bundleOptions,
		output: [
			{
				file: 'app/preload.js',
				format: 'cjs',
				sourcemap: true,
			},
		],
	},
	{
		input: 'src/preload.js',
		...bundleOptions,
		output: [
			{
				file: 'app/preload.js',
				format: 'cjs',
				sourcemap: true,
			},
		],
	},
	...createTestEntries(),
];
