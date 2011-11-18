var tools = require('./tools'),
    File = require('./file').File,
    sharedHandlers = require('./handlers').sharedHandlers,
    Framework = require('./framework').Framework,
    //FrameworkBundle = require('./framework_bundle').FrameworkBundle,
    Sproutcore = require('./sproutcore').Sproutcore;

exports.App = Framework.extend({
   // name of the app, used for url/app or app save
  name: null,

  buildVersion: new Date().getTime(), //buildVersion
  buildLanguage: 'english', // standard language
  combineStylesheets: false, // put stylesheets as one file
  combineScripts: false, // combine scripts as one file
  minifyScripts: false, // minify scripts
  minifyStylesheets: false, // minify style sheets
  htmlHead: null, // to override the standard html header of the application
  htmlBody: null, // to be added to the html body
  htmlScripts: null, // add scripts to be added to the generated html
  urlPrefix: '', // application url prefix
  theme: '', // application theme
  savePath: '', // where to save the application in save mode
  // _server: link to the server... make internal?
  server: null,
  
  init: function(){
    if(!this._frameworks) this._frameworks = [];
  },
  
  addFramework: function(fw){
    if(!fw) return;
    var optslist = "combineStylesheets combineScripts minifyScripts minifyStylesheets server buildVersion".w();
    optslist.forEach(function(opt){
      if(!fw[opt]) fw[opt] = this[opt]; // only copy if not defined
    },this);
    
    this._frameworks.push(Framework.create(fw));  
  },
  
  addFrameworks: function(){
    var args = Array.prototype.slice.call(arguments);

    if (args[0] instanceof Array) {
      args = args[0];
    }

    args.forEach(function(framework) {
      this.addFramework(framework);
    }, this);
  },
  
  addSproutcore: function(opts){
    this.addFramework(Sproutcore.create());
  },
  
  _rootHTMLHead: function(){
    var blang = this.get('buildLanguage');
    var lang = blang? blang.toShortLanguage(): '';
    var html = [];
    if(!lang) tools.util.puts('WARNING: short language code for " + blang + " is undefined.');
    lang = lang? ' lang=" + lang + "': '';
    
    html.push(
      '<!DOCTYPE html>',
      '<html' + lang + '>',
      '<head>',
        '<meta charset="utf-8">',
        '<meta http-equiv="X-UA-Compatible" content="IE=9,chrome=1">'
    );
    if (this.htmlHead !== null) html.push(this.htmlHead);
    if (this.htmlStylesheets !== null) html.push(this.htmlStylesheets);
    return html;
  }.property().cacheable(),
  
  rootContent: function(htmlStylesheets, htmlScripts){
    var me = this,
        buildLanguage = this.get('buildLanguage');
    
    return function(callback){
      var html = me.get('_rootHTMLHead'), 
          file;
          
      var addStylesheetLink = function(stylesheet){
        if(!stylesheet) return;
        html.push('<link href="' + me.get('urlPrefix') + stylesheet.get('url') + '" rel="stylesheet" type="text/css">');
      };
      var parseOrderedStylesheets = function(stylesheets){
        if(!stylesheets) return;
        stylesheets.forEach(addStylesheetLink);
      };
      
      //me_frameworks is an array, orderedStylesheets too
      if (!htmlStylesheets) {
        me._frameworks.getEach('orderedStylesheets').forEach(parseOrderedStylesheets);
      } else html.push(htmlStylesheets);
      html.push('</head>');
      
      html.push('<body class="' + me.get('theme') + ' focus">');
      if(me.get('htmlBody') !== null) html.push(me.get('htmlBody'));

      html.push('<script type="text/javascript">String.preferredLanguage = "' + me.buildLanguage + '";</script>');

      if(me.htmlScripts !== null) html.push(me.htmlScripts);

      if(!htmlScripts){
        me._frameworks.getEach('orderedScripts').forEach(function(script){
          if(!script) return;
          if(!script.get('url')){
            tools.util.log("no url for script? " + tools.util.inspect(script,false,5));
          }
          html.push('<script type="text/javascript" src="' + me.get('urlPrefix') + script.get('url') + '"></script>');
        });
      } else html.push(htmlScripts);

      html.push('</body>','</html>');
      
      callback(null,html.join('\n'));
    };
  },
  
  buildRoot: function(){
    var handler, file, symlink;

    handler = sharedHandlers.build(['cache', 'contentType', 'file']);
    file = File.create({ 
      path: this.name, 
      handler: handler, 
      content: this.rootContent(), 
      isHtml: true, 
      framework: this });
    this.server.files[file.get('url')] = file;

    handler = sharedHandlers.build(['symlink']);
    symlink = File.create({ 
      handler: handler, 
      isSymlink: true, 
      symlink: file 
    });
    this.server.files[this.name] = symlink;
  },
  
  build: function(callback){
    var count = 0,
        me = this;
    var isReadyCb = function(){
      count +=1;
      if(count === me._frameworks.length){
        callback();
      }
    };
    
    this.files = {};
    this.buildRoot();
    this._frameworks.forEach(function(fw){
      fw.build(isReadyCb);
    });
  }
  
  
  /*

  App.prototype.build = function(callback) {
    var Builder = function(app, callback) {
      var that = this;

      that.count = app.frameworks.length - 1;
      that.hasCalledCallback = false;

      that.callbackIfDone = function() {
        if (callback && that.count <= 0 && !that.hasCalledCallback){ 
          // hack to prevent having the callback called twice... Unclear why in certain circumstances that.count can be also -1
          that.hasCalledCallback = true;
          callback();
        } 
      };

      that.build = function() {
        app.files = {};

        app.buildRoot();
        l.sys.log('numFrameworks ' + app.frameworks.length);
        app.frameworks.forEach(function(framework,index,ary) {
          framework.build(function() {
            that.count -= 1;
            that.callbackIfDone();
          });
        });
      };
    };

    return new Builder(this, callback).build();
  };
  */
  
  
});
/*


var self = this,
    l = {},
    App, File, Framework, sharedHandlers;

File = require('./file').File;
Framework = require('./framework').Framework;
sharedHandlers = require('./handlers').sharedHandlers;
l.fs = require('fs');
l.path = require('path');
l.sys = require('sys');

self.App = function(options) {
  var key;
    
  this.name = null;
  this.server = null;
  this.buildVersion = new Date().getTime();
  this.buildLanguage = 'english';
  this.combineStylesheets = false;
  this.combineScripts = false;
  this.minifyScripts = false;
  this.minifyStylesheets = false;
  this.htmlHead = null;
  this.htmlStylesheets = null;
  this.htmlBody = null;
  this.htmlScripts = null;
  this.urlPrefix = '';
  this.theme = 'sc-theme';
  this.savePath = 'build';
  this.isSaving = false;
  
  for (key in options) {
    this[key] = options[key];
  }
};

App = self.App;

App.prototype.nameFor = Framework.prototype.nameFor;
App.prototype.urlFor = Framework.prototype.urlFor;

App.prototype.addFramework = function(framework) {
  if (this.frameworks === undefined) {
    this.frameworks = [];
  }
  
  if (!(framework instanceof Framework)) {
    framework = new Framework(framework);
  }
  
  framework.server = this.server;
  
  if (framework.buildVersion === null) {
    framework.buildVersion = this.buildVersion;
  }
  
  ['combineScripts', 'combineStylesheets', 'minifyScripts', 'minifyStylesheets'].forEach(function(key) {
    if (this[key] === true) {
      framework[key] = true;
    }
  }, this);
  
  this.frameworks.push(framework);
  
  return framework;
};

App.prototype.addFrameworks = function() {
  var args = Array.prototype.slice.call(arguments);
  
  if (args[0] instanceof Array) {
    args = args[0];
  }
  
  args.forEach(function(framework) {
    this.addFramework(framework);
  }, this);  
};

App.prototype.addSproutcore = function(options) {
  if (options === undefined) options = {};
  options.server = this.server;
  this.addFrameworks(Framework.sproutcoreFrameworks(options));
};

App.prototype.rootContent = function(htmlStylesheets, htmlScripts) {
  var that = this;
  
  return function(callback) {
    var html = [],
        file, lang;

    lang = that.buildLanguage.toShortLanguage();
    if (!lang) {
      l.sys.puts('WARNING: short language code for "' + that.buildLanguage + '" is undefined.');
      lang = '';
    } else {
      lang = ' lang="' + lang + '"';
    }    

    html.push(
      '<!DOCTYPE html>',
      '<html' + lang + '>',
      '<head>',
        '<meta charset="utf-8">',
        '<meta http-equiv="X-UA-Compatible" content="IE=9,chrome=1">'
    );

    if (that.htmlHead !== null) html.push(that.htmlHead);
    if (that.htmlStylesheets !== null) html.push(that.htmlStylesheets);

    if (htmlStylesheets === undefined) {
      that.frameworks.forEach(function(framework) {
        framework.orderedStylesheets.forEach(function(stylesheet) {
          if (stylesheet.framework === framework) {
            html.push('<link href="' + that.urlPrefix + stylesheet.url() + '" rel="stylesheet" type="text/css">');
          }
        });
      });
    } else {
      html.push(htmlStylesheets);
    }

    html.push(
      '</head>',
      '<body class="' + that.theme + ' focus">'
    );

    if (that.htmlBody !== null) html.push(that.htmlBody);
    
    html.push('<script type="text/javascript">String.preferredLanguage = "' + that.buildLanguage + '";</script>');
    
    if (that.htmlScripts !== null) html.push(that.htmlScripts);
    
    if (htmlScripts === undefined) {
      that.frameworks.forEach(function(framework) {
        framework.orderedScripts.forEach(function(script) {
          html.push('<script type="text/javascript" src="' + that.urlPrefix + script.url() + '"></script>');
        });
      });
    } else {
      html.push(htmlScripts);
    }

    html.push(
    	  '</body>',
      '</html>'
    );

    html = html.join('\n');

    callback(null, html);
  };
};

App.prototype.buildRoot = function() {
  var handler, file, symlink;
  
  handler = sharedHandlers.build(['cache', 'contentType', 'file']);
  file = new File({ path: this.name, handler: handler, content: this.rootContent(), isHtml: true, framework: this });
  this.server.files[file.url()] = file;
  
  handler = sharedHandlers.build(['symlink']);
  symlink = new File({ handler: handler, isSymlink: true, symlink: file });
  this.server.files[this.name] = symlink;
};

App.prototype.build = function(callback) {
  var Builder = function(app, callback) {
    var that = this;
    
    that.count = app.frameworks.length - 1;
    that.hasCalledCallback = false;
    
    that.callbackIfDone = function() {
      if (callback && that.count <= 0 && !that.hasCalledCallback){ 
        // hack to prevent having the callback called twice... Unclear why in certain circumstances that.count can be also -1
        that.hasCalledCallback = true;
        callback();
      } 
    };
    
    that.build = function() {
      app.files = {};

      app.buildRoot();
      l.sys.log('numFrameworks ' + app.frameworks.length);
      app.frameworks.forEach(function(framework,index,ary) {
        framework.build(function() {
          that.count -= 1;
          that.callbackIfDone();
        });
      });
    };
  };
  
  return new Builder(this, callback).build();
};
*/
/*
App.prototype.save = function() {
  var that = this,
      stylesheets = [],
      scripts = [],
      stylesheet, script, html, savr;
  
  var Saver = function(app, file) {
    var that = this;
    
    that.save = function() {
      file.handler.handle(file, null, function(r) {
        var path;
        
        if (r.data.length > 0) {
          path = l.path.join(app.savePath, file.savePath());

          File.createDirectory(l.path.dirname(path));
          l.fs.writeFile(path, r.data, function(err) {
            if (err) throw err;
          });
        }
      });
    };
  };
  
  that.urlPrefix = '../';
  sharedHandlers.urlPrefix = that.urlPrefix;
  
  that.frameworks.forEach(function(framework) {
    var file, url;
    
    for (url in that.server.files) {
      file = that.server.files[url];
      if (file.framework === framework) {
        if (file.isStylesheet()) stylesheets.push(file);
        if (file.isScript()) scripts.push(file);
        if (file.isResource()) new Saver(that, file).save();
      }
      if (file.isSymlink) html = file.symlink;
      //if (file.isHtml) html = file;
    }
  });
  
  stylesheet = new File({
    path: that.name + '.css',
    framework: that,
    handler: sharedHandlers.build(['join']),
    children: stylesheets
  });
  
  savr = new Saver(that, stylesheet);
  savr.save();
  
  script = new File({
    path: that.name + '.js',
    framework: that,
    handler: sharedHandlers.build(['join']),
    children: scripts
  });
  
  savr = new Saver(that, script);
  savr.save();
  
  html.content = this.rootContent(
    '<link href="' + that.urlPrefix + stylesheet.url() + '" rel="stylesheet" type="text/css">',
    '<script type="text/javascript" src="' + that.urlPrefix + script.url() + '"></script>'
  );
  
  savr = new Saver(that, html);
  savr.save();
};
*/

/*
App.prototype.save = function(){
  var that = this,
      html,
      frameworks = that.frameworks,
      server = that.server,
      bundles = {}, mainBundle,
      stylesheet, script,
      bundleInfo,
      url, file, targetBundle, fw_i, cur_fw, bundlesForInfo;
  
  var makeBundle = function(name, bundleDeps, shouldPreload){ 
    return { 
      name: name, bundleDeps: bundleDeps, shouldPreload: shouldPreload, 
      stylesheets: [], scripts: [], resources: [] 
    }; 
  };

  var addToBundle = function(bundle,scripts,stylesheets,resources){
    if(scripts) bundle.scripts = bundle.scripts.concat(scripts);
    if(stylesheets) bundle.stylesheets = bundle.stylesheets.concat(stylesheets);
    if(resources) bundle.resources = bundle.resources.concat(resources);
    return bundle;
  };
  
  mainBundle = makeBundle();
  //that.urlPrefix = '../'; originally the buildversion would be in front of the path... 
  // but that is not working in node 0.4, so commenting out this urlPrefix
  //sharedHandlers.urlPrefix = that.urlPrefix; 
  sharedHandlers.urlPrefix = this.isSaving? "":  "/";
  //gather files in bundles, separate the bundles which should not preload  
  for(fw_i=0;fw_i<frameworks.length;fw_i+=1){
    cur_fw = frameworks[fw_i];
    if(!bundles[cur_fw.name()] && cur_fw.isBundle){
      bundles[cur_fw.name()] = makeBundle(cur_fw.name(),cur_fw.bundleDeps,cur_fw.shouldPreload);
    } 
    if(cur_fw.isBundle){
      bundles[cur_fw.name()] = addToBundle(bundles[cur_fw.name()], cur_fw.orderedScripts, cur_fw.orderedStylesheets, cur_fw.resources);
      if(cur_fw.shouldPreload) { // if preload, mix in with mainBundle
        mainBundle = addToBundle(mainBundle,cur_fw.orderedScripts, cur_fw.orderedStylesheets, cur_fw.resources);
      }
    }
    else { // normal framework
      mainBundle = addToBundle(mainBundle,cur_fw.orderedScripts, cur_fw.orderedStylesheets, cur_fw.resources);
    }
  }
  
  html = this.server.files[this.name].symlink;
  
  // now parse bundles and save 'em
  this._saveBundles(bundles);
  
  // mainBundle save:
  stylesheet = new File({ path: that.name + '.css', framework: that,  handler: sharedHandlers.build(['join']), children: mainBundle.stylesheets });
  this._makeSaver(that,stylesheet)();
  
  mainBundle.scripts.unshift(this._createBundleInfo(bundles)); // add the bundle info up front
  
  script = new File({ path: that.name + '.js', framework: that, handler: sharedHandlers.build(['join']), children: mainBundle.scripts  });
  this._makeSaver(that,script)();
  
  // save resources
  if(mainBundle.resources) mainBundle.resources.forEach(function(resource){ that._makeSaver(that,resource)(); });
  
  if(!html) throw new Error("No app HTML file found, this means trouble!");
  html.content = this.rootContent(
    '<link href="' + that.urlPrefix + stylesheet.url() + '" rel="stylesheet" type="text/css">',
    '<script type="text/javascript" src="' + that.urlPrefix + script.url() + '"></script>'
  );
  this._makeSaver(that,html)();
  
};

App.prototype.wrapper = function(ary,wrapper){
  var i,len,ret = [];
  
  for(i=0,len=ary.length;i<len;i+=1){
    ret.push(wrapper + ary[i] + wrapper);
  }
  return ret;
};

App.prototype._createBundleInfo = function(bundles){ // create file with bundle info 
  var path, file, bundleInfo = [], curBundle, tmp,  i,
  content = 'var SC = SC || { BUNDLE_INFO: { ';
  
  for(path in bundles){
    curBundle = bundles[path];
    tmp = path + ': { loaded: false';
    if(curBundle.bundleDeps){
      tmp += ', requires: [';
      tmp += this.wrapper(curBundle.bundleDeps,"'").join(',') + '] ';
    }
    // Note: garcon doesn't yet support non combined builds, as soon as these are implemented, the following has to be adapted too!
    
    // add styles property to BUNDLEINFO, array with urls, in this case one with the combined sheets
    if(curBundle.stylesheets.length > 1){
      tmp += ", styles: ['" + path + ".css']";  
    }
    // add scripts property to BUNDLEINFO, array with urls, in this case one with the combined scripts
    if(curBundle.scripts.length > 0){
      tmp += ", scripts: ['" + path + ".js']";  
    }
    tmp += '}';
    bundleInfo.push(tmp);
  }
  content += bundleInfo.join(", ") + "} , LAZY_INSTANTIATION: {} };";
  file = new File({ 
    path: this.name + '_bundleInfo.js', 
    framework: this, 
    content: function(callback){ callback(null, content);}, 
    handler: sharedHandlers.build(['file']),
    isVirtual: true });
  return file;
  
};

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
};

App.prototype._makeSaver = function(app, file) {
  return function() {
    file.handler.handle(file, null, function(r) {
      var path;
      
      if (r.data.length > 0) {
        path = l.path.join(app.savePath, file.savePath());

        File.createDirectory(l.path.dirname(path));
        l.fs.writeFile(path, r.data, function(err) {
          if (err) throw err;
        });
      }
    });
  };
};

*/


