var Handler = require('./handler').Handler;
var stylus = require('stylus');
var scss = require('scss');
var lwsass = require('lw-sass');
var tools = require('../tools');

var Queuer = require('../queuer').Queuer;

exports.ChanceSCSS = Handler.extend({

  _file: null,
  
  _queuer: Queuer.create({
    numQueues: 4
  }),

  handle: function(file,request,callback){
    this._file = file;
    callback(false); // we wait on the actual data
  },
  
  _convert_to_styl: function(css) {
    var spacescheck = /^\s+/;
    var indent, previndent, numspaces, prevline;
    var convertedLines, line, nonBlankLines, trimmed;
    convertedLines = [];
    nonBlankLines = [];
    css.split("\n").forEach(function(line,i){
      trimmed = line.trim();
      if(trimmed === "{" || trimmed === "}"){
        convertedLines.push(line);
         return; 
      } 
      line = line.replace(/\t/g, '  ');
      line = line.replace(/:0/g, ': 0');
      //line = line.replace('{', '', 'g');
      //line = line.replace('}', '', 'g');
      line = line.replace(/;/g, '');
      if(line.indexOf(" progid:") >= 0) {
        line = line.replace(/ progid/g,"\"progid").replace(/30\)/g, "30)\"").replace(/40\)/g, "40)\"").replace(/50\)/g, "50)\"");
      }
      indent = spacescheck.exec(line);
      if(indent) {
        numspaces = indent[0].length;
        if(i>1 && (numspaces % 2 > 0)){
          if(this._file.get('path').indexOf('desktop') >= 0){
            tools.log('numspaces on line ' + i + ": " + numspaces + ", line: " + line);
          }
          prevline = convertedLines[convertedLines.length-1];
          previndent = spacescheck.exec(prevline);
          if(previndent){
            tools.log('previndent: ' + tools.inspect(previndent));
            line = (prevline.indexOf("{") >= 0)? line.replace(spacescheck,(previndent[0] + "  ")): line.replace(spacescheck,previndent[0]);
          }
          else line = line.replace(spacescheck,indent[0].substr(0,indent[0].length-2));
        }
      }
      if(line !== null || line !== undefined){
        convertedLines.push(line);
        nonBlankLines.push(line.trim().length > 0);
      }       
    },this);

    if (nonBlankLines.length > 1) return convertedLines.join('\n');
    else return '';
  },
  
  finish: function(request,r,callback){
    // get the data from r, parse using stylus, then return
    //tools.log('data in chancescss: ' + tools.inspect(r));
    var me = this;
    //var css;
    
    var css = this._convert_to_styl(r.data);
    tools.log('filename: ' + this._file.get('path'));
    var tmpfn = './tmp/' + me._file.get('path');
    tools.createDirectory(tools.path.dirname(tmpfn));
    tools.fs.writeFileSync(tmpfn, css);
    callback(r);
    // tools.qfs.writeFile("./tmp/" + me._file.get('path'), r.data, function(err){
    //   if(err) tools.log('error while writing file: ' + me._file.get('path') + " err: " + tools.inspect(err));
    // });

    
    // this._queuer.queue(stylus,'render',[css],function(err,parsedcss){
    // //stylus.render(css,function(err,parsedcss){
    //   //tools.log('data returned from scss: ' + tools.inspect(parsedcss));
    //   //tools.log('STYLUS SUCCESS!!!!!! for file: ' + me._file.get('path'));
    //   
    //   if(!err){
    //     r.data = parsedcss;
    //     callback(r);        
    //   }
    //   else {
    //     //tools.log('error while handling stylus for file: ' + me._file.get('path') + ": " + err);
    //     callback(r);
    //   }
    // });
    //callback(r);
    
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
    // var css = r.data;
    // tools.log('css before scss: ' + css);
    // scss.parse(css,function(err,parsedcss){
    //   //tools.log('data returned from scss: ' + tools.inspect(parsedcss));
    //   if(!err){
    //     tools.log('STYLUS SUCCESS!!!!!! for file: ' + me._file.get('path'));
    //     tools.log('parsedcss: ' + tools.inspect(arguments));
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