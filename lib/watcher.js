var SC = require('sc-runtime');
var fs = require('fs');

// separately, because only directories should be watched
// will call Framework#_watcherDidFire by default, otherwise callback

module.exports = SC.Object.create({ // create on purpose, should be singleton
  
  _watchers: {},
  
  _watcherDidFire: function(path){
    var pathrec = this._watchers[path];
    if(pathrec){
      pathrec.frameworks.forEach(function(fw){
        fw.watcherDidFire.call(fw,path);
      });
    }
    else tools.log("WARNING: a watcher is called for a path that doesn't exist in the watcher list??? Please file a bug!");
  },
  
  
  // callback is optional
  register: function(path,fw){
    var w, me = this;
        
    if(fs.existsSync(path)){
      if(!this._watchers[path]){ // create
        this._watchers[path] = {
          watcher: fs.watch(path,function(){
            me._watcherDidFire.call(me,path);
          }),
          frameworks: [fw]
        };
      }
      else { // update, add fw
        if(this._watchers[path].frameworks.indexOf(fw) === -1){ // only add when not already exists
          this._watchers[path].frameworks.push(fw);
        }
        else return false; // not added
      }
    }
    else return false;
    
    return true; // default, we did add
  },
  
  unregister: function(path,fw){
    var pathrec = this._watchers[path];
    if(pathrec){
      if(pathrec.frameworks.indexOf(fw) > -1){
        pathrec.frameworks.removeObject(fw);
      }
      if(pathrec.frameworks.length === 0){ // empty, get rid of everything
        pathrec.w.close();
        this._watchers[path] = undefined; //prime for GC
      }
    }
  },
  
  clear: function(){
    Object.keys(this._watchers).forEach(function(path){
      if(this._watchers[path] && this._watchers[path].w){ // a real path rec
        this._watchers[path].w.close();
        this._watchers[path] = undefined; 
      }
    });
  }
});