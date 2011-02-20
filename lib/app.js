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
    
    that.callbackIfDone = function() {
      if (callback && that.count <= 0) callback();
    };
    
    that.build = function() {
      app.files = {};

      app.buildRoot();
      l.sys.log('numFrameworks ' + app.frameworks.length);
      app.frameworks.forEach(function(framework,index,ary) {
        //l.sys.log('current index: ' + index);
        //l.sys.log('current framework ' + l.sys.inspect(framework));
        framework.build(function() {
          that.count -= 1;
          //l.sys.log('counting down ' + that.count);
          that.callbackIfDone();
        });
      });
      //l.sys.log('checking order...');
    };
  };
  
  return new Builder(this, callback).build();
};

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

App.prototype.saveTwo = function(){
  var that = this,
      html,
      frameworks = that.frameworks,
      server = that.server,
      bundles = {}, mainBundle,
      stylesheet, script,
      bundleInfo,
      url, file, targetBundle, fw_i, cur_fw;
  
  var makeBundle = function(){ return { stylesheets: [], scripts: [], resources: [] }; };

  mainBundle = makeBundle();
  //that.urlPrefix = '../'; // don't get why this is in here
  //sharedHandlers.urlPrefix = that.urlPrefix; 
  //gather files in bundles
  
  for(fw_i=0;fw_i<frameworks.length;fw_i+=1){
    cur_fw = frameworks[fw_i];
    if(!bundles[cur_fw.name()] && cur_fw.isBundle) bundles[cur_fw.name()] = makeBundle();
    targetBundle = cur_fw.isBundle? bundles[cur_fw.name()]: mainBundle;
    targetBundle.scripts = targetBundle.scripts.concat(cur_fw.orderedScripts);
    targetBundle.stylesheets = targetBundle.stylesheets.concat(cur_fw.orderedStylesheets);
    l.sys.puts('resources for current framework: ' + l.sys.inspect(cur_fw.resources));
    if(cur_fw.resources) targetBundle.resources = targetBundle.resources.concat(cur_fw.resources);
  }
  
  html = this.server.files[this.name].symlink;
  
  // now parse bundles and save 'em
  this._saveBundles(bundles);
  
  //l.sys.puts('path is ' + that.name);
  // mainBundle save:
  stylesheet = new File({ path: that.name + '.css', framework: that,  handler: sharedHandlers.build(['join']), children: mainBundle.stylesheets });
  this._makeSaver(that,stylesheet)();
  
  mainBundle.scripts.unshift(this._createBundleInfo(bundles));
  
  script = new File({ path: that.name + '.js', framework: that, handler: sharedHandlers.build(['join']), children: mainBundle.scripts  });
  this._makeSaver(that,script)();
  
  // save resources
  if(mainBundle.resources) mainBundle.resources.forEach(function(resource){ that._makeSaver(that,resource)(); });
  
  if(!html) throw new Error("No app HTML file found, this means trouble!");
  //l.sys.puts('contents of html: ' + l.sys.inspect(html));
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
  var path, file, bundleInfo = [], curBundle, tmp,  i, fw,
  content = 'var SC = SC || { BUNDLE_INFO: { ';
  
  for(path in bundles){
    curBundle = bundles[path];
    fw = curBundle.scripts[0].framework;
    tmp = path + ': { loaded: false';
    if(fw.bundleDeps){
      tmp += ', requires: [';
      tmp += this.wrapper(fw.bundleDeps,"'").join(',') + '] ';
    }
    //l.sys.log('curBundle: ' + l.sys.inspect(curBundle));
    // add styles property to BUNDLEINFO, array with urls, in this case one with 
    if(curBundle.stylesheets.length > 1){
      tmp += ", styles: ['" + path + ".css']";  
    }
    // add scripts property to BUNDLEINFO, array with urls
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
  
  /*
  return new File({
    path: l.path.join(that.path, path),
    framework: that,
    isVirtual: true,
    content: function(callback) {
      callback(null, content);
    }
  });
  */
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
    styleSheet = makeFile((path + '.css'),bundles[path].stylesheets);
    script = makeFile((path + '.js'),bundles[path].scripts);
    this._makeSaver(me,styleSheet)();
    this._makeSaver(me,script)();
    resources = bundles[path].resources;
    l.sys.puts('resources in bundle ' + path + ": " + l.sys.inspect(bundles[path].resources));
    if(resources && (resources.length > 0)) resources.forEach(function(resource){ me._makeSaver(me,resource)(); });
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


