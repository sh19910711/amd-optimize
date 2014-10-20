// This script is based on test/basic.js
var fs = require('fs');
var optimize = require('../index.js');
var assert = require('assert');
var loadFileFromFakeNet = require('./utils/loadFileFromFakeNet');
var _ = require('lodash');
var http = require('http');
var path = require('path');
var url = require('url');

describe("Load through HTTP (nested modules)", function(){

  var cwd = __dirname;
  var basePath = '/nested/modules';
  var base = 'http://127.0.0.1:18080' + basePath;
  var output = ['sub_b', 'sub_a', 'sub_b_a', 'sub_b_b', 'test'];

  before(function(done){
    var optimizer = optimize({
      baseUrl: base
    }, {
      umd: true
    });

    optimizer.on('dependency', function(dependency){
      loadFileFromFakeNet(dependency, base, cwd, optimizer.addFile.bind(optimizer));
    });

    loadFileFromFakeNet({path: base + '/test.js', name: 'test'}, base, cwd, function(err, file){
      optimizer.addFile(err, file);

      optimizer.done(function(optimized){
        output = optimized;

        done();
      });
    });
  });

  it("should have 5 items", function(){
    assert.equal(output.length, 5);
  });

  it("should have the test last", function(){
    assert.equal(output[4].name, 'test');
  });

  output.forEach(function(name){
    it(name + " should have a named module");
    // assert.equal(_.where(output, {name:name})[0].content.trim(), fs.readFileSync(cwd + '/nested/namedModules/' + name + '.js').toString('utf8')).trim();
  });
});
