var _         = require('underscore')
  , phantom   = require('node-phantom-ws')
  ;

// getPage
module.exports = function (url, callback) {
  phantom.create(function (err, ph) {
    ph.createPage(function (err, page) {

      page.onConsoleMessage = function (msg, line, source) {
        console.log('console> ' + msg);
      };

      page.onError = function(err) {
        var msgStack = ['ERROR: ' + _.first(err)];
        var trace = _.last(err);
        if (trace && trace.length) {
          msgStack.push('TRACE:');
          trace.forEach(function(t) {
            msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
          });
        }
        console.error(msgStack.join("\n"));
      };

      var done = function () { // give cleanup function.
        page.close();
        ph.exit(0);
      };

      page.open(url, function (status) {
        page.injectJs('jquery-1.10.2.min.js');
        page.injectJs('underscore-min.js');
        callback(null,page,done);
      });
    });
  });
};