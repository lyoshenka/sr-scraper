var fs = require('fs'),
    _ = require('underscore'),
    async = require('async'),
    urls = require('./urls'),
    getPage   = require('./getPage');


var division = 'open',
    year = 2013,
    dir = '/home/grin/code/sr-scraper/events/';

fs.mkdir(dir, function() {});

// page.open('http://scores.usaultimate.org/scores/#mixed/tournament/12218', function () {
//   fs.write('/home/grin/code/sr-scraper/janus.html', page.content, 'w');
//   phantom.exit();
// });

async.eachSeries([2013,2012,2011,2010,2009,2008,2007,2006,2005,2004], function(year, cb1) {
  async.eachSeries(['open','womens','mixed','masters','all','college-open','college-womens',
    'college-mixed','college-all' ,'youth-all' ,'youth-open','youth-girls','youth-mixed',
    'youth-middleschool'], function(division, cb2) {

      if (year >= 2009 && _.contains(['all', 'college-all', 'college-mixed', 'youth-all'], division)) {
        cb2();
        return;
      }


      getEvents(division, year, function (err, results) {
        if (err) {
          cb2(err);
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
              filename = dir + division + '-' + year + '-' + event.id +'.html';

          if (fs.existsSync(filename)) {
            console.log(division + '-' + year + '-' + event.id + ' EXISTS.');
            cb();
            return;
          }

          getPage(url, function (err, page, done) {
            if (err){
              cb(err);
              return;
            }
            page.evaluate(function() {
              return document.documentElement.outerHTML;
            }, function(err, html) {
              if (err) {
                cb(err);
                return;
              }
              fs.writeFile(filename, html, function() {
                console.log('Wrote ' + division + '-' + year + '-' + event.id);
                done();
                cb();
              });
            });
          });
        }, function(err) {
          cb2(err);
        });
      });


  }, function(err) { cb1(err); });
}, function(err) {
  if (err) throw err;
  process.exit();
} );





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