var tools = require('./tools');
var qfs = require('./qfs');

// The scanner just scans and returns a list of files and directories
// it will test the path against excludeList, which can be both a regex and an array

module.exports = function(path, excludeList, callback){
  // build a list of files and directories
  var count = 0;
  var countHandled = 0;
  var files = [];
  var handleDir, ready, scanPath, excludePath;
  
  if(!callback && excludeList && excludeList instanceof Function){
    callback = excludeList;
    excludeList = null;
  }
  
  excludePath = function(p){
    if(!excludeList) return false; // no exclude list, no exclusion
    if(excludeList instanceof RegExp){
      return excludeList.test(p);
    }
    if(excludeList instanceof Array){
      var basename = tools.path.basename(p);
      if(basename[basename.length - 1] === "/" || basename[basename.length - 1] === "\\"){
        basename = basename.substr(0,basename.length-1);
      }
      return excludeList.indexOf(tools.path.basename(p)) > -1;
    }
    return false; // something else? just ignore
  };
  
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
          if(!excludePath(path)) handleDir(path);
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
