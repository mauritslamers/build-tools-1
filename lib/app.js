var SC = require('sc-runtime');
var Framework = require('./framework');

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
  
  init: function(){
    var i, len;
    var fws = this.get('frameworks');
    if(fws && fws instanceof Array){
      // instantiate in place
      for(i=0,len=fws.length;i<len;i+=1){
        fws[i] = Framework.create(fws[i]);
      }
    }
  },
  
  allFiles: function(){
    var ret = [];
    var fws = this.get('frameworks');
    if(fws && fws instanceof Array){
      fws.forEach(function(fw){
        ret = ret.concat(fw.get('allFiles'));
      });
    }
    return ret;
  }.property()
  
});