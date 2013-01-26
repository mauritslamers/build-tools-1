var SC = require('sc-runtime');
var File = require('./file');
var tools = require('./tools');
var scanner = require('./scanner');
var watcher = require('./watcher');

var Framework = SC.Object.extend({
  // configurables
  
  name: null, // name of the framework
  
  watchChanges: true, // watch for new files or removal of old files
  
  path: null, // where to find?
  
  // walk like a duck
  
  isFramework: true,
  
  belongsTo: null,
  
  resources: function(){
    var me = this;
    return Object.keys(this.allFiles).reduce(function(coll,fn){
      var file = me[fn];
      if(file && file.get('isResource')) coll.push(file);
      return coll;
    },[]);
  }.property('allFiles').cacheable(),
  
  scripts: function(){
    var me = this;
    return Object.keys(this.allFiles).reduce(function(coll,fn){
      var file = me[fn];
      if(file && file.get('isScript') && !file.get('isTest')) coll.push(file);
      return coll;
    },[]);
  }.property('allFiles').cacheable(),
  
  stylesheets: function(){
    var me = this;
    return Object.keys(this.allFiles).reduce(function(coll,fn){
      var file = me[fn];
      if(file && file.get('isStylesheet')) coll.push(file);
      return coll;
    },[]);
  }.property('allFiles').cacheable(),
  
  orderedScripts: function(){
    var allFiles = this.get('allFiles');
    return this.get('loadOrderScripts').map(function(fn){
      return allFiles[fn];
    });    
  }.property('loadOrderScripts'),
  
  tests: function(){
    var me = this;
    return Object.keys(this.allFiles).reduce(function(coll,fn){
      var file = me[fn];
      if(file && file.get('isScript') && file.get('isTest')) coll.push(file);
      return coll;
    },[]);
  }.property('allFiles').cacheable(),
  
  orderedStylesheets: null,
  
  allFiles: null,
  
  allFilesDidChange: function(){ // called when something happened to allFiles
    // trigger sorting
    this.sortScripts();
  },

  loadOrderScripts: null,
  
  _loadOrderScriptsDidChange: function(){
    
  }.observes('loadOrderScripts'),

  // watcher stuff
  _watcherDidFire: function(path){
    // update the information regarding this path
    this._updateFiles(path);
  },
  
  _updateFiles: function(path){
    var me = this;
    var hasChanges = false;
    // it would have been great to use a Set for allFiles, but SC.Set
    // only allows object checking, and there is now way to check for
    // properties
    if(!this.allFiles){ this.allFiles = {}; } // just assign, we don't need signal changes yet

    var pathToScan = path || this.path; 
    scanner(pathToScan,function(files){ // replies with a set of files
      if(me.watchChanges){ // register watchers
        files.filterProperty("type","directory").forEach(function(f){
          watcher.register(f.path,me);
        });
      }
      files.filterProperty('type','file').forEach(function(f){
        var ret;
        if(!me.allFiles[f.path]){ // only create when not already in
          ret = File.create({ 
            path: f.path,
            framework: me
          });
          if(!ret.get('isResource')){ // if a script or a css file, we want the file cached for ordering
            ret.retrieveContent(); 
          }
          me.allFiles[f.path] = ret;
          if(!hasChanges) hasChanges = true;          
        }
      });
      
    });
    if(hasChanges){
      this.allFilesDidChange();
    }
  },
  
  // 
  setupInFlight: false,
  
  setup: function(){
    var me = this;
    if(this.setupInFlight) return;
    
    this.setupInFlight = true;
    // first scan given path
    this._updateFiles(this.path);
  },
  
  //internal
  _sortingInFlight: false,
  
  _sortScripts: function(){
    var me = this, 
        count = 0, numscripts,
        tree = {}, namelist;
        
    if(this._sortingInFlight) return;
    this._sortingInFlight = true;
    var scripts = Object.keys(this.allFiles).reduce(function(coll,fn){
      var file = me[fn];
      if(file && file.get('isScript') && !file.get('isTest')) coll.push(file);
      return coll;
    },[]);
  
    if(this.sortByUglify){
      this._sortScriptsByUglify(scripts);
    }
    else {
      this._sortScriptsBySCRequire(scripts);
    }
  },
  
  _sortScriptsByUglify: function(files){ 
    // can this be done here at all? 
    // Not likely, so it might be that the sorting has to go one level up, to the app
  },
  
  _sortScriptsBySCRequire: function(files){
    var tree = {}, me = this,
        fwpath = this.path,
        count = 0,
        filesToHandle = SC.CoreSet.create(),
        coreFile, corePath, numscripts;
        
    // more complex than seems necessary, but allows for things 
    // like core.coffee instead of core.js
    coreFile = files.find(function(f){
      var p = f.get('path');
      if(p.indexOf(tools.path.join(fwpath,"core" + f.get('extname'))) > -1){ 
        return f;
      }
    });
    
    corePath = coreFile.get('path');
    tree[corePath] = { before: [] }; // only befores
    
    var isReady = function(p){
      count += 1;
      filesToHandle.remove(p);
      if(count >= numscripts && filesToHandle.get('length') === 0){ // now really done
        var order = me._parseDependencyTree(tree);
        me.set('loadOrderScripts',order);
        me._sortingInFlight = false;
      }
    };
    
    numscripts = files.length;
    files.forEach(function(s){
      var sPath = s.get('path');
      filesToHandle.push(sPath);
      s.content(function(err,content){
        var re, relpath, fullpath, match;
        re = new RegExp("require\\([\"'](.*?)[\"']\\)", "g");
        while (match = re.exec(content)) {
          relpath = match[1];
          // append coreFile extension if not present in relpath
          if(!tools.path.extname(relpath)) relpath += coreFile.get('extname');          
          fullpath = tools.path.join(fwpath,relpath);
          if(!tree[sPath]){
            tree[sPath] = { before: [], after: [corePath] }; // always after corePath
          }
          // set current script path to be after fullpath
          if(!tree[sPath].after.indexOf(fullpath) > -1) tree[sPath].after.push(fullpath);
          // set fullpath script to be before current script
          if(!tree[fullpath].before.indexOf(sPath) > -1) tree[fullpath].before.push(sPath);
          // set core to be before current script
          if(!tree[corePath].before.indexOf(sPath)) tree[corePath].before.push(sPath); 
        }
        isReady(sPath); // done with this file        
      });
    });
    
  },
  
  _parseDependencyTree: function(tree){
    // some internal functions that differ from the SC ones (ie these are non-destructive)
    var insertAt = function(ary,pos,el){
      var ret = ary.slice(0,pos);
      var rest = ary.slice(pos);
      return ret.concat(el,rest);
    }; // return new array
    
    var moveTo = function(ary,posFrom,posTo){
      var ret,item,inb,rest;
      if(posFrom === posTo) return ary; 
      if(posFrom < posTo){
        ret = ary.slice(0,posFrom);
        item = ary[posFrom];
        inb = ary.slice(posFrom+1,posTo+1); // don't take posFrom, because it will be moved
        rest = ary.slice(posTo+1);  
        return ret.concat(inb,item,rest);       
      }
      else {
        ret = ary.slice(0,posTo);
        item = ary[posFrom];
        inb = ary.slice(posTo,posFrom);
        rest = ary.slice(posFrom+1);
        return ret.concat(item,inb,rest);
      }
    };
    
    // do twice to make sure they are indeed not the same array
    var keys = Object.keys(tree);
    // we already put everything in, so we don't have to add stuff in the loop
    var order = Object.keys(tree); 
    
    var key_i,key_len, a_i,a_len,b_i,b_len;
    var alist, blist;
    var curIndex, apos, bpos, key;
    for(key_i=0,key_len=keys.length;key_i<key_len;key_i+=1){
      key = keys[key_i];    
      curIndex = order.indexOf(key);
      alist = tree[key].after;
      blist = tree[key].before;
      for(a_i=0,a_len=alist.length;a_i<a_len;a_i+=1){
        apos = order.indexOf(alist[a_i]);
        if(curIndex<apos){
          order = moveTo(order,curIndex,apos+1);
          curIndex = order.indexOf(key);
        }
      }
      for(b_i=0,b_len=blist.length;b_i<b_len;b_i+=1){
        bpos = order.indexOf(blist[b_i]);
        if(bpos<curIndex){
          order = moveTo(order,curIndex,bpos);
          curIndex = order.indexOf(key);          
        }
      }
    }
    return order;
  },
  
  
  // targets: function(){
  //   return {
  //     kind: 'framework',
  //     name: "/" + this.get('url'),
  //     link_docs: '',
  //     link_root: this.get('url'),
  //     link_tests: this.get('url') + "/tests/-index.json"
  //   };
  // }.property().cacheable(),
  
  readOrderedScripts: function(){ // readScripts will join the ordered scripts
    
  },
  
  readOrderedStylesheets: function(callback){ //readStylesheets will join the ordered styleSheets
    
  },
  
  //// server interface, should be sort of the same as the file content interface
  _getFileCbs: null,
  
  getFile: function(url,callback){
    if(!this._getFileCbs) this._getFileCbs = {};
    if(this.setupInFlight){
      
    }
  }
  
});