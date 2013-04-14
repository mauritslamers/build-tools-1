//Plugin API: 

var plugin = SC.Object.extend({
  name: 'name',
  type: null, // one of "file","framework","server","save"
  filetype: "", // in case of type file or framework, the file type this plugin should be called for
                // value should be "script","stylesheet" or "resource"
  extension: "", // in case of file, setting an extension will be added to the list of extensions for the type in filetype
  before: null, // array of plugins this plugin should always be handled before
  after: null, // array of plugins which this plugin should always be after
  
  /*
    process is called for a plugin action. The arguments depend on the plugin type.
    
    type === "file" =>  
    process(file,callback), where callback arguments should be (err,newcontent)
    
    The use case here is for example a CoffeeScript parser. It parses the content of the given file
    and sends the result in the callback. The plugin is given the file object, so it can retrieve the 
    content, path and status (whether it changed since the last time) of the file in order to handle 
    caching (if required).
    This plugin will be given one instance per application

    type === "framework" =>   
    process(files,callback), where callback arguments are (err,result).
                                 where result is an array of files
                                 
    The use case is a style sheet parser (compass, sass, less). The plugin receives all files of the given filetype 
    of the current framework. The plugin uses the File API to retrieve and set the new content.
    It is important to realize that a plugin can alter the array of files given back in the callback.
    In this way, it can filter out files, as this is the case in _theme.css files,
    which exist on disk but should not be included in the actual theme, add new files (most notably virtual ones, 
    not necessarily of the same type), as well as order the files to achieve a specific load order.
    This plugin will be given one instance per framework.
    
    ==
    The Server and Save plugin types
    ==
    
    The server and save plugin types need a bit of an introduction. This is because these plugin types are 
    differing the most from the original Garcon approach. In the original Garcon approach, the scanning
    process would build up a hash of files in which the url of the file was the key.
    This idea was very simple and fast, but also inflexible, because the representation towards either disk or
    browser is very fixed. To allow more freedom in the way the representation can be done, the functionality 
    has been moved to the server and save plugins. 
    As there are certain standard parts in the HTML to build, a special HtmlFile API exists to make 
    the generation of the HTML base file easier.
    The server and save plugins are given one instance per app, and are created with the app as property
    of the plugin
    
    type === "server" => 
    
    process(request,response)
    
    request is the incoming request,
    response is the server response
    
    When the request can be handled, the process function should return true, otherwise false, in which case the 
    request will be proxied
    
    type === "save" =>
    
    process(callback)
    
    The app object is available as property on the plugin, and the plugin should save the app on request. Just as with the server plugin, the 
    save plugin can use the HtmlFile API.
    The callback should be given the arguments (err,finished), where finished is true when the process is done.

  */
  process: function(item,callback){
  
  }
  
});

/* 
  You will have to provide a JSON schema of the plugin configurables 
  You can extend the default plugin schema, by referring to module.plugin.SCHEMA
*/


plugin.SCHEMA = {
  
}