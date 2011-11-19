/* 
  Framework bundler is a way of easily wrapping a set of frameworks as one framework
  
*/
var tools = require('./tools');
var sys = tools.util;
var Framework = require('./framework').Framework;

exports.FrameworkBundler = Framework.extend({
  frameworkNames: null,
  
  _frameworks: null,
  
  path: '',
    
  build: function(callback){
    var me = this,
        basePath = this.path,
        combineScripts = this.combineScripts,
        server = this.server,
        count, cb, numFWs, fwmapper;
        
    numFWs = this.frameworkNames.length;
    count = 0;
    cb = function(){
      sys.log('fwbundler cb: count: ' + count + " and numfws: " + numFWs);
      count += 1;
      if(count === numFWs) callback();
    };
    
    fwmapper = function(fwname){
      var path = tools.path.join(basePath,fwname);
      var fw = Framework.create({ 
        path: path, 
        server: server,
        combineScripts: combineScripts,
        pathsToExclude: [/fixtures\//]
      });
      fw.build(cb);
      return fw;
    };
    this._frameworks = this.frameworkNames.map(fwmapper);
  
  },
  
  orderedScripts: function(){
    return this._frameworks.getEach('orderedScripts').flatten();
  }.property(),
  
  orderedStylesheets: function(){
    return this._frameworks.getEach('orderedStylesheets').flatten();
  }.property()
  
});
