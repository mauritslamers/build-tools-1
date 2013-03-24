// config.js is the set of basic configuration settings
// it contains regexes used globally, settings about file types
module.exports = {
  // default file extensions for scripts
  scriptExtensions: ['.js','.handlebars'],
  // default file extensions for stylesheets
  stylesheetExtensions: ['.css','.scss'],
  // default file extensions for resources
  resourceExtensions: ['.jpg','.jpeg','.gif','.png','.svg'],
  // default sproutcore version to use
  currentSCVersion: '1.9.1',
  
  //defaultPlugins: ['./lib/plugins/server','./lib/plugins/save'],
  defaultPlugins: {
    server: "./plugins/devserver",
    save: ["./plugins/default_save"],
    file: ["./plugins/coffeescript"],
    framework: ["./plugins/join"],
    app: ["./plugins/sc_static"]
  }
  // directories that should be exluded from inclusion by a framework
  //pathsToExclude: /(^\.|\/\.|tmp\/|debug\/|test_suites\/|setup_body_class_names)/
  pathsToExclude: ['tmp','debug','test_suites','setup_body_class_names','design','Source']
};