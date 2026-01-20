const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
  mode: argv.mode || 'development',
  devtool: isProduction ? false : 'inline-source-map',
  entry: {
    'service-worker': './src/background/service-worker.ts',
    'content-script': './src/content/index.ts',
    'popup': './src/popup/index.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  optimization: {
    minimize: isProduction,
    minimizer: isProduction ? [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,  // Remove console.* in production
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
          },
          format: {
            comments: false  // Remove all comments in production
          }
        },
        extractComments: false
      })
    ] : [],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { 
          from: 'assets', 
          to: 'assets',
          // Exclude large files that aren't needed in the build
          globOptions: {
            ignore: [
              '**/kala-icon-inv-1024.png',   // Too large (285 KiB), not needed
              '**/kala-icon-inv-1024.webp',  // Too large, not needed for extension
              '**/kala-icon.png',             // Too large (285 KiB), replaced by smaller versions
              '**/icon.webp',                 // Old icon format
              '**/.DS_Store'                  // macOS system file
            ]
          }
        },
        { from: 'src/popup/popup.html', to: 'popup.html' }
      ]
    })
  ],
  performance: {
    // Increase asset size limit for extension builds (icons can be larger)
    maxAssetSize: 300000,  // 300 KiB
    maxEntrypointSize: 300000,
    hints: isProduction ? 'warning' : false
  }
  };
};

