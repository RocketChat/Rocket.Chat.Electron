module.exports = {
  exclude: 'node_modules/**',
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          electron: '42',
        },
      },
    ],
    [
      '@babel/preset-react',
      {
        runtime: 'automatic',
      },
    ],
    '@babel/preset-typescript',
  ],
  plugins: ['@babel/plugin-syntax-import-attributes'],
};
