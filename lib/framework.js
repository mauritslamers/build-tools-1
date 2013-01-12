// App is extended framework, Sproutcore will be also a special framework extension
var tools = require('./tools');
var SC = require('sc-runtime');
var sys = tools.util;
var File = require('./file').File;
var Scanner = require('./scanner').Scanner;
//var sharedHandlers = require('./handlers').sharedHandlers;
var HandlerSet = require('./handlers/handler_set').HandlerSet;

exports.Framework = SC.Object.extend({
  path: null,
  buildVersion: null,
  combineScripts: false,
  combineStylesheets: true,
  minifyScripts: false,
  minifyStylesheets: false,
  defaultLanguage: 'english',
  buildLanguage: 'english',
  createSprite: false, // make a single sprite for all css files
  
  isBundle: false,
  isFramework: true, // identifier...
  shouldPreload: true,
  watchForChanges: false, // watch for changes by default
  
  // nodify settings
  nodifyScripts: false, // create a node.js module for this framework
  nodeBefore: null, // what content to add before the node requires
  nodeAfter: null, // what content to add after the node required
  
  savePath: function(){
    return tools.path.join(this.get('buildPath'), this.get('buildVersion'));
  }.property('buildPath'), // where to save the framework in save mode

  //internal stuff
  resources: null, // contains all the resource files
  orderedScripts: null, // contains all the scripts in order
  orderedStylesheets: null, //contains all the stylesheets in order
  
  init: function(){
    arguments.callee.base.apply(this,arguments);
    var pathsToExclude = [/(^\.|\/\.|tmp\/|debug\/|test_suites\/|setup_body_class_names)/];
    if (this.pathsToExclude instanceof Array) {
      pathsToExclude = this.pathsToExclude.concat(pathsToExclude);
    } else if (this.pathsToExclude instanceof RegExp) {
      pathsToExclude.push(this.pathsToExclude);
    }
    this.pathsToExclude = pathsToExclude;
    
    if(!this.resources) this.resources = [];
    if(!this.orderedStylesheets) this.orderedStylesheets = [];
    if(!this.orderedScripts) this.orderedScripts = [];
  },

  nameFor: function(path){
    return path.replace(/(^apps|bundles|frameworks|^themes|([a-z]+)\.lproj|resources)\//g, '');
  },
  
  urlFor: function(path){
    //return tools.path.join(this.buildVersion, this.nameFor(path));
    return this.nameFor(path);
  },
  
  name: function(){
    return this.nameFor(this.get('path'));
  }.property('path'),
  
  url: function(){
    return this.urlFor(this.get('name'));
  }.property('name'),
  
  shouldExcludeFile: function(path){
    return this.pathsToExclude.reduce(function(bool, re) {
      return bool || re.test(path);
    }, false);    
  },
  
  targets: function(){
    return {
      kind: 'framework',
      name: "/" + this.get('url'),
      link_docs: '',
      link_root: this.get('url'),
      link_tests: this.get('url') + "/tests/-index.json"
    };
  }.property().cacheable(),
  
  createVirtualFile: function(path,content,fw,handlerList){
    if(!fw) fw = this;
    var hlist = handlerList || "contentType file".w(); // provide some sensible defaults
    return File.create({
      //path: tools.path.join(fw.get('path'),path),
      path: path,
      framework: fw,
      handler: HandlerSet.create({ 
        urlPrefix:"",
        handlerList: hlist
      }),
      isVirtual: true,
      content: function(callback){
        callback(null,content);
      }
    });
  },
  
  beforeFile: function(){
    return null;
  }.property().cacheable(),
  
  afterFile: function(){
    // var fn = this.get('name') + "/after.js";
    // //var content = '; if ((typeof SC !== "undefined") && SC && SC.bundleDidLoad) SC.bundleDidLoad("';
    // //content += this.get('name') + '");\n';
    // var content = '; if ((typeof SC !== "undefined") && SC && SC.Module && SC.Module._moduleDidLoad) SC.Module._moduleDidLoad("';
    // content += this.get('name') + '");\n';
    // return this.createVirtualFile(fn,content);
    return null; // no need for preloaded frameworks
  }.property().cacheable(),
  
  scanFiles: function(callback){
    return Scanner.create({ path: this.path, framework: this, callback: callback });
  },
  
  computeDependencies: function(files,callback){
    var me = this,
        counter = 0,
        finished = 0;
    
    var hasFinished = function(){
      finished += 1;
      //sys.log('counter in computeDependencies: ' + counter);
      if((counter === finished) && callback) callback(files);
    };
    
    var filematcher = function(file){
      //tools.log('filematcher called...');
      counter += 1;
      tools.qfs.readFile(file.path,function(err,data){
        var re, match, path;
        if(err) throw err;
        file.deps = [];
        re = new RegExp("require\\([\"'](.*?)[\"']\\)", "g");
        while (match = re.exec(data)) {
          path = match[1];
          if (!/\.js$/.test(path)) path += '.js';
          file.deps.push(me.urlFor(tools.path.join(me.path, path)));            
        }
        hasFinished();
      });
    };
    if(files.length === 0) tools.log('no script files for fw: ' + me.get('name'));
    if(files.length > 0) return files.forEach(filematcher);
    else callback(files);
  },
  
  sortDependencies: function(file, orderedFiles, files, recurHistory){
    var me = this;
    if(!recurHistory) recurHistory = [];
    
    var f = function(url){
      var result = files.findProperty('url',url);
      if(result){
        me.sortDependencies(result, orderedFiles, files, recurHistory);
      }
      else {
        tools.util.puts('WARNING: ' + url + ' is required in ' + file.get('url') + ' but cannot be found.');
      }
    };
    
    if(recurHistory.indexOf(file) !== -1) return;
    else recurHistory.push(file);
    
    if(orderedFiles.indexOf(file) === -1){
      if(file.deps) file.deps.forEach(f);
      orderedFiles.push(file);
    }
  },
  
  orderScripts: function(scripts,callback){
    var me = this;
    
    var sort = function(scripts){
      var orderScripts = [],
          coreJsPath = tools.path.join(me.get('path'),'core.js'),
          coreJs,sortedScripts,i,
          sorter = function(a,b){
            return a.get('path').localeCompare(b.get('path'));
          };
      
      sortedScripts = scripts.sort(sorter);
      
      sortedScripts.forEach(function(script){
        if (/strings\.js$/.test(script.path)) {
          this.sortDependencies(script, orderScripts, sortedScripts);
        }
        if (script.path === coreJsPath) {
          coreJs = script;
        }        
      },me);
      
      // then core.js and its dependencies
      if (coreJs) {
        //sys.log('corejs found for fw: ' + me.path);
        me.sortDependencies(coreJs, orderScripts, sortedScripts);
        sortedScripts.forEach(function(script) {
          if (script.deps && script.deps.contains(coreJs.path)) {
            this.sortDependencies(script, orderScripts, sortedScripts);
          }
        },me);
      }
      
      // then the rest
      sortedScripts.forEach(function(script){
        this.sortDependencies(script, orderScripts, sortedScripts);
      },me);
      
      while (scripts.shift()) {} // empty scripts to keep ref, refill from orderScripts
      while (i = orderScripts.shift()) { scripts.push(i); }
      
      callback();
    };
    //sys.log('orderscripts called...');
    this.computeDependencies(scripts,sort);
  },
  
  _selectLanguageFiles: function(files){
    var tmpFiles = {},
        file;
    
    files.forEach(function(file1) {
      var file1Url = file1.get('url'),
          file2 = tmpFiles[file1Url],
          file1Language = file1.get('language');
      
      if (file1Language === null || 
          file1Language === this.buildLanguage || 
          file1Language === this.buildLanguage.toShortLanguage() || 
          file1Language === this.defaultLanguage ||
          file1Language === this.defaultLanguage.toShortLanguage()) {
        if (file2 === undefined) {
          tmpFiles[file1Url] = file1;
        } else if (file1Language === this.buildLanguage) {
          tmpFiles[file1Url] = file1;
        }
      }
    },this);
    
    files = [];
    for (file in tmpFiles) {
      if(tmpFiles.hasOwnProperty(file)) files.push(tmpFiles[file]);
    }
    
    return files;
  },
  
  _buildStylesheets: function(files){
    var tmpFiles = [],
        handlers = 'ifModifiedSince contentType'.w(),
        combineStylesheets = this.get('combineStylesheets'),
        handler, file;
      
    if(this.minifyScripts) handlers.push('minify');
    //handlers.push(['rewriteStatic', "url('%@')"], 'join', 'file');
    if(this.stylesheetProcessor === 'sass'){
      handlers.push('sass','sass_theme');
    }
    else handlers.push('less','less_theme');
    handlers.push('slices',['rewriteStatic', "url('%@')"], 'file'); // file is done by join if needed
    
    tmpFiles = files.filterProperty('isStylesheet',true);
    tmpFiles = tmpFiles.length > 0? tmpFiles.sortProperty('path'): tmpFiles;
    
    if(this.combineStylesheets){
      file = File.create({
        path: this.path + '.css',
        isVirtual: true, // virtual file, because doesn't exist on disk
        framework: this,
        handler: HandlerSet.create({ 
          urlPrefix:"",
          handlerList: ['contentType','join']
        }),
        children: tmpFiles.map(function(file){
          file.handler = HandlerSet.create({
            urlPrefix: "",
            handlerList: handlers
          });
          return file;
        })
      });
      this.server.files[file.get('url')] = file;
      this.orderedStylesheets = [file];
    }
    else {
      this.orderedStylesheets = tmpFiles.map(function(file){ 
        file.handler = HandlerSet.create({ 
          //urlPrefix: "/",
          urlPrefix: this.urlPrefix,
          handlerList: handlers 
        },this);
        this.server.files[file.get('url')] = file;
        return file;
      },this).sort(function(a,b){
        return a.path.localeCompare(b.path);
      });
    }
  },
  
  _buildScripts: function(files,callback){
    var tmpFiles = [],
        basicCombinedHandlers = "ifModifiedSince contentType file".w(),
        basicSingleFileHandlers = "ifModifiedSince contentType rewriteStatic rewriteSuper file".w(),
        beforeFile = this.get('beforeFile'),
        afterFile = this.get('afterFile'),
        combineScripts = this.get('combineScripts'),
        handler, file, me = this;
        
    this.orderedScripts = [];
    
    if(this.minifyScripts) handlers.push('minify'); // this needs to be moved
    
    //handlers.push('rewriteSuper', 'rewriteStatic', 'join','file');
    //handlers.push('rewriteSuper', 'rewriteStatic', 'file');
    
    // for some strange reason the rewriters need to be further up the chain...
    // if the rewriters are put on the file themselves (especially rewriteStatic)
    // they start replacing more than needed... ?
    // so this solution is _not_ ideal, but a ordinary hack
    
    tmpFiles = files.filterProperty('isScript',true);
    
    this.orderScripts(tmpFiles, function(){
      //tools.log('orderscripts for ' + me.get('name') + " calling cb..");
      //tools.log('combineScripts is: ' + me.combineScripts);
      var file;
      if(beforeFile) tmpFiles.unshift(beforeFile);
      if(afterFile) tmpFiles.push(afterFile);
      if(me.combineScripts){ 
        file = File.create({ 
          path: me.get('path') + ".js",
          isVirtual: true, // virtual file, because it doesn't exist on disk
          framework: me,
          handler: HandlerSet.create({ 
            urlPrefix: "",
            //handlerList: handlers 
            handlerList: ['contentType','rewriteSuper','rewriteStatic','join'] 
          }),
          children: tmpFiles.map(function(f){
            f.handler = HandlerSet.create({
              urlPrefix: "",
              handlerList: basicCombinedHandlers
            });
            return f;
          })
        });
        me.server.files[file.get('url')] = file;
        me.orderedScripts = [file];
        //tools.log('orderScripts is combining scripts for: ' + me.get('name') + " and file is " + file.get('url'));
      }
      else {
        //handler = sharedHandlers.build(['contentType', 'file']);
        handler = HandlerSet.create({ handlerList: "contentType file".w()});
        if(beforeFile){
          beforeFile.handler = handler;
          me.server.files[beforeFile.get('url')] = beforeFile;
        }
        if(afterFile){
          afterFile.handler = handler;
          me.server.files[afterFile.get('url')] = afterFile;
        }
        me.orderedScripts = tmpFiles.map(function(file){
          file.handler = HandlerSet.create({ 
            urlPrefix: "/",
            handlerList: basicSingleFileHandlers 
          });
          me.server.files[file.get('url')] = file;
          return file;
        },this);
      }
      callback();
    });
  },
  
  _buildResources: function(files){
    //var handler = sharedHandlers.build("ifModifiedSince contentType file".w());
    
    this.resources = files.filterProperty('isResource',true).map(function(file){
      file.handler = HandlerSet.create({ handlerList: "ifModifiedSince contentType file".w()}); 
      this.server.files[file.get('url')] = file;
      //this.server.registerURL(file.get('url'),file);
      return file;
    },this);
  
  },
  
  _buildTests: function(files){
    //var handler = sharedHandlers.build("contentType rewriteFile wrapTest file".w());
    var me = this;
    var fwname = this.get('name');
    this._tests = [];
    var _indexjson = [];
    var htmlfile = function(f){
      //createVirtualFile: function(path,content,fw,handlerList){
      // remove extension from path
      var path = f.get('path');
      var p = path.substr(0,path.length-3) + ".html"; // -.js +.html
      var c = ["<html><head>"];
      c.push("<title>" + me.get('name') + "</title>");
      c.push('<link href="/sproutcore/testing.css" rel="stylesheet" type="text/css">');
      c.push("</head><body>");
      c.push('<script type="text/javascript">String.preferredLanguage = "english";</script>');
      c.push('<script type="text/javascript" src="/sproutcore/bootstrap.js"></script>');
      c.push('<script type="text/javascript" src="/sproutcore/jquery.js"></script>');
      c.push('<script type="text/javascript" src="/sproutcore/debug.js"></script>');
      c.push('<script type="text/javascript" src="/sproutcore/runtime.js"></script>');
      c.push('<script type="text/javascript" src="/sproutcore/foundation.js"></script>');
      c.push('<script type="text/javascript" src="/sproutcore/datastore.js"></script>');
      c.push('<script type="text/javascript" src="/sproutcore/desktop.js"></script>');
      c.push('<script type="text/javascript" src="/sproutcore/core_tools.js"></script>');
      c.push('<script type="text/javascript" src="/sproutcore/animation.js"></script>');
      c.push('<script type="text/javascript" src="/sproutcore/testing.js"></script>');
      c.push('<script type="text/javascript" src="/sproutcore/themes/empty_theme/theme.js"></script>');
      c.push('<script type="text/javascript" src="/' + f.get('url') + '"> </script>');
      c.push("</html>");
      return me.createVirtualFile(p,c.join("\n")); // add html content and scripts
    };
    files.filterProperty('isTest',true).map(function(file){
      file.handler = HandlerSet.create({ handlerList: "contentType rewriteFile wrapTest file".w()});
      //this.server.registerURL(file.get('url'),file);
      this.server.files[file.get('url')] = file;
      var html = htmlfile(file);
      //this.server.registerURL(html.get('url'),html);
      this.server.files[html.get('url')] = html;
      this._tests.push(file);
      var fn = file.get('url');
      fn = fn.substr(fn.indexOf(fwname) + fwname.length + 1);
      fn = fn.substr(0,fn.length - file.get('extname').length);
      _indexjson.push({url: html.get('url'), filename: fn });
      return file;
    },this);
    var infourl = this.get('url') + "/tests/-index.json";
    var infojsonfile = this.createVirtualFile("-index.json",JSON.stringify(_indexjson));
    //this.server.registerURL(infourl,infojsonfile);
    this.server.files[infourl] = infojsonfile;
  },

  _watchers: null,
  
  _changewatcher: function(event,filename){
    //tools.log('_changewatcher: event: ' + event + ' and filename: ' + filename);
    //if we are hit, get rid of all files belonging to this framework, then rebuild
    var files = this.server.files;
    for(var i in files){
      if(files.hasOwnProperty(i)){
        if(files[i].framework === this){
          delete files[i];
        }
      }
    }
    // remove watchers
    this._watchers.forEach(function(w){ w.close(); });
    // next rebuild:
    this.build();
  },
  
  findResourceFor: function(filename){
    //tools.log('findResources for filename: ' + filename);
    var r = this.resources;
    if(!r) return [];
    var targetfn = tools.path.basename(filename); // strip off anything that doesn't belong there...
    var ret = this.resources.filter(function(f){
      if(tools.path.basename(f.get('path')) === targetfn) return true;
    });
    //tools.log('found resources for filename: ' + filename + " : " + ret.getEach('path'));
    return ret;
  },
  
  _startBuilding: function(files){
    var me = this;
    files = this._selectLanguageFiles(files);  
    this.files = files;
    
    //tools.log('_startbuilding for ' + this.get('name'));
    
    this._buildStylesheets(files);
    this._buildResources(files);
    this._buildTests(files);
    this._buildScripts(files, function(){
      //tools.log('about to callback for fw: ' + me.get('name'));
      // 
      me._cb();
    });    
  },
  
  _cb: null,
  
  build: function(callback){
    var me = this;
    if(callback) this._cb = callback;
    var f = function(){
      me._startBuilding.apply(me,arguments);
    };
    
    this.scanFiles(f);
  },
  
  _makeFile: function(path,children){
    var me = this;
    var hlist = [];
    if(this.minifyOnSave) hlist.push('minify','join');
    else hlist.push('join');
    //tools.log('making virtual file ' + path + " with hlist " + hlist);
    return File.create({
      path: path,
      framework: me,
      handler: HandlerSet.create({ handlerList: hlist }),
      children: children
    });
  },
  
  // this function is here to enable proper saving of bundles... 
  // Without this running the handlers, the files handlers were not called in specific cases
  // so, we force running the handlers when saving a fw
  // for every file it checks whether there are handlers, if there are, it will run them
  // if not, it just takes the file as is.
  _combineOrderedFiles: function(files,cb){
    var me = this;
    var len = files.length;
    var count = 0;
    var newfiles = [];
    var filelist = {};
    var isReady = function(f){
      count += 1;
      if(count === len){
        cb(newfiles);
      }
    };
    
    files.forEach(function(f,i){
      var path = f.get('path');
      if(f.handler){
        f.handler.handle(f,null,function(r){
          newfiles[i] = me.createVirtualFile(path,r.data,f.framework);
          isReady(f);
        });
      }
      else {
        newfiles[i] = f;
        isReady(f);
      }
    });
  },
  
  // function to create a combined scripts file, when fw is bundle or anything else...
  scriptsFile: function(cb){
    var me = this;
    var filename = this.get('name') + ".js";
    var oScripts = this.get('orderedScripts');
    this._combineOrderedFiles(oScripts, function(scripts){
      tools.log('scriptsFile...');
      this._combineOrderedForScripts = false;
      cb(me._makeFile(filename,scripts));
    });
  },
    
  _nodeRequires: function(){
    // gather all the ordered scripts, generate a list of require statements
    // if combineOnSave, this is one file name, otherwise each individual file
    var content = "",
        oScripts = this.get('orderedScripts');
    
    if(this.combineOnSave){
      content = "require('./" + this.get('name') + ".js');";
    } 
    else {
      oScripts.forEach(function(s){
        content += "require('./" + s.get('savePath') + "');"; // make relative paths
      });
    }   
    return content;
  }.property(),
  
  nodeModuleFile: function(cb){
    var me = this,
        fn = this.get('name') + "_node.js",
        before = this.get('nodeBefore'),
        after = this.get('nodeAfter'),
        c = this.get('_nodeRequires'),
        content = [];
        
    tools.log('nodeModuleFile is called...');

    if(before) content.push(before);
    if(c) content.push(c);
    if(after) content.push(after);
    
    var file = this.createVirtualFile(fn,content.join("\n"),me);
    
    if(cb) cb(file);
    else return file;
  },
  
  stylesheetsFile: function(cb){
    var me = this;
    var filename = this.get('name') + ".css";
    var oStylesheets = this.get('orderedStylesheets');
    this._combineOrderedFiles(oStylesheets,function(stylesheets){
      cb(me._makeFile(filename,stylesheets));
    });
  },
  
  save: function(){ 
    var files = this.get('resources') || [];
    var me = this;
    var count = 0;
    var numfiles = this.nodifyScripts? 3: 2; // hardcoding is the only option for now
    
    tools.log('saving framework ' + this.get('name') + '...');
    tools.log('nodifyScripts is ' + this.nodifyScripts);
    //tools.log('bundle savepath is ' + this.get('savePath'));
    //tools.log('combineOnSave is:  ' + this.combineOnSave);

    var f = function(combinedFiles){
      count += 1;
      files = files.concat([combinedFiles]);
      if(count === numfiles){
        files.forEach(me._save,me);
      }
    };
    
    if(this.combineOnSave){ // only allow minify when also combine
      if(this.nodifyScripts) this.nodeModuleFile(f);
      this.scriptsFile(f);
      this.stylesheetsFile(f);
    }
    else {
      if(this.nodifyScripts) files.push(this.nodeModuleFile()); 
      files = files.concat(this.get('orderedScripts'), this.get('orderedStylesheets'));
    }
    files.forEach(this._save,this);
  },
  
  _savecount: 0,
  
  _aftersavecount: 0,
    
  _save: function(file,index,files){
    var me = this;
    if(file.get('isScript')) tools.log('_save for file ' + file.get('savePath'));
    me._savecount += 1;
    tools.log(me.get('path') + ' savecount before handlers: ' + me._savecount); 
    file.handler.handle(file,null,function(r){
      var path, nextf;
      me._aftersavecount += 1;
      tools.log(me.get('path') + ' savecount after handlers: '  + me._aftersavecount);
      if(file.get('isScript')) tools.log('after handlers saving file ' + file.get('savePath'));
      if(r.data.length > 0){ // only save files with content
        path = tools.path.join(me.get('savePath'),file.get('savePath'));
        //tools.log('saving file to path: ' + path);
        //return;
        //tools.log('about to create dir for file ' + path);
        //tools.log('bundle is ' + me.get('name'));
        //tools.log('file is ' + file.get('savePath'));
        // there doesn't seem to be a way to do this non-blocking, as the tree has to be created in 
        // the proper order, and non-blocking doesn't guarantee this order...
        tools.createDirectory(tools.path.dirname(path));
        tools.fs.writeFile(path,r.data,function(err){
          if(err) throw err;
          tools.log('file ' + path);
        });
        // tools.createDir(tools.path.dirname(path), function(e){
        //           if(e) throw e;
        //           else {
        //             tools.fs.writeFile(path,r.data,function(err){
        //               if(err) throw err;
        //             });
        //           }
        //         });
      }
    });
  }
  
});

/*

Framework.prototype.build = function(callback) {
  var that = this;
  
  var selectLanguageFiles = function(files) {
    var tmpFiles = {},
        file;
    
    files.forEach(function(file1) {
      var file2 = tmpFiles[file1.url()],
          file1Language = file1.language();
      
      if (file1Language === null || 
          file1Language === that.buildLanguage || 
          file1Language === that.buildLanguage.toShortLanguage() || 
          file1Language === that.defaultLanguage ||
          file1Language === that.defaultLanguage.toShortLanguage()) {
        if (file2 === undefined) {
          tmpFiles[file1.url()] = file1;
        } else if (file1Language === that.buildLanguage) {
          tmpFiles[file1.url()] = file1;
        }
      }
    });
    
    files = [];
    for (file in tmpFiles) {
      files.push(tmpFiles[file]);
    }
    
    return files;
  };
  
  var buildStylesheets = function(files) {
    var tmpFiles = [],
        handlers = [],
        handler, file;
    
    handlers.push('ifModifiedSince', 'contentType');
    if (that.minifyScripts === true) {
      handlers.push('minify');
    }
    handlers.push(['rewriteStatic', "url('%@')"], 'join', 'file');
    
    handler = sharedHandlers.build(handlers);
    
    if (that.combineStylesheets === true) {
      files.forEach(function(file) {
        if (file.isStylesheet()) {
          tmpFiles.push(file);
        }
      });
      file = new File({
        path: that.path + '.css',
        framework: that,
        handler: handler,
        children: tmpFiles
      });
      that.server.files[file.url()] = file;
      that.orderedStylesheets = [file];
      
    } else {
      files.forEach(function(file) {
        if (file.isStylesheet()) {
          file.handler = handler;
          that.server.files[file.url()] = file;
          tmpFiles.push(file);
        }
      });
      that.orderedStylesheets = tmpFiles.sort(function(a, b) {
        return a.path.localeCompare(b.path);
      });
    }
    
  };
  
  var buildScripts = function(files, callback) {
    var tmpFiles = [],
        handlers = [],
        beforeFile = that.beforeFile(),
        afterFile = that.afterFile(),
        handler, file;
    
    that.orderedScripts = [];
    
    handlers.push('ifModifiedSince', 'contentType');
    if (that.minifyScripts === true) {
      handlers.push('minify');
    }
    handlers.push('rewriteSuper', 'rewriteStatic', 'join', 'file');
    
    handler = sharedHandlers.build(handlers);
    
    files.forEach(function(file) {
      if (file.isScript()) {
        if (that.combineScripts !== true) {
          file.handler = handler;
          that.server.files[file.url()] = file;
        }
        tmpFiles.push(file);
      }
    });
    
    that.orderScripts(tmpFiles, function() {      
      if (beforeFile) tmpFiles.unshift(beforeFile);
      if (afterFile) tmpFiles.push(afterFile);

      if (that.combineScripts === true) {
        file = new File({
          path: that.path + '.js',
          framework: that,
          handler: handler,
          children: tmpFiles
        });
        that.server.files[file.url()] = file;
        that.orderedScripts = [file];
      } else {
        handler = sharedHandlers.build(['contentType', 'file']);
        
        if (beforeFile) {
          beforeFile.handler = handler;
          that.server.files[beforeFile.url()] = beforeFile;
        }
        
        if (afterFile) {
          afterFile.handler = handler;
          that.server.files[afterFile.url()] = afterFile;
        }
        
        that.orderedScripts = tmpFiles;
      }
      
      callback();
    });
    
  };
  
  var buildResources = function(files) {
    var handler = sharedHandlers.build(['ifModifiedSince', 'contentType', 'file']);
    that.resources = [];
    
    files.forEach(function(file) {
      if (file.isResource()) {
        file.handler = handler;
        that.resources.push(file);
        that.server.files[file.url()] = file;
      }
    });

  };
  
  var buildTests = function(files) {
    var handler = sharedHandlers.build(['contentType', 'rewriteFile', 'wrapTest', 'file']);
    
    files.forEach(function(file) {
      if (file.isTest()) {
        file.handler = handler;
        that.server.files[file.url()] = file;
      }
    });
  };
  
  that.scanFiles(function(files) {
    files = selectLanguageFiles(files);
    that.files = files;
    
    buildStylesheets(files);
    buildResources(files);
    buildTests(files);
    buildScripts(files, function() {
      if (callback) callback();
    });
    
  });
};

*/

/*
var self = this,
    l = {},
    File, Framework, sharedHandlers;

File = require('./file').File;
sharedHandlers = require('./handlers').sharedHandlers;
l.fs = require('fs');
l.path = require('path');
l.util = require('util');
l.qfs = require('./qfs');

self.Framework = function(options) {
  var key;
  
  this.path = null;
  
  this.buildVersion = null;
  this.combineScripts = false;
  this.combineStylesheets = true;
  this.minifyScripts = false;
  this.minifyStylesheets = false;
  this.defaultLanguage = 'english';
  this.buildLanguage = 'english';
  
  //bundle stuff
  this.isBundle = false;
  this.shouldPreload = true;
  
  for (key in options) {
    this[key] = options[key];
  }
  
  this.pathsToExclude = [/(^\.|\/\.|tmp\/|debug\/|test_suites\/|setup_body_class_names)/];
  if (options.pathsToExclude instanceof Array) {
    this.pathsToExclude = this.pathsToExclude.concat(options.pathsToExclude);
  } else if (options.pathsToExclude instanceof RegExp) {
    options.pathsToExclude.push(options.pathsToExclude);
  }
  
  //internal stuff
  this.resources = null; 
  this.orderedScripts = null;
  this.orderedStylesheets = null;
};

Framework = self.Framework;

Framework.prototype.nameFor = function(path) {
  return path.replace(/(^apps|bundles|frameworks|^themes|([a-z]+)\.lproj|resources)\//g, '');
};

Framework.prototype.urlFor = function(path) {
  return l.path.join(this.buildVersion, this.nameFor(path));
};

Framework.prototype.name = function() {
  if (this._name === undefined) {
    this._name = this.nameFor(this.path);
  }
  
  return this._name;
};

Framework.prototype.url = function() {
  if (this._url === undefined) {
    this._url = this.urlFor(this.name());
  }
  
  return this._url;
};

Framework.prototype.shouldExcludeFile = function(path) {
  return this.pathsToExclude.reduce(function(bool, re) {
    return bool || re.test(path);
  }, false);
};

Framework.prototype.virtualFileWithPathAndContent = function(path, content) {
  var that = this;
  
  return new File({
    path: l.path.join(that.path, path),
    framework: that,
    isVirtual: true,
    content: function(callback) {
      callback(null, content);
    }
  });
};

Framework.prototype.beforeFile = function() {
  return null;
};

Framework.prototype.afterFile = function() {  
  if (this._afterFile === undefined) {
    this._afterFile = this.virtualFileWithPathAndContent(
      'after.js',
      '; if ((typeof SC !== "undefined") && SC && SC.bundleDidLoad) SC.bundleDidLoad("' + this.name() + '");\n'
    );
  }
  
  return this._afterFile;
};

Framework.prototype.scanFiles = function(callback) {
  var Scanner = function(framework, callback) {
    var that = this;
    
    that.count = 0;
    
    that.files = [];
        
    that.callbackIfDone = function() {
      if (that.count <= 0) callback(that.files);
    };

    that.scan = function(path) {      
      that.count += 1;
      
      l.fs.stat(path, function(err, stats) {
        that.count -= 1;
        
        if (err) throw err;
        
        if (stats.isDirectory()) {
          that.count += 1;
          l.fs.readdir(path, function(err, subpaths) {
            that.count -= 1;
            
            if (err) throw err;
            
            subpaths.forEach(function(subpath) {
              if (subpath[0] !== '.') {
                that.scan(l.path.join(path, subpath));
              }
            });
            
            that.callbackIfDone();
          });
          
        } else {
          if (!framework.shouldExcludeFile(path)) {
            that.files.push(new File({ path: path, framework: framework }));
          }
        }

        that.callbackIfDone();
      });
    };
  };
  
  return new Scanner(this, callback).scan(this.path);
};

Framework.prototype.computeDependencies = function(files, callback) {
  var DependencyComputer = function(files, framework, callback) {
    var that = this;

    that.count = 0;

    that.callbackIfDone = function(callback) {
      if (that.count <= 0) callback(files);
    };

    that.compute = function() {
      files.forEach(function(file) {
        that.count += 1;
        l.qfs.readFile(file.path, function(err, data) {
          var re, match, path;
          that.count -= 1;
          if (err) throw err;
          file.deps = [];
          re = new RegExp("require\\([\"'](.*?)[\"']\\)", "g");
          while (match = re.exec(data)) {
            path = match[1];
            if (!/\.js$/.test(path)) path += '.js';
            file.deps.push(framework.urlFor(l.path.join(framework.path, path)));            
          }
          that.callbackIfDone(callback, files);
        });
      });
    };
    
  };
  
  return new DependencyComputer(files, this, callback).compute();
};

Framework.prototype.sortDependencies = function(file, orderedFiles, files, recursionHistory) {
  var that = this;
  
  if (recursionHistory === undefined) recursionHistory = [];
  
  if (recursionHistory.indexOf(file) !== -1) { // infinite loop
    return;
  } else {
    recursionHistory.push(file);
  }
  
  if (orderedFiles.indexOf(file) === -1) {
    
    if (file.deps) {
      file.deps.forEach(function(url) {
        var len = files.length,
            found = false,
            i;
        
        for (i = 0; i < len; ++i) {
          if (files[i].url() === url) {
            found = true;
            that.sortDependencies(files[i], orderedFiles, files, recursionHistory);
            break;
          }
        }
        
        if (!found) {
          l.util.puts('WARNING: ' + url + ' is required in ' + file.url() + ' but does not exists.');
        }
      });
    }
    
    orderedFiles.push(file);
  }
};

Framework.prototype.orderScripts = function(scripts, callback) {
  var that = this;
    
  that.computeDependencies(scripts, function(scripts) {    
    var orderScripts = [],
        coreJsPath = l.path.join(that.path, 'core.js'),
        coreJs, i, sortedScripts;
    
    // order script alphabetically by path
    sortedScripts = scripts.sort(function(a, b) {
      return a.path.localeCompare(b.path);
    });
    
    // strings.js first
    sortedScripts.forEach(function(script) {
      if (/strings\.js$/.test(script.path)) {
        that.sortDependencies(script, orderScripts, sortedScripts);
      }
      if (script.path === coreJsPath) {
        coreJs = script;
      }
    });

    // then core.js and its dependencies
    if (coreJs) {
      that.sortDependencies(coreJs, orderScripts, sortedScripts);
      sortedScripts.forEach(function(script) {
        if (script.deps && script.deps.indexOf(coreJs.path) !== -1) {
          that.sortDependencies(script, orderScripts, sortedScripts);
        }
      });
    }

    // then the rest
    sortedScripts.forEach(function(script) {
      that.sortDependencies(script, orderScripts, sortedScripts);
    });

    while (scripts.shift()) {}
    while (i = orderScripts.shift()) { scripts.push(i); }
    
    callback();
  });
};


Framework.prototype.build = function(callback) {
  var that = this;
  
  var selectLanguageFiles = function(files) {
    var tmpFiles = {},
        file;
    
    files.forEach(function(file1) {
      var file2 = tmpFiles[file1.url()],
          file1Language = file1.language();
      
      if (file1Language === null || 
          file1Language === that.buildLanguage || 
          file1Language === that.buildLanguage.toShortLanguage() || 
          file1Language === that.defaultLanguage ||
          file1Language === that.defaultLanguage.toShortLanguage()) {
        if (file2 === undefined) {
          tmpFiles[file1.url()] = file1;
        } else if (file1Language === that.buildLanguage) {
          tmpFiles[file1.url()] = file1;
        }
      }
    });
    
    files = [];
    for (file in tmpFiles) {
      files.push(tmpFiles[file]);
    }
    
    return files;
  };
  
  var buildStylesheets = function(files) {
    var tmpFiles = [],
        handlers = [],
        handler, file;
    
    handlers.push('ifModifiedSince', 'contentType');
    if (that.minifyScripts === true) {
      handlers.push('minify');
    }
    handlers.push(['rewriteStatic', "url('%@')"], 'join', 'file');
    
    handler = sharedHandlers.build(handlers);
    
    if (that.combineStylesheets === true) {
      files.forEach(function(file) {
        if (file.isStylesheet()) {
          tmpFiles.push(file);
        }
      });
      file = new File({
        path: that.path + '.css',
        framework: that,
        handler: handler,
        children: tmpFiles
      });
      that.server.files[file.url()] = file;
      that.orderedStylesheets = [file];
      
    } else {
      files.forEach(function(file) {
        if (file.isStylesheet()) {
          file.handler = handler;
          that.server.files[file.url()] = file;
          tmpFiles.push(file);
        }
      });
      that.orderedStylesheets = tmpFiles.sort(function(a, b) {
        return a.path.localeCompare(b.path);
      });
    }
    
  };
  
  var buildScripts = function(files, callback) {
    var tmpFiles = [],
        handlers = [],
        beforeFile = that.beforeFile(),
        afterFile = that.afterFile(),
        handler, file;
    
    that.orderedScripts = [];
    
    handlers.push('ifModifiedSince', 'contentType');
    if (that.minifyScripts === true) {
      handlers.push('minify');
    }
    handlers.push('rewriteSuper', 'rewriteStatic', 'join', 'file');
    
    handler = sharedHandlers.build(handlers);
    
    files.forEach(function(file) {
      if (file.isScript()) {
        if (that.combineScripts !== true) {
          file.handler = handler;
          that.server.files[file.url()] = file;
        }
        tmpFiles.push(file);
      }
    });
    
    that.orderScripts(tmpFiles, function() {      
      if (beforeFile) tmpFiles.unshift(beforeFile);
      if (afterFile) tmpFiles.push(afterFile);

      if (that.combineScripts === true) {
        file = new File({
          path: that.path + '.js',
          framework: that,
          handler: handler,
          children: tmpFiles
        });
        that.server.files[file.url()] = file;
        that.orderedScripts = [file];
      } else {
        handler = sharedHandlers.build(['contentType', 'file']);
        
        if (beforeFile) {
          beforeFile.handler = handler;
          that.server.files[beforeFile.url()] = beforeFile;
        }
        
        if (afterFile) {
          afterFile.handler = handler;
          that.server.files[afterFile.url()] = afterFile;
        }
        
        that.orderedScripts = tmpFiles;
      }
      
      callback();
    });
    
  };
  
  var buildResources = function(files) {
    var handler = sharedHandlers.build(['ifModifiedSince', 'contentType', 'file']);
    that.resources = [];
    
    files.forEach(function(file) {
      if (file.isResource()) {
        file.handler = handler;
        that.resources.push(file);
        that.server.files[file.url()] = file;
      }
    });

  };
  
  var buildTests = function(files) {
    var handler = sharedHandlers.build(['contentType', 'rewriteFile', 'wrapTest', 'file']);
    
    files.forEach(function(file) {
      if (file.isTest()) {
        file.handler = handler;
        that.server.files[file.url()] = file;
      }
    });
  };
  
  that.scanFiles(function(files) {
    files = selectLanguageFiles(files);
    that.files = files;
    
    buildStylesheets(files);
    buildResources(files);
    buildTests(files);
    buildScripts(files, function() {
      if (callback) callback();
    });
    
  });
};

Framework.sproutcoreBootstrap = function(options) {
  var that = this,
      bootstrap;
  
  options.path = 'frameworks/sproutcore/frameworks/bootstrap';
  bootstrap = new Framework(options);
  
  bootstrap.beforeFile = function() {  
    if (this._beforeFile === undefined) {
      this._beforeFile = this.virtualFileWithPathAndContent(
        'before.js',
        [
          'var SC = SC || { BUNDLE_INFO: {}, LAZY_INSTANTIATION: {} };',
          'var require = require || function require() {};'
        ].join('\n')
      );
    }

    return this._beforeFile;
  };
  
  bootstrap.afterFile = function() {  
    if (this._afterFile === undefined) {
      this._afterFile = this.virtualFileWithPathAndContent(
        'after.js',
        '; if (SC.setupBodyClassNames) SC.setupBodyClassNames();'
      );
    }

    return this._afterFile;
  };
  
  return bootstrap;
};

Framework.sproutcoreFrameworks = function(options) {
  var opts, key, list;
  
  if (this._sproutcoreFrameworks === undefined) {    
    
    opts = { combineScripts: true, pathsToExclude: [/fixtures\//] };
    for (key in options) {
      if (key === 'pathsToExclude') {
        if (options[key] === undefined) options[key] = [];
        if (options[key] instanceof RegExp) options[key] = [options[key]];
        opts[key] = opts[key].concat(options[key]);
      } else {
        opts[key] = options[key];
      }
    }
    
    list = ['jquery','runtime','foundation', 'datastore', 'desktop', 'animation'];
    
    this._sproutcoreFrameworks = [this.sproutcoreBootstrap(opts)].concat(list.map(function(framework) {
      opts.path = 'frameworks/sproutcore/frameworks/' + framework;
      return new Framework(opts);
    }, this));
  }
  
  return this._sproutcoreFrameworks;
};

*/
