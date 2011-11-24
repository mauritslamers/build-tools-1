var tools = require('../tools');
var Handler = require("./handler").Handler;
var HandlerSet = require('./handler_set').HandlerSet;

exports.Join = Handler.extend({
  
  data: null,
  
  handle: function(file,request,callback){
    tools.log('join handle of ' + file.get('path'));
    var data = [], 
        count = 0,
        me = this,
        files, numfiles;
        
    var callHandlerSet = function(f,i){
      if(!f.handler) f.handler = HandlerSet.create({ handlerList: 'file'.w() });
      f.handler.handle(f, request, function(d){
        data[i] = d.data;
        count += 1;
        if (count === numfiles) {
          me.data = data.join('\n');
          callback();
        }
      });
    };
    
    files = file.children? file.children: [file];
    numfiles = files.length;
    if(numfiles > 0){
      //tools.log('numfiles in join is ' + numfiles);
      files.forEach(callHandlerSet,this);
      //callback();
    } 
    else {
      this.data = '';
      callback();
    }
  },
  
  finish: function(request,r,callback){
    r.data = this.data;
    tools.log('finish of join handler, returning with data: ' + tools.inspect(r));
    callback(r);
  }
});

/*
sharedHandlers.add('join', function() {
  var that = {};
    
  that.handle = function(file, request, callback) {
    var data = [],
        files, count;
        
    if (file.children === null) {
      files = [file];
    } else {
      files = file.children;
    }
    
    count = files.length;
    
    if (count === 0) {
      callback({ data: '' });
      
    } else {
      files.forEach(function(file, i) {
        var next = that.next ? that.next : file.handler;
                
        next.handle(file, request, function(d) {
          data[i] = d.data;
          count -= 1;
          if (count === 0) {
            callback({ data: data.join('\n') });
          }
        });
      });
    }
  };

  return that;
});
*/