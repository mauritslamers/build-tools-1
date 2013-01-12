var Handler = require('./handler').Handler;
var tools = require('../tools');
var sass = require('node-sass');
var compass = require('compass').compass; // all compass in one file

exports.SassHandler = Handler.extend({

  _file: null,
  
  hideDirectives: [/\@-webkit-keyframes/,/\@-moz-keyframes/,/\@-ms-keyframes/,/\@-o-keyframes/,/\@keyframes/],

  handle: function(file,request,callback){
    this._file = file;
    callback(false); // we wait on the actual data
  },
  
  // to fix some small omissions
  fix: function(css){
    var lines,ret;
    var unquoted_progid = /[\s]progid[\s\S]*?;/;
    if(css.search(unquoted_progid) >= 0){
      //tools.log('found unquoted progid in ' + this._file.get("path"));
      lines = css.split("\n");
      ret = [];
      lines.forEach(function(line){
        var l;
        var m = unquoted_progid.exec(line);
        if(m){
          l = 'unquote("' + m[0].substr(0,m[0].length-1) + '");';
          line = line.replace(unquoted_progid,l);
        }
        ret.push(line);
      });
      return ret.join("\n");
    }
    return css;
  },
  
  hideAnimationFor: function(regex,css){
    if(css.search(regex)) return css;
    var lines = css.split("\n");
    var inAnim;
    var level = 0;
    var ret = [];
    lines.forEach(function(line){
      if(line.search(regex) >= 0){
        inAnim = true;
        line = "/*" + line; 
      }
      if(inAnim){
        if(line.indexOf("{") >= 0) level += 1;
        if(line.indexOf("}") >= 0){
          level -= 1;
          if(level === 0){
            line = line + "*/";
            inAnim = false;
          }
        }        
      }
      ret.push(line);
    });
    return ret.join("\n");    
  },
  
  unhideAnimationFor: function(regex,css){
    if(!css.search(regex) ===  -1) return css;
    
    var lines = css.split("\n");
    var ret = [];
    var inAnim;
    lines.forEach(function(line){
      if(line.search(regex) >= 0){
        inAnim = true;
        line = line.replace("/*",""); 
      }
      if(inAnim){
        if(line.indexOf("*/") >= 0){
          line = line.replace("*/","");
          inAnim = false;
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
    this.hideDirectives.forEach(function(regex){
      css = this.hideAnimationFor(regex,css);
    },this);
        //tools.log('filename: ' + this._file.get('path'));
    var tmpfn = './tmp/' + me._file.get('path');
    tools.createDirectory(tools.path.dirname(tmpfn));
    tools.fs.writeFileSync(tmpfn, css);
    
    // prepend compass
    if(!compass) throw new Error("Couldn't load compass?!?");
    if(css.indexOf('@import "compass/') > -1){
      css = css.replace(/\@import[\s\S]?"compass[\s\S]*";/,compass);
      css = css.replace(/\@import[\s\S]?"compass[\s\S]*";/g,""); // and the rest by an empty string
    }

    sass.render(css, function(err,newcss){
      // unhide wkanim
      if(err){
        tools.log('errors detected in file ' + me._file.path);
        tools.log('err: ' + tools.inspect(err));
        tools.fs.writeFileSync("error.css",css);
      }
      newcss = me.hideDirectives.forEach(function(regex){
        newcss = me.unhideAnimationFor(regex,newcss);
      });
      r.data = newcss;
      callback(r);
    });
    
    //callback(r);
 
  }  

  
});
