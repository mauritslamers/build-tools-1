var Handler = require('./handler').Handler;
var stylus = require('stylus');
var scss = require('scss');
var lwsass = require('lw-sass');
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
    var me = this;

    //var css = r.data;
    // stylus.render(css,function(err,parsedcss){
    //   //tools.log('data returned from scss: ' + tools.inspect(parsedcss));
    //   //tools.log('STYLUS SUCCESS!!!!!! for file: ' + me._file.get('path'));
    //   
    //   if(!err){
    //     r.data = parsedcss;
    //     callback(r);        
    //   }
    //   else {
    //     tools.log('error while handling stylus for file: ' + me._file.get('path') + ": " + tools.inspect(err));
    //     callback(r);
    //   }
    // });
    var css;
    try {
      css = lwsass.render(r.data);
      tools.log("LWSASS SUCCESS !!! for file: " + me._file.get('path'));
      tools.log('lwsass returned: ' + css);
      r.data = css;
      callback(r);
    }
    catch(e){
      tools.log('lwsass returned an error for file ' + me._file.get('path') + ": " + tools.inspect(e));
      callback(r);
    }

  }  

  
});