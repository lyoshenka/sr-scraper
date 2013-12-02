var fs = require('fs'),
    sys = require('sys'),
    _ = require('underscore'),
    async = require('async'),
    urls = require('./urls'),
    getPage   = require('./getPage');


var division = 'open',
    year = 2013;

// page.open('http://scores.usaultimate.org/scores/#mixed/tournament/12218', function () {
//   fs.write('/home/grin/code/sr-scraper/janus.html', page.content, 'w');
//   phantom.exit();
// });


getEvents(division, year, function (err, results) {
  if (err) {
    console.log(err);
    return;
  }

  // var save = _.map(results, function(event) { return { division: division, year: year, id: event.id }; });
  // fs.writeFile('tourneys.json', JSON.stringify(save), function() {
  //   console.log('saved ' + save.length + ' tourneys.');
  // });
  // return;

  console.log('Found ' + results.length + ' tournaments for ' + division + ' ' + year);

  async.eachLimit(results, 2, function (event, cb) {
    var url = urls.event(division, year, event.id),
        filename = '/home/grin/code/sr-scraper/events/' + division + '-' + year + '-' + event.id +'.html';

    if (fs.existsSync(filename)) {
      console.log(division + '-' + year + '-' + event.id + ' EXISTS.');
      cb();
      return;
    }

    getPage(url, function (err, page, done) {
      page.evaluate(function() {
        return document.documentElement.outerHTML;
      }, function(err, html) {
        fs.writeFile(filename, html, function() {
          console.log('Wrote ' + division + '-' + year + '-' + event.id);
          done();
          cb();
        });
      });
    });
  }, function(err) {
    if (err) throw err;
    sys.exit();
  });
});



function getEvents(division, year, callback) {
  if (year >= 2009 && (division == 'college-mixed' || division == 'youth-all' ||
                       division == 'all' || division == 'college-all')) {
    callback('No data available for this division and year.', []);
    return;
  }

  var url = urls.events(division, year);

  console.log(url);

  getPage(url, function(err, page, done) {
    page.evaluate(function () {
      var tournaments = [];

      if ($('#__gwt_historyFrame').length) { // new style
        $('tr.tlist, tr.tsanc').each(function() {
          tournaments.push({
            id   : this.onclick.toString().match(/tournament\/(\d+)/)[1],
          });
        });
      }
      else { // old style
        console.log('old style');
        // $('select[name="team"] option').each(function() {
        //   var lastParen = $(this).text().lastIndexOf('(');
        //   teams.push({
        //     id   : $(this).val(),
        //     name : lastParen == -1 ? $(this).text() : $(this).text().substr(0,lastParen-1) // -1 because there's a space before it too
        //   });
        // });
      }

      return tournaments;
    }, function (err, events) {
      console.log('got ' + events.length + ' events');
      callback(null, events);
      done();
    });
  });
}