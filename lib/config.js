
// config.js is the set of basic configuration settings
// it contains regexes used globally, settings about file types, schemas for the different config files

var config = {
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
    "./plugins/devserver" : {},
    "./plugins/default_save": {},
    "./plugins/sc_static": {}
    // 
    // server: "./plugins/devserver",
    // save: ["./plugins/default_save"],
    // file: [],//file: ["./plugins/coffeescript"],
    // framework: [], //framework: ["./plugins/join"],
    // app: []//app: ["./plugins/sc_static"]
  },
  // directories that should be exluded from inclusion by a framework
  //pathsToExclude: /(^\.|\/\.|tmp\/|debug\/|test_suites\/|setup_body_class_names)/
  pathsToExclude: ['tmp','debug','test_suites','setup_body_class_names','design','Source','frameworks'],
  SCHEMAS: {}
};

module.exports = exports = config;

config.SCHEMAS.plugin = {
  "type":"object",
  "additionalProperties": true
};

config.SCHEMAS.framework = {
  "type": "object",
  "properties": {
    "name": {"type":"string", "required": true },
    "dependencies": { "type":"array", "items": {"type":"string"}, "description":"a list of framework names this framework depends on","required": false },
    "development": { 
      "type": "object",
      "properties": {
        "combineScripts": { "type":"boolean", "description": "indicate that the scripts in this framework should be combined"},
        "combineStylesheets": { "type":"boolean", "description": "indicate that the stylesheets in this framework should be combined"}
      },
      "additionalProperties": true
    },
    "deployment": {
      "type": "object",
      "properties": {
        "combineScripts": { "type":"boolean", "description": "indicate that the scripts in this framework should be combined"},
        "combineStylesheets": { "type":"boolean", "description": "indicate that the stylesheets in this framework should be combined"}
      },
      "additionalProperties": true
    }
  },
  "additionalProperties": true
};

config.SCHEMAS.bundle = {
  "type":"object",
  "extends": config.SCHEMAS.framework,
  "properties": {
    "dependencies": { "type":"array", "items": {"type":"string"}, "description":"a list of framework names this framework depends on","required": false },
    "development": { 
      "type": "object",
      "properties": {
        "combineScripts": { "type":"boolean", "description": "indicate that the scripts in this framework should be combined"},
        "combineStylesheets": { "type":"boolean", "description": "indicate that the stylesheets in this framework should be combined"}
      },
      "additionalProperties": true
    },
    "deployment": {
      "type": "object",
      "properties": {
        "combineScripts": { "type":"boolean", "description": "indicate that the scripts in this framework should be combined"},
        "combineStylesheets": { "type":"boolean", "description": "indicate that the stylesheets in this framework should be combined"}
      },
      "additionalProperties": true
    }
    // properties for bundles, such as loadSeparately or includeWithApp or something
  },
  "additionalProperties": true
};


config.SCHEMAS.app = {
  "type": "object",
  "properties": {
    "name": { "type":"string", "description": "The name of the app, the app will be served under this name in the dev-server", "required": true },
    "theme": {"type":"string", "description": "The theme the app should use (default sc-theme)", "required":false },
    "title": {"type":"string", "description": "The title value is used to generate the HTML title field. If not present, name will be used", "required":false },
    "path": {"type":"string", "description": "The relative path where the app can be found. Only required when used in project config", "required": false },
    "htmlHead": {"type":"string","description": "If you need more than title, this will be added to the content of the header", "required": false },
    "htmlScripts": {"type":"string","description":"If you need to add extra script to your page after the app scripts are loaded, put it here", "required": false },
    "plugins": {
      "type": "object",
      "description": "Plugins is a object hash where the plugin name is the key, and its configuration (a hash) the value",
      "additionalProperties": config.SCHEMAS.plugin
    },
    "frameworks": {
      "type":"array",
      "description": "A set of frameworks, identified by path. Additional settings will overrule settings in config files inside the framework",
      "items": { // this is defined separately from the framework schema itself, to enforce different validation options
        "type": "object",
        "properties": {
          "path": {"type":"string","required": true, "description": "the relative path where the framework is stored" }
        },
        "additionalProperties": true     
      }
    },
    "bundles": {
      "type":"array",
      "description": "A set of bundles, identified by path. Additional settings will overrule settings in config files inside the bundle",
      "items": {
        "type":"object",
        "extends": config.SCHEMAS.bundle
      }
    },
    "configSC": {
      "type": "object",
      "description": "a hash with settings for the sproutcore setup for this specific app",
      "required": false,
      "properties": {
        "version": { "type":"string", "description": "What version of sproutcore to use for this app", "required": false },
        "include": {"type":"booldean", "description": "Whether to include sproutcore at all", "required": false },
        "path": {"type": "string", "description": "If you want to point to a specific path where you have sproutcore", "required":false }
      }
    }
  }
};

config.SCHEMAS.projectconfig = {
  "type": "object",
  "properties": {
    "apps" : { 
      "type": "array", 
      "required": true,
      "description": "An array of apps in this project",
      "items": {
        "type":"object",
        "extends": config.SCHEMAS.app
      }
    },
    "proxies": {
      "type": "array",
      "required": false,
      "items": {
        "type": "object",
        "extends": config.SCHEMAS.proxy
      }
    },
    "plugins": {
      "type": "object",
      "description": "Plugins is a object hash where the plugin name is the key, and its configuration (a hash) the value",
      "additionalProperties": config.SCHEMAS.plugin
    }
  }
};

