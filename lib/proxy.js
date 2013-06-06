var tools = require('./tools');
var SC = require('sc-runtime');
var sys = tools.util;

exports.Proxy = SC.Object.extend({

  port: null,
  host: null,
  proxyPrefix: null,
  prefix: null,
  server: null,

  process: function(origReq,origResp){
    var prefix = this.prefix;
    var path = tools.url.parse(origReq.url).pathname;
    var proxyReq;

    if(path.substr(0,prefix.length) === prefix){
      proxyReq = tools.http.request({
          host: this.host,
          port: this.port,
          path: origReq.url,
          method: origReq.method,
          headers: origReq.headers,
          agent: false
        },
        function(proxyres){
          //SC.Logger.log("proxyReq callback");
          origResp.writeHead(proxyres.statusCode, proxyres.headers);
          proxyres.on('data', function(chunk){
            origResp.write(chunk);
          });
          proxyres.on('end',function(){
            origResp.end();
          });
        }
      );

      // attach data
      origReq.on('data', function(chunk){
        proxyReq.write(chunk);
      });

      origReq.on('end', function(){
        proxyReq.end();
      });

      proxyReq.on('error', function(err){
        tools.util.puts('ERROR: "' + err.message + '" for proxy request on ' + me.host + ':' + me.port);
        origResp.writeHead(404);
        origResp.write(request.url + " was not found in the project files or at one of the proxies.");
        origResp.end();
      });

      // origReq.headers.host = this.host;
      // origReq.headers['content-length'] = bodyLength;
      // origReq.headers['X-Forwarded-Host'] = request.headers.host + ':' + this.server.port;
      // if (this.port !== 80) request.headers.host += ':' + this.port;

    //tools.util.log('proxy request: ' + tools.util.inspect(proxyRequest));
    // tools.log('sending proxy request...');
    // proxyReq.end();
    }
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