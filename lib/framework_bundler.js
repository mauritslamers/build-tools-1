/* 
  Framework bundler is a way of easily wrapping a set of frameworks as one framework
  
*/
var tools = require('./tools');
var Framework = require('./framework').Framework;

exports.FrameworkBundler = Framework.extend({
  frameworkNames: null,
  
  _frameworks: null,
  
  path: '',
  
  targets: function(){
    var me = this;
    var ret = this._frameworks.map(function(fw){
      var r = fw.get('targets');
      r.parent = "/" + me.name;
      return r;
    });
    return ret;
  }.property().cacheable(),
    
  build: function(callback){
    var me = this,
        basePath = this.path,
        server = this.server,
        count, cb, numFWs, fwmapper;
        
    cb = function(){
      //tools.log('fwbundler cb: count: ' + count + " and numfws: " + numFWs);
      count += 1;
      if(count === numFWs) callback();
    };
    
    fwmapper = function(fwname){
      var path = tools.path.join(basePath,fwname);
      var fw = Framework.create({ 
        path: path, 
        server: server,
        belongsTo: me.belongsTo,
        watchForChanges: me.watchForChanges,
        minifyScripts: me.minifyScripts,
        combineOnSave: me.combineOnSave,
        combineScripts: me.combineScripts,
        minifyOnSave: me.minifyOnSave,
        stylesheetProcessor: me.stylesheetProcessor,
        pathsToExclude: [/fixtures\//]
      });
      fw.build(cb);
      return fw;
    };
    
    numFWs = this.frameworkNames.length;
    count = 0;
    this._frameworks = this.frameworkNames.map(fwmapper);  
  },

  // exclude is an array with framework names which should not be used
  // for the scripts file
  scriptsFile: function(cb,exclude){
    var me = this;
    var filename = this.get('name') + ".js";
    var oScripts, fws = [];
    
    if(exclude){
      this._frameworks.forEach(function(fw,index){
        //only use fw when not in exclude, we can do this because the indexes 
        //of this._frameworks and this.frameworkNames are the same
        if(!exclude.contains(this.frameworkNames[index])) fws.push(fw); 
        else tools.log('including ' + fw.get('path') + 'in scriptsFile');
      },this);
      oScripts = fws.getEach('orderedScripts').flatten();
    }
    else oScripts = this.get('orderedScripts');
     
    this._combineOrderedFiles(oScripts, function(script){
      cb(me._makeFile(filename,script));
    });
  },
  
  orderedScripts: function(){
    return this._frameworks.getEach('orderedScripts').flatten();
  }.property(),
  
  orderedStylesheets: function(){
    return this._frameworks.getEach('orderedStylesheets').flatten();
  }.property(),
  
  _tests: function(){
    return this._frameworks.getEach('_tests').flatten();
  }.property()
  
});
