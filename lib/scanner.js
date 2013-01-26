var tools = require('./tools');
var qfs = require('./qfs');

// The scanner just scans and returns a list of files and directories

module.exports = function(path, callback){
  // build a list of files and directories
  var count = 0;
  var countHandled = 0;
  var files = [];
  var handleDir, ready, scanPath;
  
  ready = function(){
    if(count === countHandled){
      callback(files);
    }    
  };
  
  scanPath = function(path){
    count += 1;
    qfs.statFile(path,function(err,stat){
      countHandled += 1;
      if(err) throw err;
      else {
        if(stat.isDirectory()){
          files.push({ path: path, type: 'directory' });
          handleDir(path);
        }
        else {
          files.push({ path: path, type: 'file'});
        }
      }
      ready();
    });
  };
  
  
  handleDir = function(path){
    count += 1;
    var me = this;
    qfs.readDir(path,function(err,subpaths){
      var i,len,newpath;
      countHandled += 1;
      if(err) throw err;
      for(i=0,len=subpaths.length;i<len;i+=1){
        if(subpaths[i][0] !== "."){ // first character of string
          newpath = tools.path.join(path,subpaths[i]);
          scanPath(newpath);
        }
      }
      ready();
    }); // start reading dir
  };
  
  if(!callback) return; // don't do anything
  
  scanPath(path); // set off
};
