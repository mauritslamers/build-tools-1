var App = require('../app').App;

var testApp = App.create({
  name: 'testapp',
  theme: 'sc-theme',
  htmlHead: '<title>TestApp</title>',
  urlPrefix: '/',
  pathsToExclude: [],
  hasSC: true,     
  configSC: {
    version: '1.4.5',
    frameworkNames: "bootstrap jquery debug runtime foundation datastore desktop core_tools animation testing".split(" ")
  },
  frameworks: [
    { path: 'frameworks/sproutcore/themes/empty_theme'},
    { path: 'frameworks/sproutcore/themes/standard_theme'},
    { path: 'frameworks/sproutcore/apps/test_runner', pathsToExclude: [] }
  ]
});

module.exports = exports = testApp;