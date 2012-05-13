var Handler = require('./handler').Handler;
var stylus = require('stylus');
var tools = require('../tools');

exports.ChanceSCSS = Handler.extend({

  handle: function(file,request,callback){
    callback(false); // we wait on the actual data
  },
  
  finish: function(request,r,callback){
    // get the data from r, parse using stylus, then return
    //tools.log('data in chancescss: ' + tools.inspect(r));
    var css = r.data;
    stylus.render(css,function(err,parsedcss){
      if(!err){
        r.data = parsedcss;
        callback(r);        
      }
      else {
        tools.log('error while handling stylus: ' + tools.inspect(err));
        callback(r);
      }
    });
    
  }  

  
});