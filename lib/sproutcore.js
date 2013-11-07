var tools = require('./tools');
var SC = require('sc-runtime');
var FrameworkBundler = require('./framework_bundler').FrameworkBundler;
var Bundle = require('./bundle').Bundle;
var exec  = require('child_process').exec; // needed for SC installation

// sproutcore is an extended framework
exports.Sproutcore = FrameworkBundler.extend({
  
  //version: "1.4.5", // we should support automatic sproutcore versions
  name: 'sproutcore',
  path: 'frameworks/sproutcore/',
  isSC: true, // identifier for the building process, to store sproutcore in a separate file
  combineScripts: true,
  nodifyScripts: true,
  watchForChanges: false,  
  //frameworkNames: "bootstrap jquery runtime foundation datastore desktop animation testing".w(),
  frameworkNames: null,
  defaultVersion: "1.9.1",
  pathsToExclude: null,
  
  defaultFrameworkNames: [
    'frameworks/bootstrap',
    'frameworks/jquery',
    'frameworks/runtime',
    'frameworks/core_foundation',
    'frameworks/template_view',
    'frameworks/datetime',
    'frameworks/foundation',
    'frameworks/routing',
    'frameworks/statechart',
    'frameworks/datastore',
    'frameworks/ajax',
    'frameworks/desktop'
  ],
  
  internalSproutcoreDirectory: function(){
    var version = this.get('version') || this.get('defaultVersion');
    return tools.path.join(tools.lib_dir,"sproutcore",version);
  }.property('version').cacheable(),
  
  installSproutcore: function(callback){
    var SCdir = this.get('internalSproutcoreDirectory');
    var cmd, version = this.get('version') || this.get('defaultVersion');
    
    // if(version === "master"){
    //   url = "https://github.com/sproutcore/sproutcore/archive/master.zip"
    // }
    // else {
    //   url = "https://github.com/sproutcore/sproutcore/archive/REL-" + version + ".zip";
    // }
    cmd = "git clone git://github.com/sproutcore/sproutcore " + SCdir;
    if(version !== "master") cmd += " -b REL-" + version;
    tools.log("Installing Sproutcore version " + version);
    exec(cmd, function(err, stdout,stderr){
      if(err){
        tools.log("Installing Sproutcore version " + version + " failed");
        tools.log(err);
        tools.log(stdout);
        tools.log(stderr);
        callback(err);
      }
      else {
        callback(null);
      }
    });
    
    // cmd = "wget --no-check-certificate " + url + "-O "
    // exec('wget --no-check-certificate ', function(err, stdout, stderr) {
    // })
    // //wget --no-check-certificate https://github.com/pinard/Pymacs/tarball/v0.24-beta2 -O - | tar xz
    
  },
  
  init: function(){
    arguments.callee.base.apply(this,arguments);
    // depending on version we make a different selection of frameworks
    var v = this.version? this.version.split("."): this.get('defaultVersion').split(".");
    var isOldSC = parseInt(v[1],10) <= 4; // under 1.5.0
    if(!this.combineScripts){
      tools.log('WARNING: Sproutcore has combineScripts set to false. Be aware of side effects, the Test Application will not be able to run.');
    }
    if(!this.frameworkNames){
      if(isOldSC){ 
        this.frameworkNames = "bootstrap jquery runtime foundation datastore desktop animation testing".split(" ")
                              .map(function(fn){ return "frameworks/" + fn; });
      }
      else this.frameworkNames = this.defaultFrameworkNames;
    }
    
    if(this.theme === 'sc-theme' || this.theme === 'ace' || this.theme === 'iphone'){
      if(this.theme === "sc-theme"){
        if(isOldSC) this.frameworkNames.push("themes/empty_theme","themes/standard_theme");
        else this.frameworkNames.push("themes/empty_theme","themes/legacy_theme");
      } 
      if(this.theme === 'ace'){
        this.frameworkNames.push("themes/empty_theme","themes/ace");
      }
      if(this.theme === 'iphone'){
        this.frameworkNames.push('themes/empty_theme','themes/iphone_theme');
      }
      if(parseInt(v[1],10) >= 5){ // above 1.5.0)
        this.frameworkNames.push('frameworks/yuireset');
      }
    }
    
    //tools.log('garconlibdir: ' + tools.lib_dir);
    if(!this.pathsToExclude){
      this.pathsToExclude = [/fixtures\//];
    }
    else {
      if(SC.typeOf(this.pathsToExclude) === 'array'){
        this.pathsToExclude.push(new RegExp(/fixtures\//));
      }
      else if(SC.typeOf(this.pathsToExclude) === 'regexp'){
        this.pathsToExclude = [this.pathsToExclude];
      }
    }
  },

  beforeFile: function(){
    var code = "";
    
    code += "var SC = SC || { BUNDLE_INFO: {}, LAZY_INSTANTIATION: {} }; \n";
    code += "var require = require || function require(){};";
    return this.createVirtualFile('before.js',code,this);
  }.property().cacheable(),
  
  afterFile: function(){
    return this.createVirtualFile('after.js',
      '; if (SC.setupBodyClassNames) SC.setupBodyClassNames();',this);
  }.property().cacheable(),
  
  build: function(callback){
    var super_build = arguments.callee.base;
    var args = arguments;
    var me = this;
    var version = this.get('version') || this.get('defaultVersion');
    var internalSCDir = this.get('internalSproutcoreDirectory');
    var internalIsUsed = false;
    
    var continueBuild = function(){
      super_build.apply(me,args);
      if(internalIsUsed){
        // replace nameFor for all framework instances
        me._frameworks.forEach(function(fw){
          fw.nameFor = function(path){
            path = path.replace(internalSCDir,"sproutcore");
            return path.replace(/(^apps|bundles|frameworks|^themes|([a-z]+)\.lproj|resources)\//g, '');
          };
        });
      }
      me._buildTests();
    };
    
    // before we do anything, we should check whether there is a sproutcore in the projects folder
    tools.fs.exists(this.path,function(sc_in_proj_exists){
      if(sc_in_proj_exists) continueBuild();
      else { // doesn't exist in project, so check for configured version in lib/sproutcore
        internalIsUsed = true;
        tools.fs.exists(internalSCDir, function(sc_internal_exists){
          if(sc_internal_exists){
            me.path = internalSCDir;
            continueBuild();
          }
          else {
            tools.log('Desired Sproutcore version (' + version + ') not found, installing...');
            tools.log('Please wait with running your app until this installation is finished');
            me.installSproutcore(function(err){
              if(err){
                throw err;
              }
              else {
                tools.log('Installation of Sproutcore finished, your app will be available in a few moments');
                me.path = internalSCDir;
                continueBuild();
              }
            });
          }
        });
      }
    });
    
    // otherwise we should fall back to a version of sc, checked out using git in the garcon lib folder
    
    // 
    // arguments.callee.base.apply(this,arguments);
    // this._buildTests();
  },
  
  _buildTests: function(){
    this._frameworks.forEach(function(fw){
      
    });
  },
  
  tests: function(req,res){
    if(this.frameworkNames.indexOf('testing') === -1){
      res.writeHead(200);
      res.write("<html><body>You need to add the testing framework in order to run tests</body></html>");
      res.end();
      return;
    }
    var tests = this.get('_tests');
    var scripts = this.get('orderedScripts');
    var html = ["<html><body>"];
    scripts.forEach(function(s){
      html.push('<script type="text/javascript" src="/' + s.get('url') + '"></script>');
    },this);
    tests.forEach(function(t){
      html.push('<script type="text/javascript" src="/' + t.get('url') + '"></script>');
    });
    html.push("</body></html>");
    res.writeHead(200);
    res.write(html.join("\n"));
    res.end();
  },
  
  nodeBefore: function(){
    tools.log("calling nodeBefore in sproutcore...");
    var c = [];
    c.push("var sys = require('util');");
    // set up so we don't need to change window everywhere by defining a reference to global
    c.push('var window = require("jsdom").jsdom().createWindow();');
    c.push("global.window = window;global.document = window.document;global.top = window;");
    c.push('global.navigator = { userAgent: "node-js", language: "en" };');
    c.push("global.YES = true;global.NO = false;");
    c.push("if (typeof console === 'undefined') { global.console = {} ; console.log = console.info = console.warn = console.error = sys.log;}");
    c.push("global.SC = {}; global.SproutCore = SC; global.SC.isNode = true;");
    c.push("global.jQuery = require('jquery');");
    c.push("global.sc_require = function do_nothing(){};");
    c.push("global.sc_resource = function sc_resource(){};");
    // use a node.js xmlhttprequest plugin
    c.push('global.XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;');
    // hack to get the node xmlhttprequest to work
    // msie cannot be true otherwise ready.js wont work properly and
    // node processes that use sproutnode won't exit
    c.push('SC.browser = { msie: false, opera: true };');
    return c.join("\n");
  }.property(),

  // for SC we need a separate save function, as jQuery should not be used 
  // in a nodified SC
  save: function(){ 
    var files = this.get('resources') || [];
    var me = this;
    var count = 0;
    var numfiles = this.nodifyScripts? 3: 2; // hardcoding is the only option for now
    
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
      if(this.nodifyScripts){
        this.nodeModuleFile(f);
        // if nodifying, don't add jQuery...
        // this is problematic in the sense that you cannot use nodifyScripts when also building 
        // an app!
        this.scriptsFile(f,['jquery']); 
      } 
      else this.scriptsFile(f);
      this.stylesheetsFile(f);
    }
    else {
      if(this.nodifyScripts) files.push(this.nodeModuleFile()); 
      files = files.concat(this.get('orderedScripts'), this.get('orderedStylesheets'));
    }
    files.forEach(this._save,this);
  }
  
});