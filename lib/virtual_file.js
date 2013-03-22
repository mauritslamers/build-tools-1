var SC = require("sc-runtime");
var File = require('./file');

module.exports = File.extend({
  isVirtual: true,
  
  content: null,
  
  read: function(callback){
    callback(this.get('content'));
  }
});