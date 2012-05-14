var Handler = require('./handler').Handler;
var tools = require('../tools');
var Scanner = require('strscan').StringScanner;
var UNTIL_SINGLE_QUOTE = /(?!\\)'/,
  UNTIL_DOUBLE_QUOTE= /(?!\\)"/,
  INSIDE_PARENTHESES= /\((.+?)\)\s*/,
  BEGIN_SCOPE= /\{/,
  END_SCOPE= /\}/,
  THEME_DIRECTIVE= /@theme\s*/,
  SELECTOR_THEME_VARIABLE= /\$theme(?=[^\w:\-])/,
  INCLUDE_SLICES_DIRECTIVE= /@include\s+slices\s*/,
  INCLUDE_SLICE_DIRECTIVE= /@include\s+slice\s*/,
  CHANCE_FILE_DIRECTIVE= /@_chance_file /,
  NORMAL_SCAN_UNTIL= /[^{}@$]+/;


exports.ChanceTheme = Handler.extend({

  file: null,
  
  handle: function(file,request,callback){
    this.file = file;
    callback(false); // we wait on the actual data
  },
  
  finish: function(request,r,callback){
    // get the data from r, parse using stylus, then return
    //tools.log('data in chancescss: ' + tools.inspect(r));
    tools.log('chance theme on file ' + this.file.get('url'));
    
    var css = r.data;
    // now search for and replace theme stuff
    var scanner = new Scanner(css);
    var theme = this.file.get('framework').get('theme');
    tools.log('frameworks says theme is: ' + theme );
    
    var ret = "";
    
    var e = function(){
      while (true) {
        if (scanner.check(/\s+/)) {
          ret += scanner.scan(/\s+/);
          continue;
        }
        if (scanner.check(/\/\//)) { //line comment
          scanner.scanUntil(/\n/);
          continue;
        }
        if (scanner.check(/\/\*/)) { // block comment
          scanner.scanChar(); 
          scanner.scanChar();
          scanner.scanUntil(/\*\//);
          continue;
        }
        break;
      }      
    };
    
    
    var f = function(newtheme){
      var t;
      if(scanner.hasTerminated()){
        tools.log('scanner has terminated');
        return;
      } 
      e();      
      if(scanner.check(BEGIN_SCOPE)){
        tools.log('chance_theme: begin scope');
        scanner.scan(BEGIN_SCOPE);
        ret += "{";
        f(newtheme);
      }
      else if(scanner.check(THEME_DIRECTIVE)){
        tools.log('chance_theme: theme directive');
        scanner.scan(THEME_DIRECTIVE);
        t = scanner.scan(INSIDE_PARENTHESES);
        if(t === null || t === undefined) tools.log('Expected (theme-name) after @theme');
        if(!scanner.scan(BEGIN_SCOPE)) tools.log('Expected { after @theme ');
        ret += "\n$theme: '" + [newtheme,t].join(".") + "';\n";
        f([newtheme,t].join("."));
        ret += "\n$theme: '" + newtheme + "';\n";
        if(!scanner.scan(END_SCOPE)) tools.log("Expected end of block");
      }
      else if(scanner.check(SELECTOR_THEME_VARIABLE)){
        tools.log('chance_theme: selector_theme_variable');
        scanner.scan(SELECTOR_THEME_VARIABLE);
        ret += "#{$theme}";
      } else if(scanner.check(END_SCOPE)){
        tools.log('chance_theme: end scope');
        ret += "}";
        if(!scanner.scan(END_SCOPE)) tools.log('expected end of block');
        return;
      }
      t = scanner.scan(NORMAL_SCAN_UNTIL);
      if(t !== undefined || t !== null) ret += scanner.scanChar();
      else ret += t;
      if(!scanner.hasTerminated()) f(newtheme);
    };
    
    f(theme);
    r.data = ret;
    tools.log('returning ret from chance_theme: ' + ret);
    callback(r);
    
  }  

  
});
