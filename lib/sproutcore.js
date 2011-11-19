var tools = require('./tools');
var FrameworkBundler = require('./framework_bundler').FrameworkBundler;

// sproutcore is an extended framework
exports.Sproutcore = FrameworkBundler.extend({
  path: 'frameworks/sproutcore/frameworks/',

  frameworkNames: "bootstrap jquery runtime foundation datastore desktop animation".w(),

  pathsToExclude: null,

  init: function(){
    arguments.callee.base.apply(this,arguments);
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
  
  combineScripts: true,

  beforeFile: function(){
    var code = "";
    
    code += "var SC = SC || { BUNDLE_INFO: {}, LAZY_INSTANTIATION: {} }; \n";
    code += "var require = require || function require(){};";
    return this.virtualFileWithPathAndContent('before.js',code);
  }.property().cacheable(),
  
  afterFile: function(){
    return this.virtualFileWithPathAndContent(
      'after.js',
      '; if (SC.setupBodyClassNames) SC.setupBodyClassNames();'
    );
  }.property().cacheable()
  
});