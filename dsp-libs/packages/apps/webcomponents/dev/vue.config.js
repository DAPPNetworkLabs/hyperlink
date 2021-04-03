const path = require('path');
const webpack = require('webpack');
var HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HtmlBeautifyPlugin = require('html-beautify-webpack-plugin')
function resolveSrc(_path) {
  return path.join(__dirname, _path);
}
const plugOpts = {
  templateContent: "<div id='app'></div>",
  // inject:false,
  // template: 'index.ejs',
  template:'src/index.ejs',
  inlineSource: '.(js|css)$' // embed all javascript and css inline
};

module.exports = {
  lintOnSave: false,
  configureWebpack: {
    // Set up all the aliases we use in our app.
    resolve: {
      alias: {
        src: resolveSrc('src'),
        'chart.js': 'chart.js/dist/Chart.js'
      }
    },
    module:{
      rules:[
        { test: /\.(png|jpg|svg)$/, loader: 'url-loader?limit=8192000' }, // inline base64 URLs for <=8k images, direct URLs for the rest
      ]
    }
    // plugins: [
    //   new webpack.optimize.LimitChunkCountPlugin({
    //     maxChunks: 6
    //   }),
    //   new HtmlWebpackPlugin(plugOpts),
    //   new HtmlWebpackInlineSourcePlugin(),
    //   new HtmlBeautifyPlugin({
    //     html:{
    //       end_with_newline: true,
    //       indent_size: 2,
    //       indent_with_tabs: true,
    //       indent_inner_html: true,
    //       preserve_newlines: true,
    //       unformatted: ['p', 'i', 'b', 'span']
    //     },
    //     replace: [ ' type="text/javascript"' ]
    // }),
    // ]
  },
  pwa: {
    name: 'Vue Light Bootstrap Dashboard',
    themeColor: '#344675',
    msTileColor: '#344675',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: '#344675'
  },
  css: {
    // Enable CSS source maps.
    // sourceMap: process.env.NODE_ENV !== 'production'
  },
  chainWebpack: config => {
    config.plugin('preload')
      .tap(args => {
        args[0].fileBlacklist.push(/app\.js/)
        return args
      })
    config.plugin('inline-source')
      .use(require('html-webpack-inline-source-plugin'))
    config
      .plugin('html')
      .tap(args => {
        args[0].templateContent = '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" integrity="sha384-wvfXpqpZZVQGK6TAh5PVlGOfQNHSoD2xbE+QkPxCAFlNEevoEH3Sl0sibVcOQVnN" crossorigin="anonymous">\n<div id="app"></div>'
        args[0].inlineSource = '(\.css|app\.*\.js$|chunk-vendors\.*\.js)'
        return args
      })
      config.plugin('beutify').use(require('html-beautify-webpack-plugin'))
      config.plugin('beutify').tap(args=>{
        return [{
                  html:{
          end_with_newline: false,
          indent_size: 2,
          indent_with_tabs: true,
          indent_inner_html: true,
          preserve_newlines: false,
          unformatted: ['p', 'i', 'b', 'span']
        },
        replace:[{test:'<head>',with:"<div>"},
          {test:'</head>',with:"</div>"},
          {test:'</script>\n\n',with:"</script>\n"}]
        }]        
      })
  }

  // chainWebpack: config => {
  //   config.plugin('preload')
  //     .tap(args => {
  //       args[0].fileBlacklist.push(/\.css/, /app\.js/)
  //       return args
  //     })
  //   config.plugin('inline-source')
  //     .use(require('html-webpack-inline-source-plugin'))
  //     // config
  //     // .plugin('html').use(require('html-webpack-plugin'))

  //     config
  //     .plugin('html').tap(args => {
  //       args = [{}];
  //       args[0].inlineSource = '(\.css|app\.js$)'
  //       args[0].templateContent = "\n<div id='app'></div>\n"
  //       return args
  //     });
  //   config.plugin('beutify').use('html-beautify-webpack-plugin')
  //     config.plugin('beutify').tap(args => {
  //       args = [{}];

  //       args[0].html = 
  //       return args
  //     });      
  // }

};
