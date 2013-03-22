/* a Bundle is essentially a Framework, but with a manifest */

var SC = require('sc-runtime');
var Framework = require('./framework');

var Bundle = Framework.extend({
  manifest: function(){
    
  }.property()
});