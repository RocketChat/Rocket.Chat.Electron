module.exports = {
	exclude: 'node_modules/**',
	presets: [
		[
			'@babel/preset-env',
			{
				targets: {
					electron: 7,
				},
			},
		],
	],
	plugins: [
		'@babel/plugin-proposal-function-bind',
		'@babel/plugin-proposal-class-properties',
	],
};
