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
  
  handle: function(file,request,callback){
    
    var getthemename = function(line){
      var themename_regex = /:[\s\S]+?;/;
      var rawtheme = themename_regex.exec(line)[0];
      var tn = rawtheme.substr(1).trim();
      tools.log('theme after regex: ' + tn);
      tn = (tn[0] === "'" || tn[0] === '"')? tn.substr(1,tn.length-3): tn.substr(0,tn.length-2);
      tools.log('theme after taking of quotes: ' + tn);
      tn = tn.split(".");
      tools.log('theme after splitting: ' + tn);
      return tn;
    };
    
    this.file = file;
    if(file.get('path').indexOf('_theme.css') >= 0){ // if file is _theme, don't process separately
      tools.log('file: ' + file.get('path') + " is theme def");
      this._isThemeDef = true;
      callback(true);
      return;
    }
    
    this.getThemeFile(file, function(err,themedata){
      var filename = file.get('path');
      var css = themedata? themedata + "\n" + file._content: file._content;
      var theme = [
        file.framework.get('theme')
        //file.theme
      ]; // basic theme, set as basic layer... $theme is theme.join(".");
      var layer = 1;
      var isComment = false;
      var lines = css.split('\n');
      var ret = [];
      lines.forEach(function(line,i){
        // if(line.indexOf('/*') >= 0) isComment = true;
        // if(isComment){
        //   ret.push(line);
        //   return;
        // }
        // if(line.indexOf('*/') >= 0) isComment = false;
        tools.log('parsing line ' + i + ' of file: ' + file.get('path'));
        tools.log('line is: ' + line);
        var param;
        var at_theme = line.search(/@theme\([\s\S]+?\)/);
        if(at_theme >= 0){
          tools.log('attheme found at line ' + i + ' in ' + filename);
          // find params
          param = line.match(/\([\s\S]+?\)/);
          if(!param) throw new Error('need a parameter when @theme() is used.');
          else param = param[0].substr(1,param[0].length-2);
          theme.push(param);
          line = line.replace(/@theme\([\s\S]+?\)/, theme.join("."));
        }
        if(line.indexOf('{') >= 0) layer += 1;
        if(line.indexOf('}') >= 0){
          if(theme[layer]) theme.pop();
          layer -= 1;
        }
        if(line.indexOf('$theme') >= 0) {
          tools.log('found $theme: ' + line);
          if(line.search(/\$theme\s*:[\s\S]+?;/) >= 0){
            tools.log('line is theme definition');
            // this is setting the theme variable, replace $ with @ to let less do its trick
            //line = line.replace(/\$/g, '@');
            theme = getthemename(line);
            layer = theme.length;
            line = line.replace(/\$/g, '@');
          }
          else {
            tools.log('line is variable use');
            tools.log('current theme is: ' + tools.inspect(theme));
            tools.log('replacing, original: ' + line);
            line = line.replace(/\$theme/g, theme.join("."));
            tools.log('replacement: ' + line);
          }
        }
        ret.push(line);
      });
      
      file._content = ret.join("\n");
      callback(false);

    });
    
    //tools.log('rewriteTheme handle for ' + file.get('path'));

  },
  
  finish: function(request,r,callback){
    //tools.util.log('rewriteStatic finish for ' + this.file.get('path'));
    //var re = new RegExp("(sc_static|static_url)\\(\\s*['\"](resources\/){0,1}(.+?)['\"]\\s*\\)");

    //r.data = r.data.gsub(re,this.matcher,this);
    //r.data = this.gsub(r.data,re,this.matcher,this);
    if(this._isThemeDef) r.data = ""; // don't let the contents of _theme arrive at the browser separately
    callback(r);
  }
});