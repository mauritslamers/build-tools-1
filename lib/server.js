/*globals global process*/

var tools = require('./tools'),
    App = require('./app').App, 
    Framework = require('./framework').Framework,
    Proxy = require('./proxy').Proxy,
    Server;

if(!global.SC) require('./thoth_sc');

require('./date');

exports.Server = SC.Object.extend({
  
  port: 8000,
  hostname: null,
  proxyHost: null,
  proxyPort: null,
  proxyPrefix: '',
  proxy: null,
  
  init: function(){
    this.apps = [];
    this.files = [];
    if(!this.proxy){
      this.proxy = Proxy.create({ 
        host: this.proxyHost, 
        port: this.proxyPort,
        prefix: this.proxyPrefix,
        server: this
      });
    } 
  },
  
  shouldProxy: function(){
    return this.proxyHost !== null && this.proxyPort !== null;
  }.property('proxyHost','proxyPort'),
  
  addApp: function(app){
    if(!SC.instanceOf(App,app)){
      app = App.create(app);
    }
    app.set('server',this);
    this.apps.push(app);
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
      if (r.data !== undefined && r.status !== 304) response.write(r.data, 'utf8');

      response.end();
    };
    
    file.handler.handle(file,request,f);
  },
  
  
  onRequest: function(request,response){
    var path = tools.url.parse(request.url).pathname.slice(1),
        file = this.files[path],
        shouldProxy = this.get('shouldProxy');
    
    //tools.log('shouldProxy? ' + shouldProxy);
    
    if(file){
      this.serve(file, request, response);
    }
    else {
      if(shouldProxy){
        tools.util.puts('Proxying ' + request.url);
        this.proxy.process(request,response);        
      }
      else {
        response.writeHead(404);
        response.end();
      }
    }
  },
  
  run: function(){
    var me = this;
    var hostname = this.hostname? this.hostname: 'localhost';
    var f = function(){
      me.onRequest.apply(me,arguments);
    };
    tools.http.createServer(f).listen(this.port,this.hostname,function(){
      var url = tools.url.format({ prototol: 'http', hostname: hostname, port: this.port});
      tools.util.puts("Server started on " + url);
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