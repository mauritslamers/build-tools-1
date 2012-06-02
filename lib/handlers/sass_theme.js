var tools = require("../tools");
require('../string');
var Handler = require("./handler").Handler;

// rewrite theme does the following:
// it searches for @theme([something]) { [css] }
// it replaces the wrapping by a $theme definition line before and a $theme definition line after
// the css block
// inside the css block it will replace all $theme occurrences by {$theme}


exports.RewriteTheme = Handler.extend({
  //parameters: "'%@'",
  
  file: null,
  
  getThemeFile: function(basefile,callback){
    var fw = basefile.framework;
    var themefn, fittingfiles;
    var baseurl = basefile.get('path');
    var dirs = baseurl.split('/');
    dirs = dirs.slice(0,dirs.length-1); // don't take the filename
    var numdirs = dirs.length;
    for(var i=numdirs;i>=0;i-=1){
      themefn = dirs.join("/") + "/_theme.css";
      tools.log('searching for ' + themefn);
      fittingfiles = fw.get('orderedStylesheets').filterProperty('path',themefn);
      if(fittingfiles.length > 0){
        i = -1; // break loop
        tools.log('found file: ' + themefn);
        fittingfiles[0].handler.handle(fittingfiles[0],{},callback);
        return;
      }
      else {
        dirs = dirs.slice(0,dirs.length-1);
      }
    }
    // still running? so not found
    callback(""); // return nothing
  },
  
  
  handleTheme: function(css){
    var atTheme = /@theme\([\s\S]+?\)/;
    var dollarTheme = /\$theme\./;
    var lines, ret = [], theme, theme_layer, layer, insideComment;
    
    var atThemeFound = css.search(atTheme) >= 0;
    var dollarThemeFound = css.search(dollarTheme) >= 0;

    if(!atThemeFound && !dollarThemeFound) return css; // don't parse
    
    lines = css.split("\n");
    ret = [];
    theme = this.theme; // basic theme
    tools.log('basic theme is: ' + theme);
    theme_layer = [theme];
    layer = 1;
    
    lines.forEach(function(line,linenumber){
      var tmptheme,at_theme,param;
      var open_comment_pos = line.indexOf("/*");
      var close_comment_pos = line.indexOf("*/");
      var open_comment = open_comment_pos >= 0;
      var close_comment = close_comment_pos >= 0;
      if(open_comment && !close_comment) insideComment = true;
      if(close_comment && !open_comment) insideComment = false;
      if(insideComment){ // only pass over if inside comment
        ret.push(line);
        return;
      }
      if(atThemeFound){ // skip when no atTheme found
        at_theme = line.search(atTheme);
        if(at_theme >= 0 && (at_theme < open_comment_pos || at_theme > close_comment_pos)){ // don't parse inside comments
          param = line.match(/\([\s\S]+?\)/);
          if(!param){
            line += "/* you need to add a parameter when using @theme */";
            ret.push(line);
            tools.log('@theme found without a parameter in file: ' + this.file.get('path') + " at line: " + linenumber);
            return;
          }
          else param = param[0].substr(1,param[0].length-2);
          theme_layer.push(param);
          tmptheme = theme_layer.join(".");
          tmptheme = tmptheme[0] === "."? tmptheme: "."+ tmptheme;
          tmptheme = "$theme: \"" + tmptheme + "\";";
          //tools.log('replacing attheme line, original: ' + line);
          //line = line.replace(atTheme, tmptheme);
          line = tmptheme;
          //tools.log('replacing attheme line, replacement: ' + line);
          layer += 1;
        }
        if(line.indexOf("{") >= 0) layer += 1;
        if(line.indexOf("}") >= 0){
          layer -= 1;
          if(theme_layer[layer]){
            theme_layer.pop();
            tmptheme = theme_layer.join(".");
            tmptheme = tmptheme[0] === "."? tmptheme: "." + tmptheme;
            line = line.replace("}","$theme: \"" + tmptheme + "\";");
          } 
        }
      }
      line = line.replace(/\$theme\./g, "#{$theme}.");
      ret.push(line);
    },this);
    return ret.join("\n");
  },
  
  
  handle: function(file,request,callback){
    this._file = file;
    this.theme = file.theme;
    callback(false);
  },
  
  finish: function(request,r,callback){
    //tools.util.log('rewriteStatic finish for ' + this.file.get('path'));
    //var re = new RegExp("(sc_static|static_url)\\(\\s*['\"](resources\/){0,1}(.+?)['\"]\\s*\\)");

    //r.data = r.data.gsub(re,this.matcher,this);
    //r.data = this.gsub(r.data,re,this.matcher,this);
    //if(this._isThemeDef) r.data = ""; // don't let the contents of _theme arrive at the browser separately
    
    if(!r.data){
      callback(r);
      return;
    }
    
    if(this._file.get('path').indexOf('_theme.css') >= 0){ // if file is _theme, don't process separately
      //tools.log('file: ' + file.get('path') + " is theme def");
      this._isThemeDef = true;
      callback(r);
      return;
    } 

    var me = this;
    this.getThemeFile(this._file, function(err,themedata){
      var filename = me._file.get('path'), tmptheme;
      var css = themedata? themedata + "\n" + r.data: r.data;
    
      r.data = me.handleTheme(css);
      callback(r);
    });
    
  }
});