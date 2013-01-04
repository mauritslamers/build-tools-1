var tools = require('./tools');
var SC = require('sc-runtime');
var sys = tools.util;

exports.Proxy = SC.Object.extend({
  port: null,
  host: null,
  proxyPrefix: null,
  prefix: null,
  server: null,
  
  onData: function(chunk,body){
    if(body === null) body = '';
    body += chunk;
    return body;
  },
  
  onEnd: function(request,response,body){
    var proxyClient, proxyRequest, proxyReq,
        me = this,
        //body = this.get('body') || '', // if no data, body is empty
        bodyLength = body.length,
        url = request.url;
    

    var errcb = function(err){
      tools.util.puts('ERROR: "' + err.message + '" for proxy request on ' + me.host + ':' + me.port);
      response.writeHead(404);
      response.write(request.url + " was not found in the project files or at one of the proxies.");
      response.end();
      //me.data = '';
    };      

    if (this.proxyPrefix.length > 0 && url.indexOf(this.proxyPrefix) < 0) {
      url = this.proxyPrefix + url;
    }
    
    proxyReq = tools.http.request({
        host: this.host,
        port: this.port,
        path: url,
        method: request.method,
        headers: request.headers
      }, 
      function(proxyres){
        response.writeHead(proxyres.statusCode, proxyres.headers);
        proxyres.on('data', function(chunk){
          response.write(chunk);
        });
        proxyres.on('end',function(){
          response.end();
        });
      });
    
    proxyReq.on('error', errcb);
  
    request.headers.host = this.host;
    request.headers['content-length'] = bodyLength;
    request.headers['X-Forwarded-Host'] = request.headers.host + ':' + this.server.port;
    if (this.port !== 80) request.headers.host += ':' + this.port;
    
    if (bodyLength > 0) {
      //sys.log('about to write body: ' + body);
      proxyReq.write(body);
    }

    //tools.util.log('proxy request: ' + tools.util.inspect(proxyRequest));
    proxyReq.end();    
  },
  
  process: function(request,response){
    var me = this;
    var prefix = this.prefix;
    var path = tools.url.parse(request.url).pathname;

    var data = "";
    
    if(path.substr(0,prefix.length) === prefix){
      tools.util.puts('Proxying ' + request.url);
      request.addListener('data',function(chunk){
        data = me.onData.call(me,chunk,data);
      });

      request.addListener('end',function(){
        me.onEnd.call(me,request,response,data);
      });
      return true;
    }
    else return false;
  }
  
});
/*
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
      util.puts('ERROR: "' + err.message + '" for proxy request on ' + that.proxyHost + ':' + that.proxyPort);
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
}; */