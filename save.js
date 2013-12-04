var fs = require('fs'),
    _ = require('underscore'),
    async = require('async'),
    urls = require('./urls'),
    getPage   = require('./getPage');


var dir = '/home/grin/code/sr-scraper/events/';

fs.mkdir(dir, function() {});

async.eachSeries([/*2013,2012,2011,2010,*/2009,2008,2007,2006,2005,2004], function(year, cb1) {
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

        console.log('Found ' + results.length + ' tournaments for ' + division + ' ' + year);

        var filename = dir + division + '-' + year + '-events.json';

        fs.writeFile(filename, JSON.stringify(results), function() {
          console.log('Wrote ' + division + '-' + year + '-events.json');
          cb2();
        });

        return;

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
          var self = $(this),
            notes = self.find('td.tournamentnotes'),
            link = notes.find('a').length ?
                   notes.find('a').attr('href').replace(/^http:\/\/http:\/\//,'http://') :
                   null,
            fee = null,
            feeDue = null,
            feeStr = $.trim(notes.text());

          if (link)
          {
            feeStr = $.trim(feeStr.substr(link.length));
          }
          var matches = feeStr.match(/^Fee\: \$(\d+) Due\: (\w+ \d+)/);
          if (matches)
          {
            fee = matches[1];
            feeDue = matches[2];
          }

          tournaments.push({
            id   : this.onclick.toString().match(/tournament\/(\d+)/)[1],
            name : self.find('td.tournamentname').text(),
            days : self.find('td.tournamentdays').text(),
            location: self.find('td.tournamentloc').text(),
            teams: self.find('td.tournamentteams').text(),
            link: link,
            cost: fee,
            costDue: feeDue,
            sanctioned : self.hasClass('tsanc')
          });
        });
      }
      else { // old style
        $('body > center > center > table > tbody > tr[onclick]').each(function() {
          if ($(this).hasClass('dark')) {
            return; // header
          }

          var $this = $(this),
              notes = $this.find('> td:nth-child(5)');

          tournaments.push({
            id : parseInt(this.onclick.toString().match(/id=(\d+)/)[1]),
            name: $this.find('> td:nth-child(1)').text(),
            winner: $this.find('> td:nth-child(2)').text(),
            location: $this.find('> td:nth-child(3)').text(),
            teams: $this.find('> td:nth-child(4)').text(),
            link: notes.find('a').text(),
            details: notes.find('table tr:nth-child(2)').text()
          });
        });
      }

      return tournaments;
    }, function (err, events) {
      console.log('got ' + events.length + ' events');
      callback(null, events);
      done();
    });
  });
}