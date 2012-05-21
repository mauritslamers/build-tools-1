var tools = require('../tools');
var SC = require('sc-runtime');
var Handler = require('./handler').Handler;
var Scanner = require('strscan').StringScanner;
var INCLUDE_SLICES_DIRECTIVE= /@include\s+slices\s*/,
  UNTIL_SINGLE_QUOTE = /(?!\\)'/,
  UNTIL_DOUBLE_QUOTE= /(?!\\)"/,
  NORMAL_SCAN_UNTIL= /[^{}@$]+/,
  BEGIN_SCOPE= /\{/,
  END_SCOPE= /\}/,
INCLUDE_SLICE_DIRECTIVE= /@include\s+slice\s*/;

var isNotSet = function(val){
  //return (val === null || val === undefined);
  return !val && val !== 0;
};
var isSet = function(val){
  return val !== null && val !== undefined;
};

exports.ChanceSlices = Handler.extend({
  
  scanner: null,
  
  file: null,
  
  handle: function(file,request,callback){
    // parse out slices
    this.slices = {};
    this.opts = {};
    this.file = file;
    var c = file._content;
    this.scanner = new Scanner(c);
    var newc = this.parse();
    if(newc){
      //var css_for_slices = this.css_for_slices();
      var css_for_slices = "";
      //tools.log('handled output of chance_slices of file ' + file.get('path') + ': ' + newc);
      file._content = css_for_slices + "\n" + newc;
    } 
    callback(false);
  },
  
  
  finish: function(request,r,callback){
    callback(r);
  },
  
  css_for_slices: function(){
    var name, output, slice, slices, used_by, _i, _len, _ref;
    output = [];
    slices = this.slices;
    var f = function(u){
        output.push("\t%@\n".fmt(u.path));      
    };
    
    for (name in slices) {
      if(!slices.hasOwnProperty(name)) continue;
      slice = slices[name];
      output.push("/* Slice %@, used in: \n".fmt(name));
      slice.used_by.forEach(f);
      output.push("*/\n");
      output.push(".%@ {".fmt(slice.css_name));
      output.push("_sc_chance: \"%@\";".fmt(name));
      output.push("} \n");
    }
    return output.join("");
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
      } else if (scanner.check(INCLUDE_SLICES_DIRECTIVE)) {
        output.push(this.handle_slices());
      } 
      else if (scanner.check(INCLUDE_SLICE_DIRECTIVE)) {
        output.push(this.handle_slice_include());
      } 
      // else if (scanner.check(CHANCE_FILE_DIRECTIVE)) {
      //   this.handle_file_change();
      // }
      if (scanner.check(END_SCOPE)) {
        break;
      }
      res = scanner.scan(NORMAL_SCAN_UNTIL);
      if (res === null || res === undefined){
        output.push(scanner.scanChar());
      } else {
        output.push(res);
      }
    }
    output = output.join("");
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
  
  handle_comment: function() {
    var scanner;
    console.log('handle_comment');
    scanner = this.scanner;
    scanner.scanChar();
    scanner.scanChar();
    return scanner.scanUntil(/\*\//);
  },

  handle_slice_include: function() {
    var scanner, slice;
    scanner = this.scanner;
    scanner.scan(/@include slice\s*/);
    slice = this.parse_argument_list();
    slice["filename"] = this.parse_string(slice[0]);
    return this.generate_slice_include(slice);
  },
  
  handle_string: function() {
    var scanner, str;
    scanner = this.scanner;
    str = scanner.scanChar();
    str += scanner.scanUntil(str === "'" ? UNTIL_SINGLE_QUOTE : UNTIL_DOUBLE_QUOTE);
    return str;
  },
  
  parse_string: function(cssString) {
    if (cssString.slice(0, 1) === "'") {
      cssString = "\"" + cssString.slice(1, cssString.length - 1).replace(/^"|([^\\]")/, '\\1\\"') + "\"";
    } else if (cssString.slice(0, 1) !== '"') {
      return cssString;
    }
    return JSON.parse("[" + cssString + "]")[0];
  },
  
  generate_slice_include: function(slice) {
    var offset, output;
    if (!isSet(slice.offset)){
      slice.offset = "0 0";
    }
    if (!isSet(slice.repeat)){
      slice.repeat = "no-repeat";
    }
    offset = slice.offset.trim().split(/\s+/);
    slice.offset_x = offset[0];
    slice.offset_y = offset[1];
    slice = this.create_slice(slice);
    output = "";
    output += "@extend ." + slice.css_name.replace(/\//g, '_') + ";\n";
    output += "-chance-offset: \"" + slice.name + "\" " + offset[0] + " " + offset[1] + ";\n";
    output += "background-repeat: " + slice.repeat;
    return output;
  },
  
  slice_layout: function(slice) {
    var layout_properties, output = "", prop;
    layout_properties = ["left", "top", "right", "bottom"];
    if (!isSet(slice.right) || !isSet(slice.left)) layout_properties.push("width");
    if (!isSet(slice.bottom) || !isSet(slice.top)) layout_properties.push("height");
    layout_properties.forEach(function(prop){
      if(isSet(slice[prop])) output += "  " + prop + ": " + slice[prop] + "px; \n";
    });
    return output;
  },
  
  normalize_rectangle: function(rect) {
    if(!isSet(rect.left) && !isSet(rect.right)) rect.left = 0;
    if(!isSet(rect.width)){
      rect.left = rect.left || 0;
      rect.right = rect.right || 0;
    }
    if(!isSet(rect.top) && !isSet(rect.bottom)) rect.top = 0;
    if(!isSet(rect.height)){
      rect.top = rect.top || 0;
      rect.bottom = rect.bottom || 0;
    }
    return rect;
  },
  
  handle_slices: function() {
    var slice_args, fill, fill_w, fill_h, 
        skip, slices, filename, output = "";
    var scanner = this.scanner;
    scanner.scan(/@include slices\s*/);
    
    slice_args = this.parse_argument_list();
    ["top","left","bottom","right"].forEach(function(key){
      slice_args[key] = parseInt(slice_args[key],10) || 0;
    });
    
    fill = slice_args.fill || "1 0";
    fill = fill.strip().split(/\s+/);
    fill_w = parseInt(fill[0],10);
    fill_h = parseInt(fill[1],10);
    
    skip = isSet(slice_args.skip)? slice_args.skip.split(/\s+/): [];
    filename = this.parse_string(slice_args[0]);
    
    slices = {
      top_left_slice: {
        left: 0, top: 0, width: slice_args.left, height: slice_args.top,
        sprite_anchor: slice_args["top-left-anchor"],
        sprite_padding: slice_args["top-left-padding"],
        offset: slice_args["top-left-offset"],
        filename: filename
      },
      left_slice: {
        left: 0, top: slice_args.top, width: slice_args.left, 
        sprite_anchor: slice_args["left-anchor"],
        sprite_padding: slice_args["left-padding"],
        offset: slice_args["left-offset"],
        filename: filename,
        repeat: fill_h === 0 ? null : "repeat-y"
      },
      bottom_left_slice: {
        left: 0, bottom: 0, width: slice_args.left, height: slice_args.bottom,
        sprite_anchor: slice_args["bottom-left-anchor"],
        sprite_padding: slice_args["bottom-left-padding"],
        offset: slice_args["bottom-left-offset"],
        filename: filename
      },
      top_slice: {
        left: slice_args.left, top: 0, height: slice_args.top,
        sprite_anchor: slice_args["top-anchor"],
        sprite_padding: slice_args["top-padding"],
        offset: slice_args["top-offset"],
        filename: filename,
        repeat: fill_w === 0 ? null : "repeat-x"
      },
      middle_slice: {
        left: slice_args.left, top: slice_args.top,
        sprite_anchor: slice_args["middle-anchor"],
        sprite_padding: slice_args["middle-padding"],
        offset: slice_args["middle-offset"],
        filename: filename,
        repeat: fill_h !== 0 ? (fill_w !== 0 ? "repeat" : "repeat-y") : (fill_w !== 0 ? "repeat-x" : null)
      },
      bottom_slice: {
        left: slice_args.left, bottom: 0, height: slice_args.bottom,
        sprite_anchor: slice_args["bottom-anchor"],
        sprite_padding: slice_args["bottom-padding"],
        offset: slice_args["bottom-offset"],
        filename: filename,
        repeat: fill_w === 0 ? null : "repeat-x"
      },
      top_right_slice: {
        right: 0, top: 0, width: slice_args.right, height: slice_args.top,
        sprite_anchor: slice_args["top-right-anchor"],
        sprite_padding: slice_args["top-right-padding"],
        offset: slice_args["top-right-offset"],
        filename: filename
      },
      right_slice: {
        right: 0, top: slice_args.top, width: slice_args.right, 
        sprite_anchor: slice_args["right-anchor"],
        sprite_padding: slice_args["right-padding"],
        offset: slice_args["right-offset"],
        filename: filename,
        repeat: fill_h === 0 ? null : "repeat-y"
      },
      bottom_right_slice: {
        right: 0, bottom: 0, width: slice_args.right, height: slice_args.bottom,
        sprite_anchor: slice_args["bottom-right-anchor"],
        sprite_padding: slice_args["bottom-right-padding"],
        offset: slice_args["bottom-right-offset"],
        filename: filename
      }
    };
    
    if(fill_w === 0){
      slices.top_slice.right = slice_args.right;
      slices.middle_slice.right = slice_args.right;
      slices.bottom_slice.right = slice_args.right;
    }
    else {
      slices.top_slice.width = fill_w;
      slices.middle_slice.width = fill_w;
      slices.bottom_slice.width = fill_w;      
    }
    
    if(fill_h === 0){
      slices.left_slice.bottom = slice_args.bottom;
      slices.middle_slice.bottom = slice_args.bottom;
      slices.right_slice.bottom = slice_args.bottom;
    }
    else {
      slices.left_slice.height = fill_h;
      slices.middle_slice.height = fill_h;
      slices.right_slice.height = fill_h;
    }
    
    if (this.should_include_slice(slices.top_left_slice)) {
      output += "& > .top-left {\n";
      if (!skip.contains('top-left')) output += "" + this.generate_slice_include(slices.top_left_slice) + ";";
      output += "\n  position: absolute;\n";
      output += this.slice_layout(slices.top_left_slice);
      output += "}\n";
    }
    if (this.should_include_slice(slices.left_slice)) {
      output += "& > .left {\n";
      if (!skip.contains('left')) output += "" + this.generate_slice_include(slices.left_slice) + ";";
      output += "\nposition: absolute;\n";
      slices.left_slice.bottom = slice_args.bottom;
      output += this.slice_layout(slices.left_slice);
      output += "}\n";
    }
    if (this.should_include_slice(slices.bottom_left_slice)) {
      output += "& > .bottom-left {\n";
      if (!skip.contains('bottom_left')) output += "" + this.generate_slice_include(slices.bottom_left_slice) + ";";
      output += "\nposition: absolute;\n";
      output += this.slice_layout(slices.bottom_left_slice);
      output += "}\n";
    }
    if (this.should_include_slice(slices.top_slice)) {
      output += "& > .top {\n";
      if (!skip.contains('top')) output += "" + this.generate_slice_include(slices.top_slice) + ";";
      output += "\nposition: absolute;\n";
      slices.top_slice.right = slice_args.right;
      output += this.slice_layout(slices.top_slice);
      output += "}\n";
    }
    if (this.should_include_slice(slices.middle_slice)) {
      output += "& > .middle {\n";
      if (!skip.contains('middle')) output += "" + this.generate_slice_include(slices.middle_slice) + ";";
      output += "\nposition: absolute;\n";
      slices.middle_slice.bottom = slice_args.bottom;
      slices.middle_slice.right = slice_args.right;
      output += this.slice_layout(slices.middle_slice);
      output += "}\n";
    }
    if (this.should_include_slice(slices.bottom_slice)) {
      output += "& > .bottom {\n";
      if (!skip.contains('bottom')) output += "" + this.generate_slice_include(slices.bottom_slice) + ";";
      output += "\nposition: absolute;\n";
      slices.bottom_slice.right = slice_args.right;
      output += this.slice_layout(slices.bottom_slice);
      output += "}\n";
    }
    if (this.should_include_slice(slices.top_right_slice)) {
      output += "& > .top-right {\n";
      if (!skip.contains('top-right')) output += "" + this.generate_slice_include(slices.top_right_slice) + ";";
      output += "\nposition: absolute;\n";
      output += this.slice_layout(slices.top_right_slice);
      output += "}\n";
    }
    if (this.should_include_slice(slices.right_slice)) {
      output += "& > .right {\n";
      if (!skip.contains('right')) output += "" + this.generate_slice_include(slices.right_slice) + ";";
      output += "\nposition: absolute;\n";
      slices.right_slice.bottom = slice_args.bottom;
      output += this.slice_layout(slices.right_slice);
      output += "}\n";
    }
    if (this.should_include_slice(slices.bottom_right_slice)) {
      output += "& > .bottom-right {\n";
      if (!skip.contains('bottom_right')) output += "" + this.generate_slice_include(slices.bottom_right_slice) + ";";
      output += "\nposition: absolute;\n";
      output += this.slice_layout(slices.bottom_right_slice);
      output += "}\n";
    }
    return output;
  },
  
  create_slice: function(opts){
    var filename, path, slice_path, slice_name_params,slice,css_name,
        rect_params = ["left","top","width","height","bottom","right","offset_x","offset_y"];
    
    filename = opts.filename;
    //tools.log('filename: ' + filename);
    path = this.file.framework.findResourceFor(filename)[0].get('path');
    //tools.log('found path: ' + path);
    opts.path = path;
    opts = this.normalize_rectangle(opts);
    
    slice_path = path.replace(tools.path.extname(path), "");
    slice_name_params = rect_params.map(function(p){
      return isSet(opts[p])? opts[p]: "";
    });
    slice_name_params.unshift(slice_path);
    
    rect_params.forEach(function(p){
      opts[p] = parseInt(opts[p],10) || opts[p];
    });
    
    slice_path = String.prototype.fmt.apply("%@_%@_%@_%@_%@_%@_%@",slice_name_params);
    
    if(this.slices[slice_path]){
      slice = this.slices[slice_path];
      slice.min_offset_x = Math.min.apply(Math, [slice.min_offset_x, opts.offset_x]);
      slice.min_offset_y = Math.min.apply(Math, [slice.min_offset_y, opts.offset_y]);
      slice.max_offset_x = Math.max.apply(Math, [slice.max_offset_x, opts.offset_x]);
      slice.max_offset_y = Math.max.apply(Math, [slice.max_offset_y, opts.offset_y]);      
    }
    else {
      //tools.log('slice_path is not in this.slices');
      css_name = "__chance_slice_" + slice_path.replace(/[^a-zA-Z0-9]/, '_');
      slice = SC.merge(opts,{
        name: slice_path,
        path: path,
        css_name: css_name,
        min_offset_x: opts.offset_x,
        min_offset_y: opts.offset_y,
        max_offset_x: opts.offset_x,
        max_offset_y: opts.offset_y,
        imaged_offset_x: 0,
        imaged_offset_y: 0,
        used_by: []
      });
      this.slices[slice_path] = slice;      
    }
    slice.used_by.push({ path: this.path });
    return slice;
  },
  
  should_include_slice: function(slice) {
    if (!isSet(slice.width)) return true;    
    if (!isSet(slice.height)) return true;
    if (slice.width === 0) return false;
    if (slice.height === 0) return false;
    return true;
  },
  
  parse_argument: function() {
    var key, parsing_value, scanner, value;
    scanner = this.scanner;
    this.handle_empty();
    value = null;
    parsing_value = "";
    key = "no_key";
    if (scanner.check(/\$/)) {
      scanner.scan(/\$/);
      this.handle_empty();
      parsing_value = scanner.scan(/[a-zA-Z_-][a-zA-Z0-9+_-]*/);
      if (!isSet(parsing_value)) {
        console.log("Expected a valid key.");
      }
      this.handle_empty();
      if (scanner.scan(/:/)) {
        key = parsing_value;
        parsing_value = "";
        this.handle_empty();
      }
    }
    value = null;
    parsing_value += this.handle_empty();
    while (!(scanner.check(/[,)]/) || scanner.hasTerminated())) {
      if (scanner.check(/["']/)) {
        parsing_value += this.handle_string();
        parsing_value += this.handle_empty();
        continue;
      }
      parsing_value += scanner.scanChar();
      parsing_value += this.handle_empty();
    }
    if (parsing_value.length !== 0) {
      value = parsing_value;
    }
    return {
      key: key,
      value: value
    };
  },
  
  parse_argument_list: function() {
    var arg, args, idx, scanner;
    scanner = this.scanner;
    if (!scanner.scan(/\(/)) {
      console.log("Expected ( to begin argument list.");
    }
    idx = 0;
    args = {};
    while (!(scanner.check(/\)/) || scanner.hasTerminated())) {
      arg = this.parse_argument();
      if (arg["key"] === "no_key") {
        arg["key"] = idx;
        idx += 1;
      }
      args[arg["key"]] = arg["value"].trim();
      scanner.scan(/,/);
    }
    scanner.scan(/\)/);
    return args;
  }
  
  
});