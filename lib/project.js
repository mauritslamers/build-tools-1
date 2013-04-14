var SC = require('sc-runtime');
var config = require('./config');
var tools = require('./tools');
var jsonschema = require('jsonschema');

var project;

var projectStatechart = SC.Statechart.create({
  
  rootState: SC.State.design({
    
    initialSubstate: "READING_PROJECT_CONFIG",
    
    READING_PROJECT_CONFIG: SC.State.design({
      enterState: function(){
        return SC.Async.perform('readProjectConfig');
      },
      
      readProjectConfig: function(){
        var me = this;
        var filepath = tools.path.join(project.get('path'),'project.json');
        tools.qfs.readFile(filepath, function(){ me.projectConfigHasRead.apply(me,arguments); });
        
      },
      
      projectConfigHasRead: function(err,content){
        this.resumeGotoState();
        var filepath = tools.path.join(project.get('path'),'project.json');
        if(err) project.set('error',err);
        else {
          var projconfig = JSON.parse(content);
          var validated = jsonschema.validate(projconfig,config.SCHEMAS.projectconfig);
          if(!validated || validated.length > 0){
            project.set('error',tools.ValidationError.create({ 
              message: "Validation error in project configuration " + filepath, 
              errorValue: validated
            }));
            this.gotoState('PROJECT_CONFIG_ERROR');
          }
          else {
            project.set('config',projconfig);
            this.gotoState('SETUP_PROJECT');
          }
        }
      } 
    }),
    
    SETUP_PROJECT: SC.State.design({
      
      initialSubState: 'SETUP_PROJECT_PLUGINS',
      
      SETUP_PROJECT_PLUGINS: SC.State.design({
        enterState: function(){
          var plugins = project.get('plugins');
          if(!plugins) plugins = {};
          var runmode = project.get('mode');
          
          var config = project.get('config');
          var defaultConfig = config.defaultConfig;
          var projPlugins = (config && config.plugins)? config.plugins: {}; 
          var pluginNames = Object.keys(defaultConfig);
          if(config && SC.typeOf(config.plugins) === "hash"){ // merge plugin names, and take the ones not present in defaultConfig
            pluginNames = pluginNames.concat(Object.keys(config.plugins)).uniq();
          } 

          pluginNames.forEach(function(p){
            var c = SC.mixin(defaultConfig[p],projPlugins[p]); // this works automagically :)
            var plugin = tools.loadPlugin(p);
            if(plugin && plugin.type === runmode){
              plugins[p] = plugin.create(c);
            }
          });
          
          this.gotoState('SETUP_APPS'); 
        }
        
      }),
      
      SETUP_APPS: SC.State.design({
        enterState: function(){
          
        }
      })
    }),
    
    READY: SC.State.design({
      enterState: function(){
        
      }
    }),
    
    PROJECT_CONFIG_ERROR: SC.State.design({
      enterState: function(){
        var err = project.get('error');
        SC.Logger.log("error state");
        SC.Logger.log("An error has been detected in the project configuration");
        SC.Logger.log(err);
        tools.log(tools.inspect(err.errorValue));
      }
    })
    
  })
});


module.exports = exports = SC.Object.extend({
  
  path: null,
  
  setupInFlight: false,
  
  error: null,
  
  config: null,
  
  plugins: null,
  
  mode: null,
  
  init: function(){
    if(!this.get('path')) throw new Error("No path defined on project");
    project = this;
    this.statechart = projectStatechart;
    this.statechart.initStatechart();
  }
  
});