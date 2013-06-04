/*globals __dirname */
var tools = require('../tools');
var Handler = require('./handler').Handler;
var uglify = require('uglify-js');
var ast;

exports.Minify = Handler.extend({
  
  _file: null,
  
  handle: function(file,request,callback){
    this._file = file;
    callback();
  },
  
  finish: function(request,r,callback){
    var data, args, min, ast;
    
    if(!r.data){ // no data, no show
      callback(r);
      return;
    } 
    
    if(this._file.get('isStylesheet')){
      args = ['-jar', tools.path.join(__dirname, '../..', 'bin', 'yuicompressor-2.4.2.jar'), '--type', this._type];

      min = tools.cp.spawn('java',args);
      min.stdout.addListener('data', function(newData) {
        data += newData;
      });

      min.stderr.addListener('data', function(data) {
        tools.util.print(data);
      });

      min.addListener('exit', function(code) {        
        if(code !== 0) tools.util.puts('ERROR: Minifier exited with code ' + code);
        else r.data = data; // if success, replace data
        callback(r); // always call callback 
      });

      min.stdin.write(r.data); // now put in the original file data
      min.stdin.end(); // start the procedure
    }
    
    if(this._file.get('isScript')){
      tools.log('minifying: ' + this._file.get('url'));
      try {
        ast = uglify.parse(r.data, { strict: true, filename: this._file.get('url'), toplevel: this._ast});
        ast.figure_out_scope();
        tools.fs.writeFileSync('ast.js', ast);        
        min = uglify.Compressor(); // only go with defaults for now
        r.data = ast.transform(min);
      }
      catch(e){
        tools.log('Error while minifying ' + this._file.get('url'));
        tools.log('Error is: ' + tools.inspect(e));
        tools.log('Offending file will be written to the project root as error.js');
        tools.fs.writeFileSync('error.js',r.data);
        throw new Error("Error while minifying");
      }
      callback(r);
    }

  }
  
});

/*

sharedHandlers.add('minify', function() {
  var that = {};
  
  that.handle = function(file, request, callback) {
    that.next.handle(file, request, function(response) {
      var data = '',
          min, fileType;
      
      if (file.isStylesheet()) fileType = 'css';
      if (file.isScript()) fileType = 'js';
      min = l.spawn('java', ['-jar', l.path.join(__dirname, '..', 'bin', 'yuicompressor-2.4.2.jar'), '--type', fileType]);
      
      min.stdout.addListener('data', function(newData) {
        data += newData;
      });
      
      min.stderr.addListener('data', function(data) {
        l.sys.print(data);
      });
      
      min.addListener('exit', function(code) {        
        if (code !== 0) {
          l.sys.puts('ERROR: Minifier exited with code ' + code);
        } else {
          response.data = data;
        }
        
        callback(response);
      });
      
      min.stdin.write(response.data);
      min.stdin.end();
    });
  };
  
  return that;
});
*/