var tools = require('./tools');
var File = require('./file').File;
var HandlerSet = require('./handlers/handler_set').HandlerSet;
var Framework = require('./framework').Framework;

exports.Bundle = Framework.extend({
  
  bundleDeps: null,
  shouldPreload: false,
  savePath: null, // we have the savePath to be able to save the bundle
  
  add: function(scripts,stylesheets,resources){
    if(scripts) this.orderedScripts = this.orderedScripts.concat(scripts);
    if(stylesheets) this.orderedStylesheets = this.orderedStylesheets.concat(stylesheets);
    if(resources) this.resources = this.resources.concat(resources);
  },
  
  _wrap: function(list,openchar,closechar){
    if(!closechar) closechar = openchar;
    var f = function(item){
      return [openchar,item,closechar].join("");
    };
    return list.map(f);
    /* ret.push(wrapper + ary[i] + wrapper); */
  },
  
  bundleInfo: function(){
    var loaded = !this.shouldPreload;
    var path = this.get('name');
    var tmp = path + ': { loaded: ' + loaded;
    if(this.bundleDeps){
      tmp += ', requires: [' + this.wrap(bundle.bundleDeps,"'").join(",") + "] ";
    }
    if(this.orderedStylesheets.length > 0){
      tmp += ", styles: ['" + path + ".css']";
    }
    if(this.orderedScripts.length > 0){
      tmp += ", scripts: ['" + path + ".js']";
    }
    tmp += "}";
    return tmp;
  }.property(),
  
  _makeFile: function(path,children){
    return File.create({
      path: path,
      framework: this.framework,
      handler: HandlerSet.create({ handlersList: "join".w()}),
      children: children
    });
  },
  
  scriptsFile: function(){
    var filename = this.get('name') + ".js";
    var path = tools.path.join(this.savePath,filename);
    return this._makeFile(path,this.orderedScripts);
  }.property(),
  
  stylesheetsFile: function(){
    var filename = this.get('name') + ".css";
    var path = tools.path.join(this.savePath,filename);
    return this._makeFile(path,this.orderedStylesheets);
  }.property(),
  
  saveTo: function(){ 
    // path should be a directory!
    var files = this.resources.concat([this.get('scriptsFile'), this.get('stylesheetsFile')]);
    files.forEach(this._save);
  },
  
  _save: function(file){
    var me = this;
    file.handler.handle(file,null,function(r){
      var path;
      if(r.data.length > 0){ // only save files with content
        path = tools.path.join(me.savePath,file.get('savePath'));
        tools.createDirectory(tools.path.dirname(path));
        tools.fs.writeFile(path,r.data,function(err){
          if(err) throw err;
        });
      }
    });
  }
});

/*
App.prototype._saveBundles = function(bundles){
  var path, bundle,
      me = this,
      styleSheet, script, resources;

  var makeFile = function(path,children){
    return new File({
      path: path,
      framework: me,
      handler: sharedHandlers.build(['join']),
      children: children
    });
  };

  for(path in bundles){
    if(!bundles[path].shouldPreload){ // don't save bundles that are preloaded
      styleSheet = makeFile((path + '.css'),bundles[path].stylesheets);
      script = makeFile((path + '.js'),bundles[path].scripts);
      this._makeSaver(me,styleSheet)();
      this._makeSaver(me,script)();
      resources = bundles[path].resources;
      l.sys.puts('resources in bundle ' + path + ": " + l.sys.inspect(bundles[path].resources));
      if(resources && (resources.length > 0)) resources.forEach(function(resource){ me._makeSaver(me,resource)(); });
    }
  }
*/