var SC = require('sc-runtime');
var Framework = require('./framework');
var Bundle = require('./bundle');
var tools = require('./tools');

/*
An SC application is essentially Sproutcore + frameworks + bundles + the app itself
Creating an app will register its frameworks, bundles and add the application itself

An application also hosts the plugins 
*/

var App = SC.Object.extend({
  
  name: null, // name of the application
  
  path: null, // path of the app inside the project
  
  frameworks: null, // frameworks needed for this application, will be instantiated in place
  
  bundles: null, // bundles belonging to this application, will be instantiated in place
  
  includeSC: true, // whether this app uses Sproutcore
  
  init: function(){
    var i, len;
    var fws = this.get('frameworks');
    var bdls = this.get('bundles');
    var customSCFound = false;
    if(fws && fws instanceof Array){
      // instantiate in place
      for(i=0,len=fws.length;i<len;i+=1){
        fws[i] = Framework.create(fws[i]);
        // add an observer to the fw to update us when allFiles did change
        fws[i].addObserver('allFiles',this,this._allFilesDidChange);
        fws[i].belongsTo = this; // allow frameworks access, for example to register extra dependencies
        if(fws[i].get('name') === "sproutcore") customSCFound = true;
      }
    }
    if(bdls && bdls instanceof Array){
      for(i=0,len=bdls.length;i<len;i+=1){
        bdls[i] = Bundle.create(bdls[i]);
      }
    }
    if(this.get('includeSC') && !customSCFound) this.addSproutcore(); 
  },
  
  _allFilesDidChange: function(){
    if(!this._allFilesHasChanged){
      this.set('allFilesHasChanged',true);
    }
  },
  
  allFilesHasChanged: false,
  
  allFiles: function(){
    var ret = [];
    var fws = this.get('frameworks');
    if(fws && fws instanceof Array){
      fws.forEach(function(fw){
        ret = ret.concat(fw.get('allFiles'));
      });
    }    
    this._allFilesHasChanged = false; 
    return ret;
  }.property('allFilesHasChanged').cacheable(),
  
  addSproutcore: function(){
    // essentially adding sproutcore is just adding another framework, but with one exception:
    // if the user has sproutcore inside the frameworks folder in the project folder, it should automatically
    // override the pre-installed version (whether this behavior should stay this way, is for now not relevant)
    //tools.log('addSproutcore: PWD: ' + process.env.PWD);
    var pwd = process.env.PWD;
    tools.fs.existsSync
  },
  
  // interesting idea... could the frameworks and app be bound through bindings?
  // that would make things easier to cache... (now done through an observer, is perhaps easier and lighter than a binding)

  // also, a framework should be able to update/alter the loading procedure / app configuration in an app, 
  // in order to insert extra frameworks if necessary.
  // The configuration should be in the root of the framework, and be called [frameworkname].json
  registerFramework: function(fwconfig){
    
  }
  
});

module.exports = exports = App;