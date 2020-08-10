module.exports = {
	extends: [
		'@rocket.chat/eslint-config',
	],
	plugins: ['react', 'react-hooks'],
	parser: 'babel-eslint',
	rules: {
		'import/order': ['error', {
			'newlines-between': 'always',
			groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
			alphabetize: {
				order: 'asc',
			},
		}],
		'react/jsx-uses-react': 'error',
		'react/jsx-uses-vars': 'error',
		'react/jsx-no-undef': 'error',
		'react/jsx-fragments': ['error', 'syntax'],
		'react/react-in-jsx-scope': 'error',
		'jsx-quotes': ['error', 'prefer-single'],
		'generator-star-spacing': ['error', 'before'],
		'react-hooks/rules-of-hooks': 'error',
		'react-hooks/exhaustive-deps': 'warn',
	},
	settings: {
		'import/resolver': {
			node: {
				extensions: [
					'.js',
					'.ts',
					'.tsx',
				],
			},
		},
		react: {
			version: 'detect',
		},
	},
	env: {
		browser: true,
		commonjs: true,
		es6: true,
		node: true,
		jest: true,
	},
	overrides: [
		{
			files: [
				'**/*.ts',
				'**/*.tsx',
			],
			extends: [
				'plugin:@typescript-eslint/recommended',
				'plugin:@typescript-eslint/eslint-recommended',
				'@rocket.chat/eslint-config',
			],
			globals: {
				Atomics: 'readonly',
				SharedArrayBuffer: 'readonly',
			},
			parser: '@typescript-eslint/parser',
			parserOptions: {
				sourceType: 'module',
				ecmaVersion: 2018,
				warnOnUnsupportedTypeScriptVersion: false,
				ecmaFeatures: {
					experimentalObjectRestSpread: true,
					legacyDecorators: true,
				},
			},
			plugins: [
				'react',
				'react-hooks',
				'@typescript-eslint',
			],
			rules: {
				'func-call-spacing': 'off',
				indent: 'off',
				'import/order': ['error', {
					'newlines-between': 'always',
					groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
					alphabetize: {
						order: 'asc',
					},
				}],
				'no-extra-parens': 'off',
				'no-useless-constructor': 'off',
				'no-empty-function': 'off',
				'no-spaced-func': 'off',
				'no-unused-vars': 'off',
				'react/jsx-uses-react': 'error',
				'react/jsx-uses-vars': 'error',
				'react/jsx-no-undef': 'error',
				'react/jsx-fragments': ['error', 'syntax'],
				'react/react-in-jsx-scope': 'error',
				'jsx-quotes': ['error', 'prefer-single'],
				'generator-star-spacing': ['error', 'before'],
				'react-hooks/rules-of-hooks': 'error',
				'react-hooks/exhaustive-deps': 'warn',
				'@typescript-eslint/ban-ts-ignore': 'off',
				'@typescript-eslint/func-call-spacing': 'error',
				'@typescript-eslint/indent': [
					'error',
					'tab',
					{
						SwitchCase: 1,
					},
				],
				'@typescript-eslint/no-extra-parens': [
					'error',
					'all',
					{
						conditionalAssign: true,
						nestedBinaryExpressions: false,
						returnAssign: true,
						ignoreJSX: 'all',
						enforceForArrowConditionals: false,
					},
				],
				'@typescript-eslint/no-explicit-any': 'off',
				'@typescript-eslint/interface-name-prefix': 'off',
				'@typescript-eslint/explicit-function-return-type': ['warn', {
					allowExpressions: true,
				}],
				'@typescript-eslint/no-unused-vars': 'off',
				'@typescript-eslint/no-unused-vars-experimental': 'warn',
			},
			env: {
				browser: true,
				commonjs: true,
				es6: true,
				node: true,
			},
			settings: {
				'import/resolver': {
					node: {
						extensions: [
							'.js',
							'.ts',
							'.tsx',
						],
					},
				},
				react: {
					version: 'detect',
				},
			},
		},
	],
};
