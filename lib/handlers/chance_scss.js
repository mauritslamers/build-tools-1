var Handler = require('./handler').Handler;
var stylus = require('stylus');
var sass = require('sass');
var tools = require('../tools');

exports.ChanceSCSS = Handler.extend({

  _file: null,

  handle: function(file,request,callback){
    this._file = file;
    callback(false); // we wait on the actual data
  },
  
  finish: function(request,r,callback){
    // get the data from r, parse using stylus, then return
    //tools.log('data in chancescss: ' + tools.inspect(r));
    // var css = r.data;
    // sass.render(css,function(err,parsedcss){
    //   if(!err){
    //     r.data = parsedcss;
    //     callback(r);        
    //   }
    //   else {
    //     tools.log('error while handling stylus: ' + tools.inspect(err));
    //     callback(r);
    //   }
    // });
    tools.log('scss running on file ' + this._file.get('url'));
    try {
      r.data = sass.render(r.data);
    }
    catch(e){
      tools.log('error caught while parsing with sass: ' + tools.inspect(e));
    }

    callback(r);
  }  

  
});