var tools = require('../tools');
var Handler = require('./handler').Handler;

exports.RewriteSuper = Handler.extend({
  
  _path: null,
  
  handle: function(file,request,callback){
    this._path = file.get('path');
    callback();
  },
  
  finish: function(request,r,callback){
    if (/sc_super\(\s*[^\)\s]+\s*\)/.test(r.data)){
      tools.util.puts('ERROR in ' + this._path + ': sc_super() should not be called with arguments. Modify the arguments array instead.'); 
    }
    if(r.data && r.data.replace){
      r.data = r.data.replace(/sc_super\(\)/g, 'arguments.callee.base.apply(this,arguments)');
    }
    else {
      //tools.log('found a file that cannot be rewritten: ' + this._path);
      //tools.log('r.data: ' + tools.inspect(r.data));
    }
    callback(r);
  }
});

/*
sharedHandlers.add('rewriteSuper', function() {
  var that = {};

  that.handle = function(file, request, callback) {
    that.next.handle(file, request, function(response) {
      if (/sc_super\(\s*[^\)\s]+\s*\)/.test(response.data)) {
        l.sys.puts('ERROR in ' + file.path + ': sc_super() should not be called with arguments. Modify the arguments array instead.');
      }
      response.data = response.data.replace(/sc_super\(\)/g, 'arguments.callee.base.apply(this,arguments)');
      callback(response);
    });
  };

  return that;
});
*/