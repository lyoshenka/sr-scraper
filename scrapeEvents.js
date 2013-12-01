var _         = require('underscore')
  , async     = require('async')
  , db        = require('monk')('localhost/scraper')
  , urls      = require('./urls')
  , getPage   = require('./getPage')
  ;


var phantomParseEventListPage = function () {

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
};

var getEvents = function (options, callback) {
  if (options.year >= 2009 && (options.division == 'college-mixed' || options.division == 'youth-all' ||
                               options.division == 'all' || options.division == 'college-all')) {
    callback('No data available for this division and year.', []);
    return;
  }

  var url = urls.events(options.division, options.year);

  console.log(url);

  getPage(url, function (err, page, done) {
    if (err) {
      console.log(err);
      callback(err, []);
      done();
    }
    else {
      page.evaluate(phantomParseEventListPage, function (err, events){
        callback(err, events);
        done();
      });
    }
  });
};

phantomParseEventPage =  function (year) {
    var oldStyle = year < 2009, // is this the old scorereporter style (pre-2010), or the new one
        event    = getInfo(oldStyle);

    event.stages = getStages();
    // team.roster = getRoster(oldStyle);
    // team.games = getGames(oldStyle);

    return event;

    function bracketSize(bracket) {
      var max = 0;
      $(bracket).find('tr').each(function() {
        var width = 0;
        $(this).find('td').each(function() {
          width += $(this).attr('rowspan') ? parseInt($(this).attr('rowspan')) : 1;
        });
        if (width > max) {
          max = width;
        }
      });
      return max;
    }

    function getStages() {
      var pools = [];
      $('table.pool').each(function() {
        var pool = { name: $(this).find('.poolname').text() };

        pool.type = pool.name.match(/^Pool /) ? 'pool' : 'bracket';

        if (pool.type === 'pool') {
          var teams = [],
              games = [],
              currDay,
              final_seed = 1;

          $(this).find('table.poolstandings tr').each(function() {
            if (!$(this).find('.gwt-Label').length) {
              return;
            }
            var record = $(this).find('.gwt-Label').text().replace(/[\(\)]/,''),
                teamName = $(this).find('.teamhtml').text(),
                seed = parseInt($(this).find('.gwt-HTML').first().text().replace(/\w/,''));
            teams.push({
              name: teamName,
              initial_seed: seed,
              final_seed: final_seed,
              record: record
            });
            final_seed++;
          });
          pool.teams = JSON.stringify(teams);

          currDay = null;
          $(this).find('table.poolresults tr').each(function() {
            if (!$(this).find('.editlabel').length) {
              currDay = $(this).find('.tc').text();
              return; // header
            }
            var currGame = {};
            var time = $(this).find('.tc').text();
            $(this).find('.tlc').each(function(){
              var text = $(this).text();
              if (text.match(/^\d+$/)) {
                currGame.field = text;
              }
              else if (text.indexOf('-') >= 0) {
                currGame.score = text.trim();
                currGame.time = time;
                currGame.day = currDay;
                games.push(currGame);
                currGame = {};
              }
              else {
                currGame.teams = text;
              }
            });
          });
          pool.games = JSON.stringify(games);
        }
        else {
          pool.numRounds = $(this).find('.bracketdate').length;

          var bracket = $(this).find('table.bracket');
          pool.maxCols = bracketSize(bracket);
        }

        pools.push(pool);
      });
      return pools;
    }

    function getGames(oldStyle) {
        var scores = oldStyle ? $('form td[valign="top"] tr') : $('.scores tr');
        var tournament, games = [];

        $.each(scores, function (index, row) {
            if (row.children.length === 1 && $(row).find('a').length > 0) {
                // New tournament
                var link = $(row).find('a')[0];
                var id = oldStyle ? link.href.match(/id=(\d+)/)[0] : _.last(link.href.split('/'));
                var name = link.text;

                tournament = { id   : id,
                               name : name };

            }
            else if (row.children.length === 3) {
                // New game
                var oppLink = oldStyle ? $(row.children[1]).find('a')[0] : $(row.children[2]).find('a')[0],

                    opponent = {
                        id          : oldStyle ? oppLink.href.match(/team=(\d+)/)[0] : _.last(oppLink.href.split('/')),
                        displayName : oppLink.text // not "name" because for college and youth, this is the school's name not the team name
                    },

                    game = {
                        tournament : _.clone(tournament),
                        date       : row.children[0].innerText.trim(),
                        score      : row.children[oldStyle ? 2 : 1].innerText.trim(),
                        opponent   : opponent,
                        sanctioned : oldStyle ? 'unknown' : $(row.children[2]).attr('class') === 'sanctioned'
                    };

                games.push(game);
            }
        });

        return games;
    }

    function getRoster(oldStyle) {
        var roster = [],
            rosterRows  = oldStyle ? $('.bc1 tr') : $('.rosterrow');

        if (oldStyle) {
            $.each(rosterRows, function (index, row) {
                if (index < 2) {
                    return;
                }
                roster.push({
                    number      : row.children[0].innerText.trim(),
                    first_name  : null,
                    last_name   : null,
                    full_name   : row.children[1].innerText.trim(),
                    height      : row.children[2].innerText.trim(),
                    grade       : row.length > 3 ? row.children[3].innerText.trim() : null
                });
            });
        }
        else {
            $.each(rosterRows, function (index, row) {

            var first  = row.children[1].innerText.trim(),
                last   = row.children[2].innerText.trim();

            roster.push({
                number      : row.children[0].innerText.trim(),
                first_name  : first,
                last_name   : last,
                full_name   : first + ' ' + last,
                height      : row.children[3].innerText.trim(),
                grade       : null
            });
        });
        }

        return roster;
    }

    function getInfo(oldStyle) {
      if (oldStyle) {
        return {
          ERROR: "old style"
        };
      }
      else {
        var info = $('table.tourninfo');
        return {
          dates  : info.find('.gwt-Label').first().text()
          // info: info.find('.gwt-HTML').first().text(),
          // info_html: info.find('.gwt-HTML').first().html(),
          // format_html: info.find('.RulesTable').first().html(),
        };
      }
    }
};


var getDataForEvent = function (event, callback) {
  var oldDivisions = ['all', 'college-mixed', 'youth-all', 'college-all'];
  if (event.year >= 2009 && _.indexOf(oldDivisions, event.division) >= 0) {
    callback('No data available for this division and year.', null);
    return;
  }

  var url = urls.event(event.division, event.year, event.id);
  _.extend(event, {url: url});

  getPage(url, function (err, page, done) {
    page.evaluate(phantomParseEventPage, function (err, eventData) {
      if (!err) {
        _.extend(event, eventData);
      }
      callback(err, event);
      done();
    }, event.year);
  });
};

module.exports = function (division, year, callback) {
  var eventsDb = db.get('events_'+division+'_'+year);

  getEvents({ division : division, year : year }, function (err, results) {
    if (err) {
      console.log(err);
      return;
    }

    results = _.first(results, 2);

    var numEvents = results.length,
        count = 0;

    console.log('Found ' + numEvents + ' tournaments for ' + division + ' ' + year);

    async.eachLimit(results, 2, function (event, cb) {
      eventsDb.findOne({ id: event.id }).on('success', function (eventInDb) {
        count += 1;
        var message = '(' + count + '/' + numEvents + ') ' + division + ' ' + year + ' ' + event.name;
        if (eventInDb) {
          console.log(message + ' ALREADY EXISTS');
          cb();
        }
        else {
          console.log(message);
          _.extend(event, {year: year, division: division});
          getDataForEvent(event, function (err, fullEvent) {
            // eventsDb.insert(fullEvent);
            console.log(fullEvent);
            cb(err);
          });
        }
      });
    }, function(err) {
      if (err) {
        console.log(err);
      }
      callback();
    });
  });
};