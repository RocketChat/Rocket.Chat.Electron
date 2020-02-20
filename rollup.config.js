import builtinModules from 'builtin-modules';
import glob from 'glob';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import copy from 'rollup-plugin-copy';
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
		copy({
			targets: [
				{ src: 'src/i18n/*.i18n.json', dest: 'app/i18n' },
				{ src: 'src/public/*', dest: 'app/public' },
				{ src: 'node_modules/@rocket.chat/icons/dist/*', dest: 'app/icons' },
			],
		}),
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

	const rendererSpecs = [
		...glob.sync('src/**/*.spec.js'),
	];
	return [
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
		input: 'src/preload.js',
		...bundleOptions,
		output: [
			{
				file: 'app/preload.js',
				format: 'cjs',
				sourcemap: 'inline',
			},
		],
	},
	...createTestEntries(),
];
