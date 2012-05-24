var tools = require("../tools");
require('../string');
var Handler = require("./handler").Handler;

// rewrite theme does the following:
// it searches for @theme([something]) { [css] }
// if it can find any, it will parse


exports.RewriteTheme = Handler.extend({
  //parameters: "'%@'",
  
  file: null,
  
  handle: function(file,request,callback){
    tools.log('rewriteTheme handle for ' + file.get('path'));
    this.file = file;
    var css = file._content;
    var theme = [
      file.framework.get('theme')
    ]; // basic theme, set as basic layer... $theme is theme.join(".");
    var layer = 0;
    var lines = css.split('\n');
    var ret = [];
    lines.forEach(function(line){
      var param;
      var at_theme = line.search(/@theme\([\s\S]+?\)/);
      if(at_theme >= 0){
        // find params
        param = line.match(/\([\s\S]+?\)/);
        if(!param) throw new Error('need a parameter when @theme() is used.');
        else param = param[0].substr(1,param[0].length-1);
        theme.push(param);
        line = line.replace(/@theme\([\s\S]+?\)/, theme.join("."));
      }
      if(line.indexOf('{') >= 0) layer += 1;
      if(line.indexOf('}') >= 0){
        if(theme[layer]) theme.pop();
        layer -= 1;
      }
      line = line.replace(/$theme/, theme.slice(0,layer-1).join("."));
      ret.push(line);
    });
    
    file._content = ret.join("\n");
    callback(false);
  },
  
  finish: function(request,r,callback){
    //tools.util.log('rewriteStatic finish for ' + this.file.get('path'));
    //var re = new RegExp("(sc_static|static_url)\\(\\s*['\"](resources\/){0,1}(.+?)['\"]\\s*\\)");
    
    //r.data = r.data.gsub(re,this.matcher,this);
    //r.data = this.gsub(r.data,re,this.matcher,this);
    callback(r);
  }
});