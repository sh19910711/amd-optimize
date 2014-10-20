var fs = require('fs');
var optimize = require('../index.js');
var assert = require('assert');
var loadFileFromNet = require('./utils/loadFileFromNet');
var _ = require('lodash');
var http = require('http');
var path = require('path');
var connect = require('connect');

describe("Load through HTTP", function(){
  
  var cwd = __dirname;
  var base = 'http://127.0.0.1:18080/basic/modules';
  var output = ['umd3', 'umd2', 'umd1', 'add', 'test'];

  // setup server
  before(function(done) {
    var app = connect();
    app.use(function(req, res) {
      return fs.readFile(path.join(cwd, req.url.slice(1)), function(err, content){
        if(err) throw new Error("Error: can't read file");
        res.end(content);
      });
    });
    this.server = http.createServer(app).listen(18080, "127.0.0.1", function() {
      done();
    });
  });

  after(function() {
    this.server.close();
  });
  
  before(function(done){
    var optimizer = optimize({
      baseUrl: base
    }, {
      umd: true
    });

    optimizer.on('dependency', function(dependency){
      loadFileFromNet(dependency, base, cwd, optimizer.addFile.bind(optimizer));
    });

    loadFileFromNet({path: base + '/test.js', name: 'test'}, base, cwd, function(err, file){
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
