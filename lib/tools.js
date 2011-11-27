/*globals global __dirname */

if(!global.SC) require('./sc/thoth_sc');
var CONSTANTS = require('constants');
exports.CONSTANTS = CONSTANTS;
exports.lib_dir = __dirname;
exports.util = require('util');
exports.http = require('http');
exports.url = require('url');
exports.path = require('path');
exports.fs = require('fs');
exports.qfs = require('./qfs');
exports.cp = require('child_process');
exports.jslint = require('./jslint').JSLINT;
exports.log = require('util').log;
exports.inspect = require('util').inspect;

var createDirectory = function(path){
  var prefix = this.path.dirname(path);
  
  if(prefix !== "." && prefix !== "/"){
    createDirectory(prefix);
  }
  // make async!
  try {
    exports.fs.mkdirSync(path, parseInt('0755',8));
  }
  catch(e){
    //this.log('constants is ' + this.inspect(CONSTANTS));
    this.log('e is ' + this.inspect(e));
    if(e.errno !== CONSTANTS.EEXIST) throw e;
  }
};

exports.createDirectory = createDirectory;

