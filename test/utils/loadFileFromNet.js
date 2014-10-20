var http = require('http');
var File = require('vinyl');

module.exports = function loadFile(dependency, base, cwd, done){
  http.get(dependency.path, function(res) {
    var file = new File({
      path: dependency.path,
      cwd: cwd,
      base: base,
      name: dependency.name
    });

    res.on("data", function(content) {
      file.content = content;
    });

    res.on("end", function(err) {
      done(err, file);
    });
  });
}
