module.exports = {
  extends: [
    '@rocket.chat/eslint-config',
  ],
  plugins: ['react', 'react-hooks'],
  parser: 'babel-eslint',
  rules: {
    'generator-star-spacing': ['error', 'before'],
    'import/order': ['error', {
      'newlines-between': 'always',
      groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
      alphabetize: {
        order: 'asc',
      },
    }],
    indent: ['error', 2, {
      SwitchCase: 1,
    }],
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error',
    'react/jsx-no-undef': 'error',
    'react/jsx-fragments': ['error', 'syntax'],
    'react/react-in-jsx-scope': 'error',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'jsx-quotes': ['error', 'prefer-single'],
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
        'generator-star-spacing': ['error', 'before'],
        indent: 'off',
        'import/order': ['error', {
          'newlines-between': 'always',
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          alphabetize: {
            order: 'asc',
          },
        }],
        'jsx-quotes': ['error', 'prefer-single'],
        'no-empty-function': 'off',
        'no-extra-parens': 'off',
        'no-spaced-func': 'off',
        'no-undef': 'off',
        'no-unused-vars': 'off',
        'no-useless-constructor': 'off',
        'no-use-before-define': 'off',
        'react/jsx-uses-react': 'error',
        'react/jsx-uses-vars': 'error',
        'react/jsx-no-undef': 'error',
        'react/jsx-fragments': ['error', 'syntax'],
        'react/react-in-jsx-scope': 'error',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        '@typescript-eslint/ban-ts-ignore': 'off',
        '@typescript-eslint/func-call-spacing': 'error',
        '@typescript-eslint/indent': ['error', 2, {
          SwitchCase: 1,
        }],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-extra-parens': ['error', 'all', {
          conditionalAssign: true,
          nestedBinaryExpressions: false,
          returnAssign: true,
          ignoreJSX: 'all',
          enforceForArrowConditionals: false,
        }],
        '@typescript-eslint/no-use-before-define': ['error'],
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
