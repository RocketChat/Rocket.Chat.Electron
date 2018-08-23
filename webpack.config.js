const path = require('path');

module.exports = {
    entry: "./src/preferences.js",
    output: {
        path: path.resolve('app'),
        filename: 'preferences.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader"
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    }
};