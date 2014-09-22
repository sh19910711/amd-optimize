var recast = require('recast');
var stripBOM = require('strip-bom');

module.exports = function(file){
  return recast.parse(
    stripBOM(file.contents),
    {
      sourceFileName: file.relative
    }
  );
};