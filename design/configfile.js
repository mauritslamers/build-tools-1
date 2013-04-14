/* The config is JSON, but in JSON it is not allowed to have comments.
So here the config files as a json schema. The json schema is divided in
a few sub types, as they will also exist separately

*/

var projectconfig = {}; // A config file with this schema lives at the project root
var proxy = {}; // the proxy configuration only exists in the project config file


var app = {}; // This schema can both exist inside the project root configuration, as well as in the root of an app

var framework = {}; // This schema can both exist inside the app config, as well as in the root of a framework

var bundle = {}; // a bundle is a framework, but which can be loaded, but doesn't need to be

var plugin = {}; // this schema can only inside the app config. The contents are used to 


plugin.SCHEMA = {
  "type":"object",
  "additionalProperties": true
};

framework.SCHEMA = {
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

bundle.SCHEMA = {
  "type":"object",
  "extends": framework.SCHEMA,
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


app.SCHEMA = {
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
      "additionalProperties": plugin.SCHEMA
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
        "extends": bundle.SCHEMA
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

projectconfig.SCHEMA = {
  "type": "object",
  "properties": {
    "apps" : { 
      "type": "array", 
      "required": true,
      "description": "An array of apps in this project",
      "items": {
        "type":"object",
        "extends": app.SCHEMA
      }
    },
    "proxies": {
      "type": "array",
      "required": false,
      "items": {
        "type": "object",
        "extends": proxy.SCHEMA
      }
    },
    "plugins": {
      "type": "object",
      "description": "Plugins is a object hash where the plugin name is the key, and its configuration (a hash) the value",
      "additionalProperties": plugin.SCHEMA
    }
  }
};

