var tools = require("../tools"),
    SC = require('sc-runtime'),
    config = require('../config'),
    alternativeLocations = [
      '',
      'resources', 
      'images',
      'english.lproj',
      'en.lproj'
    ],
    regex = new RegExp("(sc_static|static_url)\\(\\s*['\"](resources\/){0,1}(.+?)['\"]\\s*\\)");
        
    
var gsub = function(source, re, callback) {
  var result = '',
      //source = this,
      match;

  while (source.length > 0) {
    if (match = re.exec(source)) {
      result += source.slice(0, match.index);
      result += callback(match);
      source  = source.slice(match.index + match[0].length);
    } else {
      result += source;
      source = '';
    }
  }
  return result;
};

// this function simply tries to rewrite the found sc_static and static_url
// calls using the list of paths included.
// this allows for framework level replacement, as well as global level 
// replacement

// pathlist is supposed to be an SC.(Core)Set, but can also be an Array, or a hash with filenames as keys

exports.rewriteStaticFor = function(file,str,pathlist,opts){
  if(!str) return str;
  
  var filepath = file.get('path'),
      filedir = tools.path.dirname(filepath),
      params = opts.parameters || "'%@'",
      exts = [""].concat(config.resourceExtensions),
      flist = SC.typeOf(pathlist) === "hash"? Object.keys(pathlist): pathlist;
      
  var ret = gsub(str,regex,function(match){
    var path = tools.path.join(filedir, match[3]); // original path as mentioned in file
    var basename = tools.path.basename(match[3]);
    var newpath = path;
    var testpath, result;
    alternativeLocations.some(function(loc){
      return exts.some(function(extname){
        var altPath = tools.path.join(filedir,loc,match[3] + extname);
        if(flist.contains(altPath)){
          newpath = altPath; // found? replace by actual path
          return true;
        } 
        else return false;
      });
    });

    if(path === newpath){ // no success, try wider search
      testpath = flist.find(function(fn){
        if(fn.indexOf(basename) > -1) return fn;
      });
      if(!testpath){
        tools.util.puts('WARNING: ' + path + ' referenced in ' + this.file.get('path') + ' but was not found.');
      }
      else newpath = testpath;
    }
    result = params.replace('%@', tools.path.join(opts.urlPrefix, newpath));
    return result;
  });
  
  return ret;  
};
