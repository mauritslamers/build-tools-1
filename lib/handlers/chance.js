var tools = require('../tools');
var Handler = require('./handler').Handler;
var ChanceSCSS = require('./chance_scss').ChanceSCSS;

exports.Chance = Handler.extend({

  _file: null,
  _request: null,
  handlers: null,
  
  init: function(){
    arguments.callee.base.apply(this,arguments);
    this.handlers = [
      ChanceSCSS.create({ urlPrefix: this.urlPrefix }) // add params later if needed
    ];
  },
  
  handle: function(file,request,callback){
    // set up the internal handler set
    this._file = file;
    this._request = request;
    callback(false);
  },
  
  finish: function(request,r,callback){
    //r.data is where stuff needs to be
    var me = this;
    // orginal three steps: 
    // 1: preprocess CSS, determining order and parsing the slices out
    // 2: preparing input css
    // 3: apply sass/stylus engine
    
    // we are trying to do it the other way around. We want to do chance per framework
    // chance is only done if the css is actually combined, otherwise it is way
    // as we are getting all the css anyway, 
    //tools.log('finish called in chance: ' + tools.inspect(r));
    if(!r.data){
      callback(r);
    }
    else {
      // call the handlers finish only
      var count = this.handlers.length - 1;

      var wrapup = function(ret){
        // now walk backwards 
        count -= 1;
        tools.util.log('wrapping up ' + count + " handlers...");
        if(count >= 0) {
          //tools.util.log('wrapping up handler: ' + me.handlerList[count]);
          me.handlers[count].finish(request,ret,wrapup);
        } 
        else {
          //tools.util.log(' about to send back the content: ' + ret.data);
          callback(ret);
        } 
      };
      
      me.handlers[count].finish(request,r,wrapup);
      
    }
    
  }
  
  
  
});

var regexes = {
  UNTIL_SINGLE_QUOTE: /(?!\\)'/,
  UNTIL_DOUBLE_QUOTE: /(?!\\)"/,
  BEGIN_SCOPE: /\{/,
  END_SCOPE: /\}/,
  THEME_DIRECTIVE: /@theme\s*/,
  SELECTOR_THEME_VARIABLE: /\$theme(?=[^\w:\-])/,
  INCLUDE_SLICES_DIRECTIVE: /@include\s+slices\s*/,
  INCLUDE_SLICE_DIRECTIVE: /@include\s+slice\s*/,
  CHANCE_FILE_DIRECTIVE: /@_chance_file /,
  NORMAL_SCAN_UNTIL: /[^{}@$]+/
};