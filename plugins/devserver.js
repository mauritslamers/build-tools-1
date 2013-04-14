// Default server plugin, transforms incoming requests to 
var SC = require('sc-runtime');
var tools = require('../lib/tools');
var HttpFile = require('../lib/html_file');
var config = require('../lib/config');
//// server interface, should be sort of the same as the file content interface
// _getFileCbs: null,
// 
// getFile: function(url,callback){
//   if(!this._getFileCbs) this._getFileCbs = {};
//   if(this.setupInFlight){
//     
//   }
// }

module.exports = SC.Object.extend({
  
  name: 'devserver',
  type: "server", // one of "file","framework","server","save"
  
  /*
    function to return an url for a specific file path,
    the default function will use the config.pathsToExclude to parse the path
    Override with something else if the schema needs to be different.
  */
  urlFor: function(file){
    var p = file.get('path');
    var prefix = this.get('urlPrefix');

    if(!p) return "";
    else {
      var ret = config.pathsToExclude.reduce(function(prev,next){
        prev = prev.replace(next,"");
      },p);
      if(prefix && prefix[prefix.length-1] !== "/") prefix += "/";
      return prefix + ret;
    }
  },
  
  process: function(app,request,response){
    var url, filteredApps, app;
    if(request.method !== "GET") return false;
    url = request.url.split("/");
    filteredApps = apps.filter(function(a){
      if(a.get('name') === url[1]) return true; // match
    });
    if(filteredApps.length === 0) return false; // no matching app, proxy
    // filteredApps should be length one, the build tools should not allow two apps with the same name
    app = filteredApps[0];
    if(url.length === 2 || (url.length === 3 && url[2] === "")){
      // serve main index
      HttpFile.create({
        stylesheets: app.get('stylesheets'),
        scripts: app.get('scripts')
      }).read(function(content){
        response.writeHead(200);
        response.write(content);
        response.end();
      });
      return true;
    }
    else {
      // serve file from app
      
    }
    return true; // we served the file
  } 
  
});