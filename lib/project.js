var SC = require('sc-runtime');
var config = require('./config');
var tools = require('./tools');
var jsonschema = require('jsonschema');

var project;

var projectStatechart = SC.Statechart.create({
  
  rootState: SC.State.design({
    
    initialSubstate: "READINGPROJECTCONFIG",
    
    READINGPROJECTCONFIG: SC.State.design({
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
            this.gotoState('PROJECTCONFIGERROR');
          }
          else {
            project.set('config',projconfig);
            this.gotoState('SETUPPROJECT');
          }
        }
      }
        
    }),
    
    SETUPPROJECT: SC.State.design({
      enterState: function(){
        SC.Logger.log("setupproject state...");
      }
    }),
    
    READY: SC.State.design({
      enterState: function(){
        
      }
    }),
    
    PROJECTCONFIGERROR: SC.State.design({
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
  
  isBusy: null, 
  
  init: function(){
    if(!this.get('path')) throw new Error("No path defined on project");
    project = this;
    this.statechart = projectStatechart;
    this.statechart.initStatechart();
  }
  
});