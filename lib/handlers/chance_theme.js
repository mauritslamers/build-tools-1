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
  
  scanner: null,
  
  handle: function(file,request,callback){
    this.file = file;
    this.theme = file.theme; // chance gives us the theme as file property
    var c = file._content;
    this.scanner = new Scanner(c);
    var newcss = this.parse();
    if(!this.scanner.hasTerminated()){
      tools.log('found end of block: expecting end of file');
    }
    else {
      file._content = newcss;
    }
    callback(false); // don't break off, but continue
  },
  
  finish: function(request,r,callback){
    // get the data from r, parse using stylus, then return
    //tools.log('data in chancescss: ' + tools.inspect(r));
    callback(r);    
  },
  
  handle_empty: function() {
    var output, scanner;
    scanner = this.scanner;
    output = "";
    while (true) {
      if (scanner.check(/\s+/)) {
        output += scanner.scan(/\s+/);
        continue;
      }
      if (scanner.check(/\/\//)) {
        scanner.scanUntil(/\n/);
        continue;
      }
      if (scanner.check(/\/\*/)) {
        this.handle_comment();
        continue;
      }
      break;
    }
    return output;
  },

  handle_scope: function() {
    var output, scanner;
    scanner = this.scanner;
    scanner.scan(/\{/);
    output = '{';
    output += this.parse();
    output += '}';
    if (!scanner.scan(/\}/)) {
      console.log("Expected end of block.");
    }
    return output;
  },

  handle_theme: function() {
    var old_theme, output, scanner, theme_name;
    scanner = this.scanner;
    scanner.scan(THEME_DIRECTIVE);
    theme_name = scanner.scan(/\((.+?)\)\s*/);
    if (!(theme_name != null)) {
      console.log("Expected (theme-name) after @theme");
    }
    if (!scanner.scan(/\{/)) {
      console.log("Expected { after @theme.");
    }
    old_theme = this.theme;
    this.theme = old_theme + "." + theme_name;
    output = "";
    output += "\n$theme: '" + this.theme + "';\n";
    output += this.parse();
    this.theme = old_theme;
    output += "$theme: '" + this.theme + "';\n";
    if (!scanner.scan(/\}/)) {
      console.log("Expected end of block.");
    }
    return output;
  },

  handle_theme_variable: function() {
    var output, scanner;
    scanner = this.scanner;
    scanner.scan(SELECTOR_THEME_VARIABLE);
    output = "#{$theme}";
    return output;
  },
  
  handle_comment: function() {
    var scanner;
    console.log('handle_comment');
    scanner = this.scanner;
    scanner.scanChar();
    scanner.scanChar();
    return scanner.scanUntil(/\*\//);
  },
  
  parse: function() {
    var output, res, scanner;
    scanner = this.scanner;
    output = [];
    while (!scanner.hasTerminated()) {
      output.push(this.handle_empty());
      if (scanner.hasTerminated()) {
        break;
      }
      if (scanner.check(BEGIN_SCOPE)) {
        output.push(this.handle_scope());
      } 
      else if (scanner.check(THEME_DIRECTIVE)) {
        output.push(this.handle_theme());
      } 
      else if (scanner.check(SELECTOR_THEME_VARIABLE)) {
        output.push(this.handle_theme_variable());
      } 
      // else if (scanner.check(INCLUDE_SLICES_DIRECTIVE)) {
      //   output.push(this.handle_slices());
      // } 
      // else if (scanner.check(INCLUDE_SLICE_DIRECTIVE)) {
      //   output.push(this.handle_slice_include());
      // } 
      // else if (scanner.check(CHANCE_FILE_DIRECTIVE)) {
      //   this.handle_file_change();
      // }
      if (scanner.check(END_SCOPE)) {
        break;
      }
      res = scanner.scan(NORMAL_SCAN_UNTIL);
      if (!(res != null)) {
        output.push(scanner.scanChar());
      } else {
        output.push(res);
      }
    }
    output = output.join("");
    return output;
  }
  
  // finish: function(request,r,callback){
  //   // get the data from r, parse using stylus, then return
  //   //tools.log('data in chancescss: ' + tools.inspect(r));
  //   tools.log('chance theme on file ' + this.file.get('url'));
  //   
  //   var css = r.data;
  //   // now search for and replace theme stuff
  //   var scanner = new Scanner(css);
  //   var theme = this.file.get('framework').get('theme');
  //   tools.log('frameworks says theme is: ' + theme );
  //   
  //   var ret = "$theme: '" + theme + "';\n"; //always have the theme inside every file.
  //   
  //   var e = function(){
  //     while (true) {
  //       if (scanner.check(/\s+/)) {
  //         ret += scanner.scan(/\s+/);
  //         continue;
  //       }
  //       if (scanner.check(/\/\//)) { //line comment
  //         scanner.scanUntil(/\n/);
  //         continue;
  //       }
  //       if (scanner.check(/\/\*/)) { // block comment
  //         scanner.scanChar(); 
  //         scanner.scanChar();
  //         scanner.scanUntil(/\*\//);
  //         continue;
  //       }
  //       break;
  //     }      
  //   };
  //   
  //   
  //   var f = function(newtheme){
  //     //tools.log('f is being called, ret is: ' + ret);
  //     var t;
  //     if(scanner.hasTerminated()){
  //       //tools.log('scanner has terminated');
  //       return;
  //     } 
  //     e();      
  //     if(scanner.check(BEGIN_SCOPE)){
  //       //tools.log('chance_theme: begin scope');
  //       scanner.scan(BEGIN_SCOPE);
  //       ret += "{";
  //       f(newtheme);
  //       //ret += "}";
  //     }
  //     else if(scanner.check(THEME_DIRECTIVE)){
  //       //tools.log('chance_theme: theme directive');
  //       scanner.scan(THEME_DIRECTIVE);
  //       t = scanner.scan(INSIDE_PARENTHESES);
  //       //tools.log('scanner.scan(INSIDE_PARENTHESES) returns ' + t);
  //       if(t === null || t === undefined) tools.log('Expected (theme-name) after @theme');
  //       if(!scanner.scan(BEGIN_SCOPE)) tools.log('Expected { after @theme ');
  //       ret += "\n$theme: '" + [newtheme,t].join(".") + "';\n";
  //       f([newtheme,t].join("."));
  //       ret += "\n$theme: '" + newtheme + "';\n";
  //       //if(!scanner.scan(END_SCOPE)) tools.log("Expected end of block");
  //     }
  //     else if(scanner.check(SELECTOR_THEME_VARIABLE)){
  //       //tools.log('chance_theme: selector_theme_variable');
  //       scanner.scan(SELECTOR_THEME_VARIABLE);
  //       ret += "$theme";
  //     } 
  //     if(scanner.check(END_SCOPE)){
  //       //tools.log('chance_theme: end scope');
  //       ret += "}";
  //       if(!scanner.scan(END_SCOPE)) tools.log('expected end of block');
  //       return;
  //     }
  //     t = scanner.scan(NORMAL_SCAN_UNTIL);
  //     //tools.log('normal scan until result: ' + t);
  //     if(t === undefined || t === null){
  //       t = scanner.scanChar();
  //       if(t !== undefined || t !== null) ret += t;
  //     } 
  //     else ret += t;
  //     if(!scanner.hasTerminated()) f(newtheme);
  //   };
  //   
  //   f(theme);
  //   r.data = ret;
  //   tools.log('returning ret from chance_theme: ' + ret);
  //   callback(r);
  //   
  // }
    

  
});



