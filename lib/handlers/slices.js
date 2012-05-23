var tools = require('../tools');
var SC = require('sc-runtime');
var Canvas = require('canvas');
var Handler = require('./handler').Handler;

var INCLUDE = /@include\s+slices?\([\s\S]+?\);/;
var BETWEENPARENS = /\(.* \)/;

var isSet = function(val){
  return val !== null && val !== undefined;
};

exports.Slices = Handler.extend({
  handle: function(file,request,callback){
    this._file = file;
    this._fw = file.get('framework');
    callback(false);
  },
  
  // this async gsub works as follows:
  // first all matches are made and prepared
  // the non-matching material is put in a sparse array,
  // which has openings for the new material to be put in
  // the matchers are given an individual callback function
  // closing over the index of the return value
  // the report function then pushes the result into the right
  // spot, and when everything is done, the main callback is called
  // with the result
  
  gsub: function(source,regex,matcher,matchertarget,callback,callbacktarget){
    var result = [];
    var result_index, match;
    var matchercalls = [];
    var count = 0;
    
    var report_creator = function(match,index){
      var reporter = function(newdata){
        result[index] = newdata;
        if(count === matchercalls.length){
          callback.call(callbacktarget,result.join(""));
        }
      };
      
      return function(){
        matcher.call(matchertarget,SC.copy(match),reporter);
      };
    };
        
    while (source.length > 0){
      if(match = regex.exec(source)){
        result.push(source.slice(0,match.index));
        result_index = result.push(""); // place holder
        matchercalls.push(report_creator);
        source = source.slice(match.index + match[0].length); // strip the match from source
      }
      else {
        result.push(source);
        source = "";
      }
    }
    
    if(matchercalls.length === 0) callback.call(callbacktarget,result.join(""));
    else matchercalls.forEach(function(m){ m(); });
  },
  // 
  // // we need an async gsub
  // gsub: function(source, re, callback, target) {
  //   var result = '',
  //       //source = this,
  //       match;
  // 
  //   target = target || this;
  //   while (source.length > 0) {
  //     if (match = re.exec(source)) {
  //       result += source.slice(0, match.index);
  //       result += callback.call(target,match);
  //       source  = source.slice(match.index + match[0].length);
  //     } else {
  //       result += source;
  //       source = '';
  //     }
  //   }
  // 
  //   return result;
  // },
  
  // match is the result of a regex, so is an array with the match itself as [0]
  // an index as [1] and the original as [2]
  // callback needs to be called as callback(result) in which result is a string 
  _getSliceParams: function(str){ // string is entire match
    var work;
    var INDBLQUOTES = /".*"/;
    var INSNGQUOTES = /'.*'/;
    // filename
    var fn = INDBLQUOTES.exec(str) || INSNGQUOTES.exec(str);
    if(!fn) throw new Error("slice found without filename");
    
    var ret = {
      filename: fn[0].substr(1,fn.length-2)
    };
    
    work = str.replace(/\n/g,""); // get rid of newlines
    work.split(",").forEach(function(part,i,parts){
      var p = part.trim(); // get rid of spaces
      if(p[0] !== '$') return; // not a param?
      var isEnd = i === parts.length-1; // is this the last part?
      var colonpos = p.indexOf(':'); 
      var propname = p.slice(1,colonpos); // slice off the $
      // take the part after the colon, remove
      var value = isEnd? p.slice(colonpos+1,p.length-1).trim(): p.slice(colonpos+1,p.length).trim();
      ret[propname] = parseInt(value,10) | value;
    });
    return ret;    
  },
  
  // ChanceProcessor.prototype.postprocess_css_dataurl = function(opts) {
  //     var css, re,
  //       _this = this;
  //     re = /_sc_chance\:\s*["'](.*?)["']\s*/;
  //     css = this.cssParsed.gsub(re, function(match) {
  //       var height, output, slice, url, width;
  //       slice = _this.slices[match[1]];
  //       url = 'data:' + _this.type_for(slice["path"]) + ";base64,";
  //       url += _this.base64_for(slice).replace("\n", "");
  //       output = "background-image: url(\"" + url + "\");";
  //       output += "\n";
  //       if (slice["x2"] != null) {
  //         width = slice["target_width"];
  //         height = slice["target_height"];
  //         output += "\n-webkit-background-size: " + width + "px " + height + "px;";
  //       }
  //       return output;
  //     });
  //     re = /-chance-offset:\s?"(.*?)" (-?[0-9]+) (-?[0-9]+)/;
  //     css = css.gsub(re, function(match) {
  //       console.log('chance-offset matches', match[2], match[3]);
  //       return "background-position: " + match[2] + "px " + match[3] + "px";
  //     });
  //     return css;
  //   };
  
  normalize_rectangle: function(rect) {
    if(rect.left === undefined && rect.right === undefined) rect.left = 0;
    if(rect.width === undefined){
      rect.left = rect.left || 0;
      rect.right = rect.right || 0;      
    }
    if(rect.top === undefined && rect.bottom === undefined) rect.top = 0;
    if(rect.height === undefined){
      rect.top = rect.top || 0;
      rect.bottom = rect.bottom || 0;      
    }
    return rect;
  },
  
  create_slice: function(opts){
    var slice; 
    var files = this._fw.findResourceFor(opts.filename);
    if(!files || files.length === 0) throw new Error('filename not found for slice! ' + opts.filename);
    opts.file = files[0];
    opts = this.normalize_rectangle(opts);
    slice = SC.merge(opts,{
      min_offset_x: opts.offset_x,
      min_offset_y: opts.offset_y,
      max_offset_x: opts.offset_x,
      max_offset_y: opts.offset_y,
      imaged_offset_x: 0,
      imaged_offset_y: 0
    }); // left out the caching here on purpose... if things are too slow to regenerate, it can always be added again
    return slice;
  },
  
  handle_slice: function(slice){
    // params is an object with slice parameters
    var offset;
    if(!slice.offset){
      slice.offset_x = 0;
      slice.offset_y = 0;
    }
    else {
      offset = slice.offset.trim().split(/\s+/); // split on one or more spaces, tabs
      slice.offset_x = offset[0];
      slice.offset_y = offset[1];
    }
    return this.create_slice(slice);
  },
  
  handle_slices: function(opts,callback){
    var fill, fill_w, fill_h, skip, slices, output, me = this;
    var slicedef;
    var shouldIncludeSlice = function(s){
      // opposite order, because !== undefined would have 0 being returned as true
      if(s.width === 0) return false;
      if(s.height === 0) return false;
      if(s.width !== undefined) return true;
      if(s.height !== undefined) return true;
      return true;
    };
    
    var sliceLayout = function(s){
      var layoutprops = 'left top right bottom'.split(" ");
      var output = "";
      if(slice.right === undefined || slice.left === undefined) layoutprops.push('width');
      if(slice.bottom === undefined || slice.top === undefined) layoutprops.push('height');
      layoutprops.forEach(function(p){
        if(s[p] !== undefined) output += "  %@: %@px;\n".fmt(p,s[p]);
      });
      return output;
    };
    
    if(!opts.top) opts.top = 0;
    if(!opts.left) opts.left = 0;
    if(!opts.bottom) opts.bottom = 0;
    if(!opts.right) opts.right = 0;
    
    fill = opts.fill || "1 0";
    fill = fill.strip().split(/\s+/);
    fill_w = parseInt(fill[0],10);
    fill_h = parseInt(fill[1],10);
    
    skip = opts.skip? opts.skip.split(/\s+/): [];
    slices = {
      top_left_slice: {
        left: 0, top: 0, width: opts.left, height: opts.top,
        sprite_anchor: opts["top-left-anchor"],
        sprite_padding: opts["top-left-padding"],
        offset: opts["top-left-offset"],
        filename: opts.filename
      },
      left_slice: {
        left: 0, top: opts.top, width: opts.left, 
        sprite_anchor: opts["left-anchor"],
        sprite_padding: opts["left-padding"],
        offset: opts["left-offset"],
        filename: opts.filename,
        repeat: fill_h === 0 ? null : "repeat-y"
      },
      bottom_left_slice: {
        left: 0, bottom: 0, width: opts.left, height: opts.bottom,
        sprite_anchor: opts["bottom-left-anchor"],
        sprite_padding: opts["bottom-left-padding"],
        offset: opts["bottom-left-offset"],
        filename: opts.filename
      },
      top_slice: {
        left: opts.left, top: 0, height: opts.top,
        sprite_anchor: opts["top-anchor"],
        sprite_padding: opts["top-padding"],
        offset: opts["top-offset"],
        filename: opts.filename,
        repeat: fill_w === 0 ? null : "repeat-x"
      },
      middle_slice: {
        left: opts.left, top: opts.top,
        sprite_anchor: opts["middle-anchor"],
        sprite_padding: opts["middle-padding"],
        offset: opts["middle-offset"],
        filename: opts.filename,
        repeat: fill_h !== 0 ? (fill_w !== 0 ? "repeat" : "repeat-y") : (fill_w !== 0 ? "repeat-x" : null)
      },
      bottom_slice: {
        left: opts.left, bottom: 0, height: opts.bottom,
        sprite_anchor: opts["bottom-anchor"],
        sprite_padding: opts["bottom-padding"],
        offset: opts["bottom-offset"],
        filename: opts.filename,
        repeat: fill_w === 0 ? null : "repeat-x"
      },
      top_right_slice: {
        right: 0, top: 0, width: opts.right, height: opts.top,
        sprite_anchor: opts["top-right-anchor"],
        sprite_padding: opts["top-right-padding"],
        offset: opts["top-right-offset"],
        filename: opts.filename
      },
      right_slice: {
        right: 0, top: opts.top, width: opts.right, 
        sprite_anchor: opts["right-anchor"],
        sprite_padding: opts["right-padding"],
        offset: opts["right-offset"],
        filename: opts.filename,
        repeat: fill_h === 0 ? null : "repeat-y"
      },
      bottom_right_slice: {
        right: 0, bottom: 0, width: opts.right, height: opts.bottom,
        sprite_anchor: opts["bottom-right-anchor"],
        sprite_padding: opts["bottom-right-padding"],
        offset: opts["bottom-right-offset"],
        filename: opts.filename
      }
    };
    
    if(fill_w === 0){
      slices.top_slice.right = opts.right;
      slices.middle_slice.right = opts.right;
      slices.bottom_slice.right = opts.right;
    }
    else {
      slices.top_slice.width = fill_w;
      slices.middle_slice.width = fill_w;
      slices.bottom_slice.width = fill_w;      
    }
    
    if(fill_h === 0){
      slices.left_slice.bottom = opts.bottom;
      slices.middle_slice.bottom = opts.bottom;
      slices.right_slice.bottom = opts.bottom;
    }
    else {
      slices.left_slice.height = fill_h;
      slices.middle_slice.height = fill_h;
      slices.right_slice.height = fill_h;
    }
    
    var repcount = 0;
    var report = function(data){
      output += data;
      repcount += 1;
      if(repcount === 9) callback(data);
    };
    
    
    if (shouldIncludeSlice(slices.top_left_slice)) {
      if (!skip.contains('top-left')){
        var tls = this.handle_slice(slices.top_left_slice);
        tls.file.handler.handle(tls.file,{},function(r){
          var dataurl = me.slice_image.call(me,tls,r.data);
          var ret = "& > .top-left {\n%@\n  position: absolute;\n%@}\n".fmt(dataurl,sliceLayout(slices.top_left_slice));
          report(ret);
        });
      } 
      else report("& > .top-left {\n  position: absolute;\n" + sliceLayout(slices.top_left_slice) + "}\n");
    }
    if (shouldIncludeSlice(slices.left_slice)) {
      if (!skip.contains('left')){
        var ls = this.handle_slice(slices.left_slice);
        ls.file.handler.handle(tls.file,{},function(r){
          var dataurl = me.slice_image.call(me,ls,r.data);
          var ret = "& > .left {\n%@\n  position: absolute;\n%@ }\n".fmt(dataurl,sliceLayout(slices.left_slice));
        })
      }
      else {
        slices.left_slice.bottom = opts.bottom;
        report("& > .left {\n  position: absolute;\n" + sliceLayout(slices.left_slice) + "}\n");
      }
    }
    if (shouldIncludeSlice(slices.bottom_left_slice)) {
      output += "& > .bottom-left {\n";
      if (!skip.contains('bottom_left')) output += "" + this.generate_slice_include(slices.bottom_left_slice) + ";";
      output += "\nposition: absolute;\n";
      output += sliceLayout(slices.bottom_left_slice);
      output += "}\n";
    }
    if (shouldIncludeSlice(slices.top_slice)) {
      output += "& > .top {\n";
      if (!skip.contains('top')) output += "" + this.generate_slice_include(slices.top_slice) + ";";
      output += "\nposition: absolute;\n";
      slices.top_slice.right = slice_args.right;
      output += sliceLayout(slices.top_slice);
      output += "}\n";
    }
    if (shouldIncludeSlice(slices.middle_slice)) {
      output += "& > .middle {\n";
      if (!skip.contains('middle')) output += "" + this.generate_slice_include(slices.middle_slice) + ";";
      output += "\nposition: absolute;\n";
      slices.middle_slice.bottom = slice_args.bottom;
      slices.middle_slice.right = slice_args.right;
      output += sliceLayout(slices.middle_slice);
      output += "}\n";
    }
    if (shouldIncludeSlice(slices.bottom_slice)) {
      output += "& > .bottom {\n";
      if (!skip.contains('bottom')) output += "" + this.generate_slice_include(slices.bottom_slice) + ";";
      output += "\nposition: absolute;\n";
      slices.bottom_slice.right = slice_args.right;
      output += sliceLayout(slices.bottom_slice);
      output += "}\n";
    }
    if (shouldIncludeSlice(slices.top_right_slice)) {
      output += "& > .top-right {\n";
      if (!skip.contains('top-right')) output += "" + this.generate_slice_include(slices.top_right_slice) + ";";
      output += "\nposition: absolute;\n";
      output += sliceLayout(slices.top_right_slice);
      output += "}\n";
    }
    if (shouldIncludeSlice(slices.right_slice)) {
      output += "& > .right {\n";
      if (!skip.contains('right')) output += "" + this.generate_slice_include(slices.right_slice) + ";";
      output += "\nposition: absolute;\n";
      slices.right_slice.bottom = slice_args.bottom;
      output += sliceLayout(slices.right_slice);
      output += "}\n";
    }
    if (shouldIncludeSlice(slices.bottom_right_slice)) {
      output += "& > .bottom-right {\n";
      if (!skip.contains('bottom_right')) output += this.generate_slice_include(slices.bottom_right_slice) + ";";
      output += "\nposition: absolute;\n";
      output += sliceLayout(slices.bottom_right_slice);
      output += "}\n";
    }
    return output;
  },
  
  replacer: function(match,callback){
    var slice,opts;
    var me = this;
    var m = match[0];
    // the first item is a string, the rest are space separated  items prepended by a $
    
    if(match.indexOf("slices") >= 0){ // slice or slices, 
      // handle_slices
      
    }
    else { //slice
      // handle_slice
      opts = this._getSliceParams(m);
      slice = this.handle_slice(opts);
      slice.file.handler.handle(slice.file,{},function(r){
        var dataurl = me.slice_image.call(me,slice,r.data);
        var ret = 'background-image: url("%@");\n'.fmt(dataurl);
        ret += 'background-repeat: ' + slice.repeat;
        callback(ret);
      });
    }
  },
  
  slice_rect: function(slice,imageWidth,imageHeight){
    var rect = {};
    var left = slice.left, top = slice.top, bottom = slice.bottom, right = slice.right, 
        width = slice.width, height = slice.height;
    
    if(left !== undefined){
      rect.left = left;
      rect.width = (right !== undefined)? imageWidth - right - left: (width !== undefined)? width : imageWidth - left;      
    }
    else if(right !== undefined){
      if(width !== undefined) {
        rect.left = imageWidth - width - right;
        rect.width = width;
      }
      else {
        rect.left = imageWidth = right;
        rect.width = right;
      }
    }
    else {
      rect.left = 0;
      rect.width = imageWidth;
    }
    if(top !== undefined){
      rect.top = top;
      rect.height = (bottom !== undefined)? imageHeight - bottom - top: (height !== undefined)? height: imageHeight - top;      
    }
    else if (bottom !== undefined){
      if(height !== undefined){
        rect.top = imageHeight - height - bottom;
        rect.height = height;
      }
      else {
        rect.top = imageHeight - bottom;
        rect.height = bottom;
      }
    }
    else {
      rect.top = 0;
      rect.height = imageHeight;
    }
    if(rect.left === 0 && rect.top === 0 && rect.width === imageWidth && rect.height === imageHeight){
      return null;
    } 
    return rect;
  },
  
  slice_image: function(slice,filebuffer){
    var rect, canvas,ctx,ret;
    var img = new Canvas.Image();
    img.src = filebuffer;
    var mustSlice = (slice.left || slice.right || slice.top || slice.bottom);
    
    var f = slice.proportion;
    if(mustSlice || slice.x2){
      if(!img.complete) throw new Error("could not load file: " + slice.file.get('path'));
      if(mustSlice){
        rect = this.slice_rect(slice, img.width / slice.proportion, img.height / slice.proportion);
        if(rect){
          //slice["canvas"] = gm(canvas).crop(rect["width"] * f, rect["height"] * f, rect["left"] * f, rect["top"] * f);
          // crop(w,h,x,y)
          slice.canvas = new Canvas(rect.width*f,rect.height*f); 
          ctx = slice.canvas.getContext("2d");
          ctx.drawImage(img,0,0,img.width,img.height,rect.left*f,rect.top*f,rect.width*f,rect.height*f);
        }
      }
    }
    else {
      slice.canvas = new Canvas(img.width,img.height);
      ctx = slice.canvas.getContext("2d");
      ctx.drawImage(img,0,0,img.width,img.height);
    } 
    return slice.canvas.toDataURL(); // return data url to paste
  },
  
  finish: function(request,r,callback){
    // search for @include slice and @include slices
    var css = r.data;
    var me = this;
    
    if(!css) callback(r);
    
    this.gsub(css,INCLUDE,this.replacer,this,function(result){
      
    },this);    
  }
});