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
    //tools.log('rewriteTheme handle for ' + file.get('path'));
    this.file = file;
    var css = file._content;
    var theme = [
      //file.framework.get('theme')
      file.theme
    ]; // basic theme, set as basic layer... $theme is theme.join(".");
    var layer = 0;
    var isComment = false;
    var lines = css.split('\n');
    var ret = [];
    lines.forEach(function(line,i){
      if(line.indexOf('/*') >= 0) isComment = true;
      if(line.indexOf('*/') >= 0) isComment = false;
      if(isComment){
        ret.push(line);
        return;
      }
      //tools.log('parsing line ' + i + ' of file: ' + file.get('path'));
      var param;
      var at_theme = line.search(/@theme\([\s\S]+?\)/);
      if(at_theme >= 0){
        //tools.log('attheme found');
        // find params
        param = line.match(/\([\s\S]+?\)/);
        if(!param) throw new Error('need a parameter when @theme() is used.');
        else param = param[0].substr(1,param[0].length-2);
        //tools.log('pushing param ' + param);
        theme.push(param);
        //tools.log('theme becomes: ' + tools.inspect(theme));
        line = line.replace(/@theme\([\s\S]+?\)/, theme.join("."));
        //tools.log('line after replacing @theme: ' + line);
      }
      if(line.indexOf('{') >= 0) layer += 1;
      if(line.indexOf('}') >= 0){
        if(theme[layer]) theme.pop();
        layer -= 1;
      }
      if(line.indexOf('$theme') >= 0) {
        //tools.log('$theme found');
        if(line.search(/\$theme\s*:[\s\S]+?;/) >= 0){
          // this is setting the theme variable, replace $ with @ to let less do its trick
          //tools.log('theme definition found...');
          line = line.replace(/\$/g, '@');
        }
        else {
          //tools.log('theme instance found, replacing with actual theme value');
          tools.log('current theme is: ' + theme.join("."));
          line = line.replace(/\$theme/g, theme.join("."));
          //tools.log('line after replacing $theme: ' + line);          
        }
      }
      ret.push(line);
    });
    
    //tools.log('replacing file._content with: ' + ret.join("\n"));
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