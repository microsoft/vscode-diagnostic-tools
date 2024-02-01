import { CleanWebpackPlugin } from "clean-webpack-plugin";
import * as path from "path";
import * as webpack from "webpack";

const r = (file: string) => path.resolve(__dirname, file);
module.exports = (env: any) => {
    const target = env.TARGET || 'desktop';
    return ({
        target: "node",
        entry: r("./src/index"),
        output: {
            path: r(`./dist/${target}`),
            filename: "index.js",
            libraryTarget: "commonjs2",
            devtoolModuleFilenameTemplate: "../[resource-path]",
        },
        devtool: "source-map",
        externals: {
            vscode: "commonjs vscode",
            //fs: "{}",
            //child_process: "null",
        },
        resolve: {
            extensions: [".ts", ".js"],
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: "ts-loader",
                        },
                    ],
                },
            ],
        },
        node: {
            __dirname: false,
        },
        plugins: [
            new CleanWebpackPlugin(),
            new webpack.DefinePlugin({
                "process.env.TARGET": JSON.stringify(target)
            })
        ],
    }) as webpack.Configuration;
};
