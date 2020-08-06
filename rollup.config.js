import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import run from '@rollup/plugin-run';
import typescript from '@rollup/plugin-typescript';
import builtinModules from 'builtin-modules';
import electron from 'electron';
import copy from 'rollup-plugin-copy';

import appManifest from './package.json';

const NODE_ENV = process.env.NODE_ENV || 'development';
const watchMode = process.env.ROLLUP_WATCH === 'true';

export default [
	{
		external: [
			...builtinModules,
			...Object.keys(appManifest.dependencies),
			...Object.keys(appManifest.devDependencies),
		].filter((moduleName) => moduleName !== '@bugsnag/js'),
		input: 'src/app.js',
		plugins: [
			json(),
			replace({
				'process.env.BUGSNAG_API_KEY': JSON.stringify(process.env.BUGSNAG_API_KEY),
				'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
			}),
			typescript({ noEmitOnError: false }),
			babel({
				babelHelpers: 'bundled',
			}),
			nodeResolve({
				browser: true,
			}),
			commonjs(),
		],
		output: {
			dir: 'app',
			format: 'cjs',
			sourcemap: true,
		},
	},
	{
		external: [
			...builtinModules,
			...Object.keys(appManifest.dependencies),
			...Object.keys(appManifest.devDependencies),
		].filter((moduleName) => moduleName !== '@bugsnag/js'),
		input: 'src/preload.js',
		plugins: [
			json(),
			replace({
				'process.env.BUGSNAG_API_KEY': JSON.stringify(process.env.BUGSNAG_API_KEY),
				'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
			}),
			typescript({ noEmitOnError: false }),
			babel({
				babelHelpers: 'bundled',
			}),
			nodeResolve({
				browser: true,
			}),
			commonjs(),
		],
		output: [
			{
				dir: 'app',
				format: 'cjs',
				sourcemap: 'inline',
			},
		],
	},
	{
		external: [
			...builtinModules,
			...Object.keys(appManifest.dependencies),
			...Object.keys(appManifest.devDependencies),
		],
		input: 'src/main.js',
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
			typescript({ noEmitOnError: false }),
			babel({
				babelHelpers: 'bundled',
			}),
			nodeResolve(),
			commonjs(),
			watchMode && run({
				execPath: electron,
				execArgv: ['.'],
			}),
		],
		output: {
			dir: 'app',
			format: 'cjs',
			sourcemap: 'inline',
		},
	},
];
