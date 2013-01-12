var fs = require('fs'),
    SC = require('sc-runtime'),
    util = require('util'),
    exec  = require('child_process').exec;
    
module.exports = SC.Object.create({
  
  init: function(){
    this._queue = [];
    this.currentTasks = [];
    this.guessMaxOpen();
  },
  
  maxOpen: 32,
  
  currentTasks: null,
  
  guessMaxOpen: function(){
    var me = this;
    exec('ulimit -n', function(err, stdout, stderr) {
      var m = 0, num = 0;
      if (err === null) {
        m = parseInt(stdout.trim(), 10);
        if (m > 0) {
          num = m / 16;
          me.maxOpen = (num >= 4)? num: 4;
        }
      }
      else {
        util.log('QFS: Error calculating maximum of simultaneous open files');
      }
    });    
  },
  
  _queue: null,
  
  queue: function(opts){
    this._queue.push(opts);
    util.log('queueing, num items in queue: ' + this._queue.length);
    util.log('items being handled: ' + this.currentTasks.length);
    this.parseQueue();
  },
  
  atMax: function(){
    if(this.currentTasks.length < this.get('maxOpen')){
      return false;
    }
    else return true;
  }.property(),
  
  parseTask: function(task){
    if(!task) return;
    this.currentTasks.push(task);
    this[task.method](task);
  },
    
  parseQueue: function(){
    var me = this;
    
    if(this._queue.length > 0){
      if(this.get('atMax')){
        //this.invokeLater('parseQueue');
        // process.nextTick(function(){ 
        //   util.log('calling parseQueue on nextTick');
        //   me.parseQueue.call(me); 
        // });
      } 
      else {
        var task = this._queue.shift();
        this.parseTask(task);
      }
    }
  },
  
  _parseFinished: function(task,err,data){
    this.currentTasks.removeObject(task);
    task.callback(err,data);
    this.parseQueue();
  },
  
  _readFile: function(task){
    var me = this;
    fs.readFile(task.path,task.opts,function(err,data){
      me._parseFinished.call(me,task,err,data);
    });
  },
  
  _writeFile: function(task){
    var me = this;
    fs.writeFile(task.path,task.data,function(err,data){
      me._parseFinished.call(me,task,err,data);
    });
  },
  
  _statFile: function(task){
    var me = this;
    fs.stat(task.path,function(err,data){
      me.currentTasks.removeObject(task);
      task.callback(err,data);
    });
  },
  
  readFile: function(path, opts, callback){
    if(!callback && opts && SC.typeOf(opts) === 'function'){
      callback = opts;
      opts = undefined;
    }
    this.queue({
      method: '_readFile',
      path: path,
      opts: opts,
      callback: callback
    });
  },
  
  writeFile: function(path,data,callback){
    this.queue({
      method: '_writeFile',
      path: path,
      data: data,
      callback: callback
    });
  },
  
  statFile: function(path,callback){
    this.queue({
      method: '_stat',
      path: path,
      callback: callback
    });
  }
  
  
});
// var self = this,
//     fs = require('fs'),
//     exec  = require('child_process').exec;
// 
// var openedFileDescriptorsCount = 0;
// 
// self.maxSimultaneouslyOpenedFileDescriptors = 32;
// 
// self.guessMaxSimultaneouslyOpenedFileDescriptors = function() {
//   exec('ulimit -n', function(err, stdout, stderr) {
//     var m = 0, num = 0;
//     if (err === null) {
//       m = parseInt(stdout.trim(), 10);
//       if (m > 0) {
//         num = m / 16;
//         self.maxSimultaneouslyOpenedFileDescriptors = (num >= 4)? num: 4;
//       }
//     }
//   });
// };
// self.guessMaxSimultaneouslyOpenedFileDescriptors();
// 
// self.queue = function(method) {
//   if (!self._queue) {
//     self._queue = [];
//   }
//   
//   self._queue.push(method);
//     
//   self.dequeue();
// };
// 
// self.dequeue = function() {
//   var method, func, opts, callback, cb;
//   
//   if (self._queue.length > 0 && openedFileDescriptorsCount < self.maxSimultaneouslyOpenedFileDescriptors) {
//     openedFileDescriptorsCount += 1;
//     
//     method = self._queue.shift();
//     
//     if (method[0] === 'readFile') {
//       if(method[3]){
//         cb = method[3];
//         opts = method[2];
//       }
//       else {
//         cb = method[2];
//       }
//       callback = function(err,data){
//         cb(err,data);
//         openedFileDescriptorsCount -= 1;
//         self.dequeue();
//       };
//       if(opts){
//         fs.readFile(method[1],opts,callback);
//       }
//       else {
//         fs.readFile(method[1],callback);
//       }
//     }
//   }
// };
// 
// self.readFile = function(path, opts, callback) {
//   self.queue(['readFile', path, opts, callback]);
// };
// 
// self.writeFile = function(path,data,callback){
//   self.queue(['writeFile'],data,callback);
// };
