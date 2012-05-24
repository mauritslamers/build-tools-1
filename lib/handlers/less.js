var tools = require('../tools');
var Handler = require('./handler').Handler;
var less = require('less');

exports.Less = Handler.extend({
  
  _file: null,
  
  handle: function(file,request,callback){
    this._file = file;
    callback(false);
  },
  
  finish: function(request,r,callback){
    tools.log('less handler for filename: ' + this._file.get('path'));
    var tmpfn = './tmp/' + this._file.get('path');
    tools.createDirectory(tools.path.dirname(tmpfn));
    tools.fs.writeFileSync(tmpfn, r.data);
    callback(r);
    
    // if(!r.data) callback(r);
    // else {
    //   less.render(r.data,function(err,css){
    //     if(err){
    //       tools.log('Error while rendering with less: ' +  tools.inspect(err));
    //     } 
    //     else r.data = css;
    //     callback(r);
    //   });
    // }
  }
});