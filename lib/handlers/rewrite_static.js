var tools = require("../tools");
var Handler = require("./handler").Handler;

exports.RewriteStatic = Handler.extend({
  parameters: "'%@'",
  
  _file: null,
  
  handle: function(file,request,callback){
    tools.util.log('rewriteStatic handle for ' + file.get('path'));
    this._file = file;
    callback();
  },
  
  alternativeLocations: [
    '',
    'resources', 
    'images',
    'english.lproj',
    'en.lproj'
  ],
  
  
  matcher: function(match){
    var dirname = this.file.get('framework').get('url');
    var path = tools.path.join(dirname,match[3]);    
    
    this.alternativeLocations.some(function(loc){
      return this.file._resourceExtensions.some(function(extname){
        var alternatePath = tools.path.join(dirname, loc, match[3] + extname);
        //l.sys.log('garcon: trying to find alternative for ' + path + ' at ' +  alternatePath);
        //l.sys.log('garcon: dirname is ' + dirname);
        //l.sys.log('garcon: prefix is ' + prefix);
        //l.sys.log('garcon: name is ' + match[3] + extname);
        if (this.file.getPath('framework.server').files[alternatePath]) {
          path = alternatePath;
          return true;
        } else {
          return false;
        }
      },this);
    },this);
    
    if (!this.file.getPath('framework.server').files[path]) {
      tools.util.puts('WARNING: ' + path + ' referenced in ' + this.file.get('path') + ' but was not found.');
    }
    
    return this.parameters.replace('%@', tools.path.join(this.get('urlPrefix'), path));
  },
  
  finish: function(request,r,callback){
    tools.util.log('rewriteStatic finish for ' + file.get('path'));
    var re = new RegExp("(sc_static|static_url)\\(\\s*['\"](resources\/){0,1}(.+)['\"]\\s*\\)");
    
    r.data = r.data.gsub(re,this.matcher);
    callback(r);
  }
});

/*
sharedHandlers.add('rewriteStatic', function(format) {
  var that = {};
  
  that.format = format || "'%@'";

  that.handle = function(file, request, callback) {
    that.next.handle(file, request, function(response) {
      var re = new RegExp("(sc_static|static_url)\\(\\s*['\"](resources\/){0,1}(.+)['\"]\\s*\\)"),
          dirname = file.framework.url();
      
      response.data = response.data.gsub(re, function(match) {
        var path = l.path.join(dirname, match[3]);
        
        // if the resource was not found, try to guess its location
        if (!file.framework.server.files[path]) {
          
          var altlocs = [
            '',
            'resources', 
            'images',
            'english.lproj',
            'en.lproj'];
          // try the root folder directly, then images/
          altlocs.some(function(prefix) {
            
            // try every resources extensions (.png, .jpg, etc.)
            return File.prototype._resourceExtensions.some(function(extname) {
              var alternatePath = l.path.join(dirname, prefix, match[3] + extname);
              //l.sys.log('garcon: trying to find alternative for ' + path + ' at ' +  alternatePath);
              //l.sys.log('garcon: dirname is ' + dirname);
              //l.sys.log('garcon: prefix is ' + prefix);
              //l.sys.log('garcon: name is ' + match[3] + extname);
              if (file.framework.server.files[alternatePath]) {
                path = alternatePath;
                return true;
              } else {
                return false;
              }
            });
            
          });
                        
          if (!file.framework.server.files[path]) {
            l.sys.puts('WARNING: ' + path + ' referenced in ' + file.path + ' but was not found.');
          }
        }
        
        return that.format.replace('%@', l.path.join(sharedHandlers.urlPrefix, path));
      });
      callback(response);
    });
  };

  return that;
});
*/