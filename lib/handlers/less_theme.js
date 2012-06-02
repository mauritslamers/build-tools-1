var tools = require("../tools");
require('../string');
var Handler = require("./handler").Handler;

// rewrite theme does the following:
// it searches for @theme([something]) { [css] }
// if it can find any, it will parse


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
  
  // the @theme handling should be done differently I think
  // the main issue now is that the two methods (@theme and _theme file processing)
  // are interacting in a destructive way
  // new option would be to replace @theme by the theme name and all $theme occurrences inside it
  // to replace by &. in that way less takes care of the replacing
  
  handleAtTheme: function(css){
    var atTheme = /@theme\([\s\S]+?\)/;
    var lines = css.split("\n");
    var ret = [];
    var theme = this.theme; // basic theme
    var theme_layer = [theme];
    var layer = 1;
    var insideComment;
    lines.forEach(function(line){
      var tmptheme;
      var at_theme,param;
      var open_comment = line.indexOf("/*") >= 0;
      var close_comment = line.indexOf("*/") >= 0;
      if(open_comment && !close_comment) insideComment = true;
      if(close_comment && !open_comment) insideComment = false;
      if(insideComment){ // only pass over if inside comment
        ret.push(line);
        return;
      }
      at_theme = line.search(atTheme);
      if(at_theme >= 0){
        param = line.match(/\([\s\S]+?\)/);
        if(!param) throw new Error('need a parameter when @theme() is used.');
        else param = param[0].substr(1,param[0].length-2);
        tmptheme = [theme,param].join(".");
        tmptheme = tmptheme[0] === "."? tmptheme: "."+ tmptheme;
        tools.log('replacing attheme line, original: ' + line);
        line = line.replace(atTheme, tmptheme);
        tools.log('replacing attheme line, replacement: ' + line);
        theme_layer.push(param);
      }
      if(line.indexOf("}") >= 0){
        if(theme_layer[layer]) theme_layer.pop();
        layer -= 1;
        line = line + "  /* } found, decreasing layer to: " + layer + " */";
      }
      if((line.indexOf("$theme") >= 0) && layer > 1){
        // only replace $theme when inside an at_theme
        line = line.replace(/\$theme/g, "&");
        line = line + "   /* replaced _theme in attheme in this line */";
      }
      if(line.indexOf("{") >= 0){
        layer += 1;
        line = line + "  /* { found, increasing layer to: " + layer + " */";
      }  
      ret.push(line);
    });
    return ret.join("\n");
  },
  
  
  handle: function(file,request,callback){
    this.theme = file.framework.get('theme');
    this._file = file;
    callback(false);
  },
  
  finish: function(request,r,callback){
    //tools.util.log('rewriteStatic finish for ' + this.file.get('path'));
    //var re = new RegExp("(sc_static|static_url)\\(\\s*['\"](resources\/){0,1}(.+?)['\"]\\s*\\)");
    var me = this;
    if(!r.data){
      callback(r);
      return;
    }
    
    if(this._file.get('path').indexOf('_theme.css') >= 0){ // if file is _theme, don't process separately
      tools.log('file: ' + this._file.get('path') + " is theme def");
      this._isThemeDef = true;
      r.data = "";
      callback(r);
      return;
    } 
    
    var getthemename = function(line){
      var themename_regex = /:[\s\S]+?;/;
      var rawtheme = themename_regex.exec(line)[0];
      var tn = rawtheme.substr(1).trim(); // take off : and spaces if present
      //tools.log('theme after regex: ' + tn);
      tn = (tn[0] === "'" || tn[0] === '"')? tn.substr(1,tn.length-3): tn.substr(0,tn.length-2);
      //tools.log('theme after taking of quotes: ' + tn);
      //tn = tn.split(".");
      //tools.log('theme after splitting: ' + tn);
      return tn;
    };
    
    // first replace @theme()
    var css_after_attheme = this.handleAtTheme(r.data);
    
    this.getThemeFile(this._file, function(err,themedata){
      var filename = this._file.get('path'), tmptheme;
      var css = themedata? themedata + "\n" + css_after_attheme: css_after_attheme;
      var lines = css.split('\n');
      var ret = [];
      var theme = this.theme; // basic theme
      lines.forEach(function(line,i){
        if(line.indexOf('$theme') >= 0) {
          if(line.search(/\$theme\s*:[\s\S]+?;/) >= 0){
            tools.log('line is theme definition');
            // this is setting the theme variable, replace $ with @ to let less do its trick
            //line = line.replace(/\$/g, '@');
            theme = getthemename(line);
            line = line.replace(/\$/g, '@');
            line = line + " /* replaced by $theme variable replacer in " + me._file.get('path') + " at line "+ i + " */";
          }
          else {
            tools.log('line is variable use');
            tools.log('current theme is: ' + theme);
            tools.log('replacing, original: ' + line);
            tmptheme = theme[0] === '.'? theme: "." + theme;
            line = line.replace(/\$theme/g, tmptheme);
            line = line + " /* replaced by $theme replacer in " + me.get('path') + " at line "+ i + " */";
            tools.log('replacement: ' + line);
          }
        }
        ret.push(line);
      });
      
      r.data = ret.join("\n");
      callback(r);
    });
    
  }
});