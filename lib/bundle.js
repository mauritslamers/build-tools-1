var tools = require('./tools');
var File = require('./file').File;
var HandlerSet = require('./handlers/handler_set').HandlerSet;
var Framework = require('./framework').Framework;
var FrameworkBundler = require('./framework_bundler').FrameworkBundler;


/*

The MODULE_INFO object seems to have the following properties:

SC.MODULE_INFO = {
  
  'module_name': { //sc object?
    dependencies: [], // array with other module names
    dependents: [], // url of modules depending on this module (created by SC.MODULE)
    isLoaded: true, // flag to tell whether module is loaded (created by SC.MODULE)
    isPrefetched: true, // flag to tell whether module is already fetched, and can be executed immediately
    isPrefetching: true // flag to tell whether the module is being prefetched...
    isReady: true, // flag to tell the module is loaded?
    isWaitingForRunLoop: true, // flag whether the module is waiting for the runloop?? (why is this not internal? (_isWaitingForRunLoop))    
    scriptURL: "", // url to tell where the combined script is
    source: "", // url with the content of scriptURL?
    stringURL: "", // url with file 
    styles: [], // array with urls for css files,
    styles2x: [], // array with urls for css files, but for what exactly, SC2?
  }

}

*/

exports.Bundle = Framework.extend({

  isBundle: true,
  
  bundleDeps: null,
  shouldPreload: false,
  //shouldPrefetch: false,
  combineScripts: true,

  // afterFile: function(){
  //   var fn = this.get('name') + "/after.js";
  //   //var content = '; if ((typeof SC !== "undefined") && SC && SC.bundleDidLoad) SC.bundleDidLoad("';
  //   //content += this.get('name') + '");\n';
  //   // if(this.shouldPreload){
  //   //   var content = '; if()'
  //   // }
  //   // var content = '; if ((typeof SC !== "undefined") && SC && SC.Module && SC.Module._moduleDidLoad) SC.Module._moduleDidLoad("';
  //   // content += this.get('name') + '");\n';
  //   return this.createVirtualFile(fn,content);
  // }.property().cacheable(),

  init: function(){
    arguments.callee.base.apply(this,arguments);
    this.combineScripts = true; // override at all times...
  },

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
  
  bundleInfo: function(callback){
    var loaded = this.shouldPreload;
    var path = this.get('name');
    var me = this;
    //var tmp = path + ': { loaded: ' + loaded;
    
    var ret = {
      isLoaded: this.shouldPreload,
      isPrefetched: this.shouldPrefetch
    };
    
    var props = [];
    props.push('isLoaded: ' + this.shouldPreload);
    props.push(" isPrefetched: " + this.shouldPrefetch);
    if(this.bundleDeps){
      ret.dependencies = this.bundleDeps;
      //props.push('dependencies: [' + this.wrap(this.bundleDeps,"'").join(",") + "]");
    }
    if(this.get('orderedStylesheets').length > 0){
      ret.styles = [path + ".css"];
      //props.push("styles: ['" + path + ".css']");
    }
    if(!this.shouldPrefetch && this.get('orderedScripts').length > 0){
      ret.scriptURL = this.get('url') + ".js";
      //props.push("scriptURL: '" + this.get('url') + ".js'");
    }        
    
    if(this.shouldPrefetch){
      // create an extra virtual file with the stringified contents 
      var getcontents = function(callback){
        var s = me.orderedScripts[0];
        s.handler.handle(s,null,function(response){
          ret = "SC.MODULE_INFO['" + path + "'].source = " + JSON.stringify(response.data);
          callback(null,ret);
        });
      };

      var stringifiedBundle = File.create({
        path: path + "-stringified.js",
        content: getcontents,
        handler: HandlerSet.create({ handlerList: ['contentType','file']}),
        isScript: true,
        isVirtual: true,
        framework: me
      });
      me.server.files[stringifiedBundle.get('url')] = stringifiedBundle;
      // tools.log('orderedScripts length: ' + this.orderedScripts.get('length'));

      ret.stringURL = stringifiedBundle.get('url');
    }
    callback(path,ret);
  }
  
  
  // 
  // _makeFile: function(path,children){
  //   var me = this;
  //   return File.create({
  //     path: path,
  //     framework: me,
  //     handler: HandlerSet.create({ handlerList: "join".w()}),
  //     children: children
  //   });
  // },
  // 
  // scriptsFile: function(){
  //   var filename = this.get('name') + ".js";
  //   return this._makeFile(filename,this.get('orderedScripts'));
  // }.property(),
  // 
  // stylesheetsFile: function(){
  //   var filename = this.get('name') + ".css";
  //   return this._makeFile(filename,this.get('orderedStylesheets'));
  // }.property(),
  // 
  // save: function(){ 
  //   tools.log('saving bundle ' + this.get('name') + '...');
  //   tools.log('bundle savepath is ' + this.get('savePath'));
  //   var files = this.resources.concat([this.get('scriptsFile'), this.get('stylesheetsFile')]);
  //   files.forEach(this._save,this);
  // },
  //   
  // _save: function(file,index,files){
  //   var me = this;
  //   file.handler.handle(file,null,function(r){
  //     var path, nextf;
  //     if(r.data.length > 0){ // only save files with content
  //       path = tools.path.join(me.get('savePath'),file.get('savePath'));
  //       tools.log('saving file ' + file.get('path') + ' to path: ' + path);
  //       return;
  //       //tools.log('about to create dir for file ' + path);
  //       //tools.log('bundle is ' + me.get('name'));
  //       //tools.log('file is ' + file.get('savePath'));
  // 
  //       // tools.createDirectory(tools.path.dirname(path));
  //       // tools.fs.writeFile(path,r.data,function(err){
  //       //   if(err) throw err;
  //       //   tools.log('file ' + path);
  //       // });
  //       tools.createDir(tools.path.dirname(path), function(e){
  //         if(e) throw e;
  //         else {
  //           tools.fs.writeFile(path,r.data,function(err){
  //             if(err) throw err;
  //           });
  //         }
  //       });
  //     }
  //   });
  // }
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