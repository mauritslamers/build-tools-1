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
  
  frameworks: null, // frameworks needed for this application
  
  bundles: null, // bundles belonging to this application
  
  init: function(){
    
  }
  
});