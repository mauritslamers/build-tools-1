var SC = require('sc-runtime');
var tools = require('./tools');
var config = require('./config');
var VirtualFile = require('./virtual_file');

module.exports = VirtualFile.extend({
  isHTML: true, // walk like a duck...
  
  defaultHeaders: null, // default Headers
  
  /*
    headers to put, aside from the default headers,
    array of strings, or a string
  */
  headers: null, 

  /*
    stylesheets to include
    array of file objects, or strings, or a single string
  */  
  stylesheets: null, 

  /*
    scripts to include
    array of file objects, or strings, or a single string
  */    
  scripts: null, 
  
  
  /*
    urlPrefix, prefix attached to any url, useful for relative builds
  */    
  urlPrefix: "",
  
  /*
    function to return an url for a specific file path,
    the default function will use the config.pathsToExclude to parse the path
    Override with something else if the schema needs to be different.
  */
  urlFor: function(file){
    var p = file.get('path');
    var prefix = this.get('urlPrefix');

    if(!p) return "";
    else {
      var ret = config.pathsToExclude.reduce(function(prev,next){
        prev = prev.replace(next,"");
      },p);
      if(prefix && prefix[prefix.length-1] !== "/") prefix += "/";
      return prefix + ret;
    }
  },
  
  read: function(callback){
    var defaultHeaders = this.get('defaultHeaders');
    var headers = this.get('headers');
    var stylesheets = this.get('stylesheets');
    var scripts = this.get('scripts');
    var prefix = this.get('urlPrefix');
    var ret = ["<html>\n<head>"];
    if(defaultHeaders){
      if(defaultHeaders instanceof String) ret.push(defaultHeaders);
      else if(defaultHeaders instanceof Array){
        defaultHeaders.forEach(function(h){
          if(h instanceof String) ret.push(h);
        });
      }
      else tools.log("HtmlFile: invalid defaultHeaders");
    }
    if(headers){
      if(headers instanceof String) ret.push(headers);
      else if(headers instanceof Array){
        headers.forEach(function(h){
          if(h instanceof String) ret.push(h);
        });
      }
      else tools.log("HtmlFile: invalid headers");
    }
    if(stylesheets){
      if(stylesheets instanceof String) ret.push(stylesheets);
      else if(stylesheets instanceof Array){
        stylesheets.forEach(function(ss){
          if(ss instanceof String) ret.push(ss);
          else if(ss instanceof Object){
            var p = this.urlFor(ss);
            //('<link href="' + me.get('urlPrefix') + stylesheet.get('url') + '" rel="stylesheet" type="text/css" media="screen">');
            ret.push('<link href="%@" rel="stylesheet" type="text/css" media="screen"'.fmt(p));
          }
          else tools.log("HtmlFile: invalid stylesheet");
        });
      }
      else tools.log("HtmlFile: invalid stylesheets");
    }
    // done with header stuff
    ret.push("</head>");
    ret.push("<body>");
    if(scripts){
      if(scripts instanceof String) ret.push(strings);
      else if(scripts instanceof Array){
        scripts.forEach(function(s){
          if(s instanceof String) ret.push(s);
          else if(s instanceof Object){
            var p = this.urlFor(s);
            //<script type="text/javascript" src="' + me.get('urlPrefix') + script.get('url') + '"></script>
            ret.push('<script type="text/javascript" src="%@"></script>'.fmt(p));
          }
        });
      }
    }
    ret.push("</body>");
    ret.push("</html>");
    
    if(callback) callback(ret.join("\n"));
  }
});