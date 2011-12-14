var tools = require('./tools');
var FrameworkBundler = require('./framework_bundler').FrameworkBundler;
var Bundle = require('./bundle').Bundle;

// sproutcore is an extended framework
exports.Sproutcore = FrameworkBundler.extend({
  
  //version: "1.4.5", // we should support automatic sproutcore versions
  
  path: 'frameworks/sproutcore/frameworks/',
  isSC: true, // identifier for the building process, to store sproutcore in a separate file
  combineScripts: true,
  nodifyScripts: true,

  frameworkNames: "bootstrap jquery runtime foundation datastore desktop animation testing".w(),

  pathsToExclude: null,
  
  init: function(){
    arguments.callee.base.apply(this,arguments);
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
    // before we do anything, we should check whether there is a sproutcore in the projects folder
    // otherwise we should fall back to a version of sc, checked out using git in the garcon lib folder
    arguments.callee.base.apply(this,arguments);
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