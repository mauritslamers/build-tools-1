var SC = require('sc-runtime');
var tools = require('./lib/tools');
var baseConfig = require('./lib/config');
var File = require('./lib/file');
var Framework = require('./lib/Framework');

var buildTools = SC.Object.create({
  readConfig: function(path){
    //tools.log("trying to read: " + path);
    try { 
      // on purpose not using require() here, 
      // because we want to be able to detect syntax issues
      var proj = tools.fs.readFileSync(path);
      var projconfig = JSON.parse(proj);
    }
    catch(e){
      if(e instanceof SyntaxError){
        tools.puts("An syntax error was detected in your project config file.");
        return false;
      }
      else if(e.code === "ENOENT"){
        tools.puts("Unable to locate a project.json file in the current folder."); //tools.inspect(e));
        return false;
      }
    }
    return projconfig;
  },

  // a few things need to be setup:
  // in both save and server mode:
  // - plugins
  // - apps
  // in case we are server also:
  // - proxy
  devserver: null, // place to hook up the server plugin
  
  plugins: null, // place to hook up the active plugin objects
  
  setup: function(projectConfig,runtype){
    // so, first plugins
    // we first init plugins from the projectConfig
    // then we see whether they replace default ones
    var plugins = [];
    var defPlugins = baseConfig.defaultPlugins;
    if(projectConfig.plugins && projectConfig.plugins instanceof Array){
      projectConfig.plugins.forEach(function(pname){
        var p, plugin, 
            customSettings = projectConfig.pluginSettings? projectConfig.pluginSettings[pname]: null;
        try {
          p = require(pname);
          plugin = customSettings? p.create(customSettings): p.create();
          if(customSettings){
            plugin = p.create(customSettings);
          }
        }
        catch(e){
          SC.Logger.log("You tried to load a plugin named '%@' but it could not be found".fmt(pname));
        }
        plugins.push(plugin);
      });
    }
    // now adding default plugins
    // first server plugin, but only when we should run as server
    if(runtype === "server"){
      if(plugins.length > 0){
        var hasCustomServer = plugins.findProperty('type','server');
        if(hasCustomServer) this.set('devserver',hasCustomServer);
        else {
          this.set('devserver',require(defPlugins.devserver));
        } 
      }
    }
    else if(runtype === "save"){
      // also load default save plugins
      defPlugins.save.forEach(function(sp){
        var customSettings = projectConfig.pluginSettings? projectConfig.pluginSettings[sp]: null;
        var p = require(sp);
        var plugin = customSettings? p.create(customSettings): p.create();
        plugins.push(plugin);
      });
    }
    // now load default other plugins
    defPlugins.file.concat(defPlugins.framework,defPlugins.app).forEach(function(dp){
      var customSettings = projectConfig.pluginSettings? projectConfig.pluginSettings[dp]: null;
      var p = require(dp);
      var plugin = customSettings? p.create(customSettings): p.create();
      plugins.push(plugin);      
    });
    
    this.set('plugins',plugins);
  }

});


//what should happen on load:
// the app can be started from sproutcore-server or sproutcore-build
// then the project.json file needs to be read, and parsed
// 

exports = module.exports = buildTools;


