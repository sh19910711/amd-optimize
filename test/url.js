var fs = require('fs');
var optimize = require('../index.js');
var assert = require('assert');
var loadFile = require('./utils/loadFile');
var _ = require('lodash');
var http = require('http');
var connect = require('connect');

describe("Use URL as base", function(){
  
  var cwd = __dirname;
  var base = 'http://127.0.0.1:18080/basic/modules';
  var output = ['umd3', 'umd2', 'umd1', 'add', 'test'];

  // setup server
  before(function(done) {
    var app = function(req, res) {
      res.end("hello");
    };
    this.server = http.createServer(app);
    this.server.listen(18080, "127.0.0.1", function() {
      done();
    });
  });

  after(function(done) {
    this.server.close();
  });
  
  before(function(done){
    var optimizer = optimize({
      baseUrl: base
    }, {
      umd: true
    });

    optimizer.on('dependency', function(dependency){
      loadFile(dependency, base, cwd, optimizer.addFile.bind(optimizer));
    });

    loadFile({path: base + '/test.js', name: 'test'}, base, cwd, function(err, file){
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
    it(name + " should have a named module", function(){
      assert.equal(_.where(output, {name:name})[0].content, fs.readFileSync(cwd + '/basic/namedModules/' + name + '.js').toString('utf8'));
    });
  });
});
