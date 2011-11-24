var tools = require('../tools');
var Handler = require('./handler').Handler;

exports.Cache = Handler.extend({
  
  cache: null,
  
  _path: null,
  
  handle: function(file,request,callback){
    if(!this.cache) this.cache = {};
    this._path = file.get('path');
    var hasCache = !!this.cache[this._path]; // make a boolean value here
    tools.util.log('hasCache: ' + hasCache);
    callback(hasCache);
  },
  
  finish: function(request,r,callback){
    if(!this.cache[this._path]){
      this.cache[this._path] = r;
      callback(r);
    }
    else callback(this._cache[this._path]);
  }
});

/*
sharedHandlers.add('cache', function() {
  var that = {};
  
  that.cache = {};
  
  that.handle = function(file, request, callback) {
    if (that.cache[file.path] === undefined) {
      that.next.handle(file, request, function(response) {
        that.cache[file.path] = response;
        callback(response);
      });
    } else {
      callback(that.cache[file.path]);
    }
  };
  
  return that;
});
*/