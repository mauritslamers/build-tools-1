var Handler = require('./handler').Handler;
var tools = require('../tools');
var sass = require('sass');

exports.SassHandler = Handler.extend({

  _file: null,

  handle: function(file,request,callback){
    this._file = file;
    callback(false); // we wait on the actual data
  },
  
  // to fix some small omissions
  fix: function(css){
    var lines,ret;
    var unquoted_progid = /[\s]progid[\s\S]*?;/;
    if(css.search(unquoted_progid) >= 0){
      tools.log('found unquoted progid in ' + this._file.get("path"));
      lines = css.split("\n");
      ret = [];
      lines.forEach(function(line){
        var l;
        var m = unquoted_progid.exec(line);
        if(m){
          l = '"' + m[0].substr(0,m[0].length-1) + '";';
          line = line.replace(unquoted_progid,l);
        }
        ret.push(line);
      });
      return ret.join("\n");
    }
    return css;
  },
  
  hideWebKitAnimation: function(css){
    var wkanim = /\@-webkit-keyframes/;
    if(css.search(wkanim) === -1) return css;
    tools.log('webkit keyframes found: commenting out...');
    var lines = css.split("\n");
    var inWkAnim;
    var level = 0;
    var ret = [];
    lines.forEach(function(line){
      if(line.search(wkanim) >= 0){
        inWkAnim = true;
        line = "/*" + line; 
      }
      if(inWkAnim){
        if(line.indexOf("{") >= 0) level += 1;
        if(line.indexOf("}") >= 0){
          level -= 1;
          if(level === 0){
            line = line + "*/";
            inWkAnim = false;
          }
        }        
      }
      ret.push(line);
    });
    return ret.join("\n");
  },
  
  unhideWebKitAnimation: function(css){
    var wkanim = /\@-webkit-keyframes/;
    if(!css.search(wkanim) ===  -1) return css;
    
    var lines = css.split("\n");
    var ret = [];
    var inWkAnim;
    lines.forEach(function(line){
      if(line.search(wkanim) >= 0){
        inWkAnim = true;
        line = line.replace("/*",""); 
      }
      if(inWkAnim){
        if(line.indexOf("*/") >= 0){
          line = line.replace("*/","");
          inWkAnim = false;
        }
      }
      ret.push(line);
    });
    return ret.join("\n");
  },
  
  finish: function(request,r,callback){
    // get the data from r, parse using stylus, then return
    //tools.log('data in chancescss: ' + tools.inspect(r));
    var me = this;
    //var css;
    var css = r.data;
    css = this.fix(css);
    css = this.hideWebKitAnimation(css);
    //tools.log('filename: ' + this._file.get('path'));
    var tmpfn = './tmp/' + me._file.get('path');
    tools.createDirectory(tools.path.dirname(tmpfn));
    tools.fs.writeFileSync(tmpfn, css);
    
    sass.render(css, function(newcss){
      // unhide wkanim
      r.data = me.unhideWebKitAnimation(newcss);
      callback(r);
    });
    
    //callback(r);
 
  }  

  
});