var Handler = require('./handler').Handler;
var tools = require('../tools');

exports.ChanceTheme = Handler.extend({

  file: null,
  
  handle: function(file,request,callback){
    this.file = file;
    callback(false); // we wait on the actual data
  },
  
  finish: function(request,r,callback){
    // get the data from r, parse using stylus, then return
    //tools.log('data in chancescss: ' + tools.inspect(r));
    var css = r.data;
    // now search for and replace theme stuff
    var theme = file.get('framework').get('theme');
    
  }  

  
});