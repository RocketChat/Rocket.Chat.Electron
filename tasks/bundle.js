'use strict';

const path = require('path');
const jetpack = require('fs-jetpack');
const rollup = require('rollup').rollup;

const nodeBuiltInModules = ['assert', 'buffer', 'child_process', 'cluster',
    'console', 'constants', 'crypto', 'dgram', 'dns', 'domain', 'events',
    'fs', 'http', 'https', 'module', 'net', 'os', 'path', 'process', 'punycode',
    'querystring', 'readline', 'repl', 'stream', 'string_decoder', 'timers',
    'tls', 'tty', 'url', 'util', 'v8', 'vm', 'zlib'];

const electronBuiltInModules = ['electron'];

const generateExternalModulesList = function () {
    const appManifest = jetpack.read('./package.json', 'json');
    return [].concat(
        nodeBuiltInModules,
        electronBuiltInModules,
        Object.keys(appManifest.dependencies),
        Object.keys(appManifest.devDependencies)
    );
};

const cached = {};

module.exports = function (src, dest, opts) {
    opts = opts || {};
    opts.rollupPlugins = opts.rollupPlugins || [];
    return rollup({
        input: src,
        external: generateExternalModulesList(),
        cache: cached[src],
        plugins: opts.rollupPlugins,
    })
        .then(function (bundle) {
            cached[src] = bundle;

            const jsFile = path.basename(dest);
            return bundle.generate({
                format: 'cjs',
                sourcemap: true,
                sourcemapFile: jsFile,
            });
        })
        .then(function (result) {
            // Wrap code in self invoking function so the variables don't
            // pollute the global namespace.
            const isolatedCode = '(function () {' + result.code + '\n}());';
            const jsFile = path.basename(dest);
            return Promise.all([
                jetpack.writeAsync(dest, isolatedCode + '\n//# sourcemappingURL=' + jsFile + '.map'),
                jetpack.writeAsync(dest + '.map', result.map.toString()),
            ]);
        });
};
