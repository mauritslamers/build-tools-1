// Default server plugin, transforms incoming requests to 
var SC = require('sc-runtime');
var tools = require('./tools');
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
  process: function(apps,request,response){
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
    }
    else {
      // serve file from app
    }
    return true; // we served the file
  } 
  
});