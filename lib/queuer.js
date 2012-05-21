var SC = require('sc-runtime');
var tools = require('./tools');

exports.Queuer = SC.Object.extend({
  
  _queue: null,
  
  numQueues: 5,
  
  activeQueues: 0,
  
  queue: function(target,method,args,callback){
    if(!this._queue) this._queue = [];
    tools.log('adding call to queue, number of elements in queue: ' + this._queue.length);
    this._queue.push({ 
      target: target,
      method: method,
      args: args,
      callback: callback
    });
    this.dequeue();
  },
  
  dequeue: function(){
    var action, newArgs, me = this;
    if((this._queue.length > 0) && (this.activeQueues < this.numQueues)){
      this.activeQueues += 1;
      tools.log('taking item from queue into action: active queues: ' + this.activeQueues);
      action = this._queue.shift();
      if(action){
        action.args.push(function(){
          action.callback.apply(this,arguments);
          tools.log('finished one item, taking item out of active queue: ' + me.activeQueues);
          me.activeQueues -= 1;
          me.dequeue();
        });
        action.target[action.method].apply(action.target,action.args);
      }
    }
  }
  
});

/*
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
  var method, callback;
  
  if (self._queue.length > 0 && openedFileDescriptorsCount < self.maxSimultaneouslyOpenedFileDescriptors) {
    openedFileDescriptorsCount += 1;
    
    method = self._queue.shift();
    
    if (method[0] === 'readFile') {
      fs.readFile(method[1], function(err, data) {
        method[2](err, data);
        openedFileDescriptorsCount -= 1;
        self.dequeue();
      });
    }
  }
};

self.readFile = function(path, callback) {
  self.queue(['readFile', path, callback]);
};

self.writeFile = function(path,data,callback){
  self.queue(['writeFile'],data,callback);
};


*/