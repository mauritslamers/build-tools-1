var Handler = require('./handler').Handler;
var tools = require('../tools');
var sass = require('node-sass');
var compass = require('compass').compass; // all compass in one file

exports.SassHandler = Handler.extend({

  _file: null,
  
  debug: true,
  
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
      if(this._file.get('path').indexOf('wysiwyg-controls.css') > -1){
        tools.log('found unquoted progid in ' + this._file.get("path")); 
      }
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
    if(!css.search(regex)) return css;
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
    var hasCompass;
    //var css;
    var css = r.data;
    this.hideDirectives.forEach(function(regex){
      css = this.hideAnimationFor(regex,css);
    },this);
    //tools.log('filename: ' + this._file.get('path'));
    
    // prepend compass
    if(!compass) throw new Error("Couldn't load compass?!?");
    if(css.indexOf('@import "compass/') > -1){
      hasCompass = true;
      css = css.replace(/\@import[\s\S]?"compass[\s\S]*";/,compass);
      css = css.replace(/\@import[\s\S]?"compass[\s\S]*";/g,""); // and the rest by an empty string
    }
    css = this.fix(css); // fix unquoted progids
    if(this.debug){
      var tmpfn = './tmp/' + me._file.get('path');
      tools.createDirectory(tools.path.dirname(tmpfn));
      tools.fs.writeFileSync(tmpfn, css);      
    }

    sass.render({
      data: css,
      error: function(err){
        tools.log('errors detected in file ' + me._file.path);
        // rewrite error line number in message:
        tools.log('hasCompass: ' + hasCompass);
        if(hasCompass){
          var regex = /(line[\s\S]?)([0-9]*):/;
          var match = regex.exec(err);
          if(match){
            // match gives [total match, group1, group2, index of match, input]
            var newline = parseInt(match[2],10) - compass.split("\n").length;
            tools.log('match[2]: ' + match[2]);
            tools.log('parseInt match[2]' + parseInt(match[2],10));
            tools.log('compass.split.length: ' + compass.split("\n").length);
            var newerr = err.substring(0,match[3]) + match[1] + newline + ":" + err.substring(match[3]+match[0].length);
            tools.log('newerr: ' + newerr);
          } 
          else {
            tools.log('err: ' + tools.inspect(err));         
          }
        }
        else {
          tools.log('err: ' + tools.inspect(err));         
        }
        r.data = css; //unparsed
        callback(r);
      },
      success: function(newcss){
        me.hideDirectives.forEach(function(regex){
          newcss = me.unhideAnimationFor(regex,newcss);
        });      
        r.data = newcss;
        callback(r);        
      }
    });

    // sass.render(css, function(err,newcss){
      

    // });
    
    //callback(r);
 
  }  

  
});
