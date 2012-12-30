/*globals global process*/

var tools = require('./tools'),
    SC = require('sc-runtime'),
    App = require('./app').App, 
    Framework = require('./framework').Framework,
    Proxy = require('./proxy').Proxy,
    Server;

require('./date');

exports.Server = SC.Object.extend({
  
  port: 8000,
  hostname: null,
  proxies: null, // proxy configuration
  _proxies:null, // where the proxies actually will live
  REPL: false, // allow repl?
  loadSCTests: false,
  
  init: function(){
    this.apps = [];
    this.files = [];
    this.startProxies();
    if(this.loadSCTests){
      var testApp = App.create({
        name: 'testapp',
        theme: 'sc-theme',
        htmlHead: '<title>TestApp</title>',
        urlPrefix: '/',
        hasSC: true,        
        frameworks: [
          { path: 'frameworks/sproutcore/themes/empty_theme'},
          { path: 'frameworks/sproutcore/themes/standard_theme'},
          { path: 'frameworks/sproutcore/apps/tests'}
        ]
      });
      this.addApp(testApp);
    }
  },
  
  shouldProxy: false,
  
  startProxies: function(){
    var proxies = this.get('proxies');
    var me = this;
    if(!proxies || !(proxies instanceof Array)) return;
    
    this._proxies = proxies.map(function(proxy){
      proxy.server = me; // add server
      return Proxy.create(proxy);
    });
    this.shouldProxy = true;
  },
  
  appCount: 0,
  
  addApp: function(app){
    var me = this;
    if(!SC.instanceOf(App,app)){
      app = App.create(app);
    }
    if(app.server){ // server already exists, copy files array
      if(app.server.files){
        tools.log('copying app.server files...');
        this.files = app.server.files;         
      }
      app.server = me;
    }
    else app.server = me; // always add the server before building
    
    if(!app.doneBuilding){  // only start building when app hasn't been built and isn't already building.
      if(!app.isBuilding){
        this.appCount += 1;
        tools.log('app is not yet built, so start building...');
        app.build(function(){
          me.apps.push(app);
        });        
      }
    }
    else this.apps.push(app); // otherwise just add, things will be added automatically
    return app;
  },
  
  /*
  Server.prototype.addApp = function(app) {
    if (!(app instanceof App)) {
      app = new App(app);
    }

    app.server = this;

    this.apps.push(app);
    return app;
  };
  */
  
  setDirectory: function(path){
    process.chdir(path);
  },
  
  serve: function(file,request,response){
    var f = function(r){
      var headers = {},
          status = 200;

      if (r.contentType !== undefined) headers['Content-Type'] = r.contentType;
      if (r.lastModified !== undefined) headers['Last-Modified'] = r.lastModified.format('httpDateTime');
      if (r.status !== undefined) status = r.status;

      response.writeHead(status, headers);
      if (r.data !== undefined && r.status !== 304){
        //tools.log('trying to write: ' + r.data);
        if(r.data) response.write(r.data, 'utf8');
        else {
          tools.log('no data detected in file: ' + file.get('path'));
          //tools.log('r.data: ' + r.data);
        }
      } 

      response.end();
    };
    
    file.handler.handle(file,request,f);
  },
    
  onRequest: function(request,response){
    var path = tools.url.parse(request.url).pathname.slice(1),
        file = this.files[path],
        hasProxied = false,
        shouldProxy = this.get('shouldProxy');
    
    //tools.log('shouldProxy? ' + shouldProxy);
    if(this.appCount !== this.apps.length){ // when not ready building yet, send an automatic reloading page...
      response.writeHead(200);
      response.write('<html><body onLoad="window.location.reload();"</body></html>');
      response.end();
      return;
    }
    
    if(file){
      this.serve(file, request, response);
    }
    else {
      if(path === 'sproutcore/tests'){
        var sc = this.apps[0]._frameworks[0];
        sc.tests(request,response);
        return;
      }
      // if requested url is / or /index.html, serve a page with all known apps
      if(shouldProxy){
        this._proxies.forEach(function(proxy){
          if(!hasProxied){
            proxy.process(request,response);
          }
        },this);
        
        //this.proxy.process(request,response);        
      }
      else {
        response.writeHead(404);
        response.end();
      }
    }
  },
  
  run: function(){
    var me = this;
    var processname = "garcon";
    var hostname = this.hostname? this.hostname: 'localhost';
    var f = function(){
      me.onRequest.apply(me,arguments);
    };
    tools.http.createServer(f).on('error',function(err){
      if(err){
        if(err.code === "EOF"){
          tools.log("Error while trying to attach the server. Is the port perhaps taken?");
          process.exit(1);
        }
        else {
          tools.log('Unknown error why trying to attach the server.');
          process.exit(1);
        }
      }  
    }).listen(this.port,this.hostname,function(){
      var url = tools.url.format({ protocol: 'http', hostname: hostname, port: me.port});
      tools.util.puts("Server started on " + url);
      if(process.mainModule && process.mainModule.filename){
        processname += "[" + tools.path.basename(process.mainModule.filename) + "]";
      }
      process.title = processname;
      if(me.REPL){
        me.repl = require('repl');
        me.repl.start().context.server = me;
      }
    });
    
  },
  
  searchFile: function(filename){
    var files = this.get('files');
    if(!files) return [];
    var paths = Object.keys(files);
    var keys = paths.filter(function(p){
      return p.indexOf(filename) >= 0;
    });
    return keys.map(function(k){
      return files[k];
    });
  }
    
    /*
    l.http.createServer(function (request, response) {
      var path = l.url.parse(request.url).pathname.slice(1),
          file = that.files[path];

      if (file === undefined) {
        if (that.shouldProxy()) {
          l.sys.puts('Proxying ' + request.url);
          proxy(request, response);
        } else {
          response.writeHead(404);
          response.end();
        }
      } else {
        serve(file, request, response);
      }
    }).listen(that.port, that.hostname, function() {
      var url = l.url.format({
        protocol: 'http',
        hostname: that.hostname ? that.hostname : 'localhost',
        port: that.port
      });
      l.sys.puts('Server started on ' + url);
    });
    */
  //}
  
});
/*
self.Server = function(options) {
  var key;
  
  this.port = 8000;
  this.hostname = null;
  this.proxyHost = null;
  this.proxyPort = null;
  this.proxyPrefix = '';
  
  this.apps = [];
  this.files = [];
  
  for (key in options) {
    this[key] = options[key];
  }
};

Server = self.Server;

Server.prototype.shouldProxy = function() {
  return this.proxyHost !== null && this.proxyPort !== null;
};

Server.prototype.addApp = function(app) {
  if (!(app instanceof App)) {
    app = new App(app);
  }
  
  app.server = this;
  
  this.apps.push(app);
  return app;
};

Server.prototype.setDirectory = function(path) {
  process.chdir(path);
};

Server.prototype.run = function() {
  
  var that = this;
  
  var serve = function(file, request, response) {
    file.handler.handle(file, request, function(r) {
      var headers = {},
          status = 200;

      if (r.contentType !== undefined) headers['Content-Type'] = r.contentType;
      if (r.lastModified !== undefined) headers['Last-Modified'] = r.lastModified.format('httpDateTime');
      if (r.status !== undefined) status = r.status;

      response.writeHead(status, headers);

      if (r.data !== undefined) response.write(r.data, 'utf8');

      response.end();
    });
  };
  
  var proxy = function(request, response) {
    var body = '';
    
    request.addListener('data', function(chunk) {
      body += chunk;
    });

    request.addListener('end', function() {
      var proxyClient, proxyRequest,
          url = request.url;

      if (that.proxyPrefix.length > 0 && url.indexOf(that.proxyPrefix) < 0) {
        url = that.proxyPrefix + url;
      }

      proxyClient = l.http.createClient(that.proxyPort, that.proxyHost);

      proxyClient.addListener('error', function(err) {
        l.sys.puts('ERROR: "' + err.message + '" for proxy request on ' + that.proxyHost + ':' + that.proxyPort);
        response.writeHead(404);
        response.end();
      });

      request.headers.host = that.proxyHost;
      request.headers['content-length'] = body.length;
      request.headers['X-Forwarded-Host'] = request.headers.host + ':' + that.port;
      if (that.proxyPort != 80) request.headers.host += ':' + that.proxyPort;
      
      proxyRequest = proxyClient.request(request.method, url, request.headers);

      if (body.length > 0) {
        proxyRequest.write(body);
      }

      proxyRequest.addListener('response', function(proxyResponse) {
        response.writeHead(proxyResponse.statusCode, proxyResponse.headers);
        proxyResponse.addListener('data', function(chunk) {
          response.write(chunk);
        });
        proxyResponse.addListener('end', function() {
          response.end();
        });
      });

      proxyRequest.end();
    });
  };
  
  l.http.createServer(function (request, response) {
    var path = l.url.parse(request.url).pathname.slice(1),
        file = that.files[path];
        
    if (file === undefined) {
      if (that.shouldProxy()) {
        l.sys.puts('Proxying ' + request.url);
        proxy(request, response);
      } else {
        response.writeHead(404);
        response.end();
      }
    } else {
      serve(file, request, response);
    }
  }).listen(that.port, that.hostname, function() {
    var url = l.url.format({
      protocol: 'http',
      hostname: that.hostname ? that.hostname : 'localhost',
      port: that.port
    });
    l.sys.puts('Server started on ' + url);
  });
  
};
*/