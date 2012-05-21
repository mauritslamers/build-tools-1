var Handler = require('./handler').Handler;
var stylus = require('stylus');
var scss = require('scss');
var lwsass = require('lw-sass');
var tools = require('../tools');

exports.ChanceSCSS = Handler.extend({

  _file: null,

  handle: function(file,request,callback){
    this._file = file;
    callback(false); // we wait on the actual data
  },
  
  _convert_to_styl: function(css) {
    var convertedLines, line, nonBlankLines, trimmed;
    convertedLines = [];
    css.split("\n").forEach(function(line){
      trimmed = line.trim();
      if(trimmed === "{" || trimmed === "}") return; 
      line = line.replace('\t', '  ', 'g');
      line = line.replace(':0', ': 0', 'g');
      line = line.replace('{', '', 'g');
      line = line.replace('}', '', 'g');
      line = line.replace(';', '', 'g');
      if (line.indexOf(" progid:DXImageTransform.Microsoft.Alpha(Opacity=30)") !== -1) {
        line = line.replace(' progid', ' \"progid', 'g');
        line = line.replace('=30)', '=30)\"', 'g');
      }
      if (line.indexOf(" progid:DXImageTransform.Microsoft.Alpha(Opacity=40)") !== -1) {
        line = line.replace(' progid', ' \"progid', 'g');
        line = line.replace('=40)', '=40)\"', 'g');
      }
      if (line.indexOf(" progid:DXImageTransform.Microsoft.Alpha(Opacity=50)") !== -1) {
        line = line.replace(' progid', ' \"progid', 'g');
        line = line.replace('=50)', '=50)\"', 'g');
      }
      if(line !== null || line !== undefined) convertedLines.push(line);  
    });
    
    _ref = css.split('\n');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      line = _ref[_i];
      trimmed = line.trim();
      if (trimmed === '{') {
        continue;
      }
      if (trimmed === '}') {
        continue;
      }
      line = line.replace('\t', '  ', 'g');
      line = line.replace(':0', ': 0', 'g');
      line = line.replace('{', '', 'g');
      line = line.replace('}', '', 'g');
      line = line.replace(';', '', 'g');
      if (line.indexOf(" progid:DXImageTransform.Microsoft.Alpha(Opacity=30)") !== -1) {
        line = line.replace(' progid', ' \"progid', 'g');
        line = line.replace('=30)', '=30)\"', 'g');
      }
      if (line.indexOf(" progid:DXImageTransform.Microsoft.Alpha(Opacity=40)") !== -1) {
        line = line.replace(' progid', ' \"progid', 'g');
        line = line.replace('=40)', '=40)\"', 'g');
      }
      if (line.indexOf(" progid:DXImageTransform.Microsoft.Alpha(Opacity=50)") !== -1) {
        line = line.replace(' progid', ' \"progid', 'g');
        line = line.replace('=50)', '=50)\"', 'g');
      }
      if (line != null) {
        convertedLines.push(line);
      }
    }
    nonBlankLines = ((function() {
      var _j, _len1, _results;
      _results = [];
      for (_j = 0, _len1 = convertedLines.length; _j < _len1; _j++) {
        line = convertedLines[_j];
        _results.push(line.trim().length > 0);
      }
      return _results;
    })() ? line : void 0);
    if (nonBlankLines.length > 1) {
      return convertedLines.join('\n');
    } else {
      return '';
    }
  },
  
  finish: function(request,r,callback){
    // get the data from r, parse using stylus, then return
    //tools.log('data in chancescss: ' + tools.inspect(r));
    var me = this;
    //var css;
    // tools.qfs.writeFile("./tmp/" + me._file.get('path'), r.data, function(err){
    //   if(err) tools.log('error while writing file: ' + me._file.get('path') + " err: " + tools.inspect(err));
    // });
    
    var css = r.data;
    stylus.render(css,function(err,parsedcss){
      //tools.log('data returned from scss: ' + tools.inspect(parsedcss));
      //tools.log('STYLUS SUCCESS!!!!!! for file: ' + me._file.get('path'));
      
      if(!err){
        r.data = parsedcss;
        callback(r);        
      }
      else {
        tools.log('error while handling stylus for file: ' + me._file.get('path') + ": " + err);
        callback(r);
      }
    });
    // try {
    //   css = lwsass.render(r.data);
    //   tools.log("LWSASS SUCCESS !!! for file: " + me._file.get('path'));
    //   tools.log('lwsass returned: ' + tools.inspect(css));
    //   r.data = css;
    //   callback(r);
    // }
    // catch(e){
    //   tools.log('lwsass returned an error for file ' + me._file.get('path') + ": " + tools.inspect(e));
    //   callback(r);
    // }
    // 
    // scss.parse(css,function(err,parsedcss){
    //   //tools.log('data returned from scss: ' + tools.inspect(parsedcss));
    //   if(!err){
    //     tools.log('STYLUS SUCCESS!!!!!! for file: ' + me._file.get('path'));
    //     r.data = parsedcss;
    //     callback(r);        
    //   }
    //   else {
    //     tools.log('error while handling SCSS for file: ' + me._file.get('path') + ": " + tools.inspect(err));
    //     callback(r);
    //   }
    // });

  }  

  
});