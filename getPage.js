var _        = require('underscore'),
    phantom  = require('node-phantom-ws');

// getPage
module.exports = function (url, callback) {
  phantom.create(function (err, ph) {
    if (err) throw err;

    ph.createPage(function (err, page) {
      if (err) throw err;

      page.settings = {
        userAgent: "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0)"
      };

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
        ph.exit();
      };

      page.open(url, function (status) {
        page.injectJs('jquery-1.10.2.min.js');
        page.injectJs('underscore-min.js');
        callback(null,page,done);
      });
    });
  });
};