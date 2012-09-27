var g = require('garcon');

// create a server which will listen on port 8000 by default
var server = g.Server.create({
// A proxy will be used for any file or request that was not registered in the garcon server
// during build up. The proxies will be handled in the order defined.
// If you want a catch all proxy, put it in the last position

  proxies: [ 
    {
      prefix: '/images', // what is the url prefix of the request?
      host: 'localhost', // to what host should be proxied
      port: 8070, // to what port on the host should be proxied?
      proxyPrefix: '/' // with what url should the proxy request be prefixed?
    },
    { prefix: '/', // this is a catch all proxy 
      host: 'localhost',
      port: 8080,
      proxyPrefix: '/'
    }
  ]
});

var myApp = g.App.create({
  name: 'myapp',
  // adding an application named 'myapp' tells the server to respond to
  // the /myapp url and to create a myapp.html file when saving
  
  theme: 'sc-theme', // what theme to use, will be the class of the body tag
  htmlHead: '<title>myApp</title>', // what tags to include in the header of the generated html

  hasSC: true, // an app will have SC by default, if you don't want this, set to false  
  configSC: {
    version: '1.4.5', // what version of SC do you want for this app... not actively used, for future use
    
    // the frameworkNames property contains an array of SC frameworks that you want to have in your app
    // The standard list is shown below, if you need extra frameworks, you need to include the entire list.
    frameworkNames: "bootstrap jquery runtime foundation datastore desktop animation".w(),
    combineScripts: false // whether you want the javascript files combined as one file
  },
  
  // a array of object literals, describing frameworks.
  // - path: the relative path to the framework from this config file 
  
  // optional framework params
  // - combineScripts: combine the scripts of this framework in one file
  // - combineStylesheets: combine the stylesheets of this framework in one file
  // - isNestedFramework + frameworkNames: if you define isNestedFrameworks, you also have to 
  //   provide a frameworkNames array of frameworks to include. If you want the entire framework
  //   to be included, you can just define a nested Framework as a normal framework
  
  // The options below are valid when the framework is actually a bundle/module
  // - isBundle: if the framework is actually a module, set this to true.
  // - shouldPreload: if true, the bundle is preloaded, so included in the main build
  // - bundleDeps: an array of bundles this bundle depends on
  
  // VERY IMPORTANT:
  // Always include your app as a framework in the list, and preferrable in the last position
  // the frameworks will be parsed in order
  
  frameworks: [
    { path: 'frameworks/sproutcore/themes/empty_theme'},
    { path: 'frameworks/sproutcore/themes/standard_theme'},
    //{ path: 'frameworks/sproutcore/themes/legacy_theme'}, // for SC 1.5
  	{ path: 'frameworks/ki/frameworks/foundation'},
    //{ path: 'frameworks/ki'},
    { path: 'apps/myapp'}
  ]
});

// add the app to the server
server.addApp(myApp);
server.run();
