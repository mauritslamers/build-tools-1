var tools = require('../tools');
var Handler = require('./handler').Handler;
var HandlerSet = require('./handler_set').HandlerSet;
var FileHandler = require('./file').FileHandler;
var File = require('../file').File; 
var ChanceSCSS = require('./chance_scss').ChanceSCSS;
var ChanceTheme = require('./chance_theme').ChanceTheme;
var ChanceSlices = require('./chance_slices').ChanceSlices;

var ChanceHandlerSet = HandlerSet.extend({
  init: function(){
    // first extend handler list objects
    this._handlerClasses['scss'] = ChanceSCSS;
    this._handlerClasses['theme'] = ChanceTheme;
    this._handlerClasses['slices'] = ChanceSlices;
    arguments.callee.base.apply(this,arguments);
  }
});


exports.Chance = Handler.extend({
  
  _fw: null,
  
  _file: null,

  handle: function(file,request,callback){
    this._file = file;
    this._fw = file.get('framework');
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
    // how this works: the entire chance handler is a handler set in disguise.
    //  we create a fake file with the contents we got in r.data
    // next we send it down the specific chance handler set line.
    // these handler have the option of doing both pre and postprocessing
    // by taking the _content property of the file and adjusting it in the handle function,
    // or to use the r.data in the finish function
    //tools.log('finish called in chance: ' + tools.inspect(r));

    if(!r.data){
      callback(r);
      return;
    }
    
    var fw = this._fw;
    var path = this._file.path;

    var file = File.create({
      isVirtual: true,
      path: path,
      theme: fw.get('theme'),
      framework: fw,
      _content: r.data,
      content: function(cb){
        //tools.log('sending back content from fake file: ' + file._content);
        cb(null,file._content);
      }
    });
    
    var chancehs = ChanceHandlerSet.create({
      handlerList: ['theme','slices','scss','file']
    });
    
    chancehs.handle(file,request,function(data){
      if(data & data.data) r.data = data.data;
      //r.data = data;
      //tools.log('calling callback with data from chance finish: ' + tools.inspect(data));
      callback(r);
    });
  
  }
  
  
  
});


// var regexes = {
//   UNTIL_SINGLE_QUOTE: /(?!\\)'/,
//   UNTIL_DOUBLE_QUOTE: /(?!\\)"/,
//   BEGIN_SCOPE: /\{/,
//   END_SCOPE: /\}/,
//   THEME_DIRECTIVE: /@theme\s*/,
//   SELECTOR_THEME_VARIABLE: /\$theme(?=[^\w:\-])/,
//   INCLUDE_SLICES_DIRECTIVE: /@include\s+slices\s*/,
//   INCLUDE_SLICE_DIRECTIVE: /@include\s+slice\s*/,
//   CHANCE_FILE_DIRECTIVE: /@_chance_file /,
//   NORMAL_SCAN_UNTIL: /[^{}@$]+/
// };

