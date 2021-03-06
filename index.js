var parse = require('./source/parse');
var locateModules = require('./source/locateModules');
var findDependencies = require('./source/findDependencies');
var nameAnonymousModule = require('./source/nameAnonymousModule');
var print = require('./source/print');
var moduleTree = require('./source/moduleTree');
var missingModules = require('./source/missingModules');
var path = require('path');
var url = require('url');
var requirejs = require('requirejs');
var EventEmitter = require('events').EventEmitter;
var slash = require('slash');
var _ = require('lodash');

module.exports = function(config, options){
  
  config = config || {};
  options = options || {};
  
  var context = requirejs(config);
  
  var modules = moduleTree();
  
  var pendingModules = missingModules();
  
  return _.extend(new EventEmitter(), {
    addFile: function(err, file){
      
      if(err){
        this.emit('error', err);
        return;
      }      
      if('contents' in file == false){
        this.emit('error', 'File object must contain content');
        return;
      }
      if('name' in file == false){
        this.emit('error', 'File object must contain property name');
        return;
      }
      if('relative' in file == false){
        this.emit('error', 'File object must contain property relative');
        return;
      }
            
      if(modules.isMissing(file.name)){
        pendingModules.remove(file.name);

        locateModules(parse(file), options.umd).map(function(module){

          if(module.isModule){
            var dependencies = findDependencies(module.defineCall).filter(function(name){
              return !excluded(config, name);
            }).map(function(name){
              if(hasProtocol(config.baseUrl)){
                return {path: url.resolve(config.baseUrl, context.toUrl(name)) + '.js', name: name};
              } else {
                return {path: path.join(config.baseUrl, path.relative(config.baseUrl, context.toUrl(name))) + '.js', name: name};
              }
            });
            var name = nameAnonymousModule(module.defineCall, file.name);
          }else{
            var dependencies = [];
            var name = file.name;
          }

          modules.defineModule(name, module.rootAstNode, dependencies.map(function(dep){ return dep.name; }), file);

          return dependencies;

        }).reduce(function(a, b){
          return a.concat(b);
        }, []).forEach(function(dependency){
          if(modules.has(dependency.name) || pendingModules.has(dependency.name)){
            return;
          }
          
          pendingModules.add(dependency.name);
          this.emit('dependency', dependency);
        }, this);
      }
      
      if(pendingModules.isEmpty()){
        this.emit('done');
      }
    },
    done: function(done){
      if(pendingModules.isEmpty()){
        done(optimize());
      }else{
        this.on('done', function(){
          done(optimize());
        });
      }
    }
  });
  
  function optimize(){
    return modules.leafToRoot().map(function(module){
      var code = print(module.source, module.name);
      return {
        content: code.code,
        map: code.map,
        name: slash(module.name),
        source: module.file.source
      };
    });
  }

  // match to "http://", "https://", etc...
  function hasProtocol(targetUrl){
    return /^[a-z]+:\/\//.test(targetUrl);
  }
  
};

function excluded(config, name){
  var path = name.split('/');
  return 'exclude' in config && config.exclude.some(function(prefix){
    var prefixPath = prefix.split('/');
    if(prefixPath.length > path.length) return false;
    var startOfPath = _.take(path, prefixPath.length);
    return _.zip(startOfPath, prefixPath).every(function(segment){
      return segment[0] === segment[1];
    });
  });
}