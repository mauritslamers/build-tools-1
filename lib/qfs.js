var self = this,
    fs = require('fs'),
    exec  = require('child_process').exec;

var openedFileDescriptorsCount = 0;

self.maxSimultaneouslyOpenedFileDescriptors = 32;

self.guessMaxSimultaneouslyOpenedFileDescriptors = function() {
  exec('ulimit -n', function(err, stdout, stderr) {
    var m = 0, num = 0;
    if (err === null) {
      m = parseInt(stdout.trim(), 10);
      if (m > 0) {
        num = m / 16;
        self.maxSimultaneouslyOpenedFileDescriptors = (num >= 4)? num: 4;
      }
    }
  });
};
self.guessMaxSimultaneouslyOpenedFileDescriptors();

self.queue = function(method) {
  if (!self._queue) {
    self._queue = [];
  }
  
  self._queue.push(method);
    
  self.dequeue();
};

self.dequeue = function() {
  var method, func, opts, callback, cb;
  
  if (self._queue.length > 0 && openedFileDescriptorsCount < self.maxSimultaneouslyOpenedFileDescriptors) {
    openedFileDescriptorsCount += 1;
    
    method = self._queue.shift();
    
    if (method[0] === 'readFile') {
      if(method[3]){
        cb = method[3];
        opts = method[2];
      }
      else {
        cb = method[2];
      }
      callback = function(err,data){
        cb(err,data);
        openedFileDescriptorsCount -= 1;
        self.dequeue();
      };
      if(opts){
        fs.readFile(method[1],opts,callback);
      }
      else {
        fs.readFile(method[1],callback);
      }
    }
  }
};

self.readFile = function(path, opts, callback) {
  self.queue(['readFile', path, opts, callback]);
};

self.writeFile = function(path,data,callback){
  self.queue(['writeFile'],data,callback);
};
