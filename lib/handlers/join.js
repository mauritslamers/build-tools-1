var tools = require('../tools');
var Handler = require("./handler").Handler;
var HandlerSet, Join;

Join = Handler.extend({
  
  data: null,
  
  handle: function(file,request,callback){
    //tools.log('join handle of ' + file.get('path'));
    var data = [], 
        count = 0,
        me = this,
        files, numfiles;
        
    var isDone = function(){
      count += 1;
      if(count === numfiles){
        me.data = data.join("\n");
        callback(true);
      }
    };
            
    var callHandlerSet = function(f,i){
      // three options: or the file is real, or is virtual and has content, or is virtual and has no content
      // when the file is real, we just read it, otherwise it has handlers, and we can call them instead...
      
      HandlerSet = HandlerSet || require('./handler_set').HandlerSet;
      var fh = HandlerSet.create({ handlerList: 'handlebars file'.w() });
      
      // tools.log('  file inspected: ' + f.get('path'));
      // tools.log('    file has handler? ' + !!f.handler);
      // if(!!f.handler) tools.log('    files handler list is ' + f.handler.handlerList);
      // tools.log('    file has children? ' + !!f.children);
      
      if(f.children){
        f.handler.handle(f,request,function(d){
          var newd = d.data + "\n /* last line of original file: " + f.get('path') + "*/";
          data[i] = newd;
          isDone();
        });
      }
      else {
        fh.handle(f, request, function(d){
          var newd = d.data + "\n /* last line of original file: " + f.get('path') + "*/";
          data[i] = newd;
          isDone();
        });                
      }
    };
    
    //tools.log('file inspected: ' + tools.inspect(file));
    // tools.log('file inspected: ' + file.get('path'));
    // tools.log('  file has handler? ' + !!file.handler);
    // tools.log('  file has children? ' + !!file.children);
    files = file.children? file.children: [file];
    numfiles = files.length;
    if(numfiles > 0){
      //tools.log('numfiles in join is ' + numfiles);
      files.forEach(callHandlerSet,this); //callback in callHandlerSet
    } 
    else {
      this.data = '';
      callback();
    }
  },
  
  finish: function(request,r,callback){
    r.data = this.data;
    //tools.log('finish of join handler, returning with data: ' + tools.inspect(r));
    callback(r);
  }
});

exports.Join = Join;

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