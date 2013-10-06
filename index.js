#!/usr/bin/env node

var _         = require('underscore')
  , async     = require('async')
  , phantom   = require('node-phantom-ws')
  , urls      = require('./urls')
  , teamEval  = require('./parseSingleTeam')
  , teamsEval = require('./parseTeamList')
  , db        = require('monk')('localhost/scraper')
  ;

var getPage = function (url, callback) {
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


/**
 * Fetch a list of all teams for a particular division. Returns an array
 * of teams in the form: { id : String, name : String }
 *
 * @param  {Object}   options  [description]
 * @param  {Function} callback (err, teams)
 */
var getTeamNames = function (options, callback) {
  if (_.isFunction(options)) {
    callback = options;
    options = {};
  }

  if (options.year >= 2009 && (options.division == 'college-mixed' || options.division == 'youth-all' ||
                               options.division == 'all' || options.division == 'college-all')) {
    callback('No data available for this division and year.', []);
    return;
  }

  var url = urls.teams(options.division, options.year);

  console.log(url);

  getPage(url, function (err, page, done) {
    if (err) {
      console.log(err);
      callback(err, []);
      done();
    }
    else {
      page.evaluate(teamsEval, function (err, teams){
        callback(err, teams);
        done();
      });
    }
  });
};


/**
 * Get a particular team's results.
 * @param  {String}   division
 * @param  {String}   id
 * @param  {Function} callback (err, team)
 */
var getDataForTeam = function (division, year, id, callback) {
  if (year >= 2009 && (division == 'college-mixed' || division == 'youth-all' ||
                       division == 'all' || division == 'college-all')) {
    callback('No data available for this division and year.', null);
    return;
  }

  var url = urls.team(division, year, id);

  getPage(url, function (err, page, done) {
    // TODO: move this to an inject function.
    page.evaluate(teamEval, function (err, team) {
      if (!err) {
        _.extend(team, { id         : id,
                         year       : year,
                         division   : division });
      }
      callback(err, team);
      done();
    });
  });
};


var generate = function (division, year) {

  var teamsDb = db.get(division+'_'+year);

  getTeamNames({ division : division, year : year }, function (err, results) {
    if (err) {
      console.log(err);
      return;
    }

    var numTeams = results.length,
        count = 0;

    console.log('Found ' + numTeams + ' teams for ' + division + ' ' + year);

    async.forEachSeries(results, function (team, cb) {
      teamsDb.findOne({ id: team.id }).on('success', function (teamInDb) {
        count += 1;
        var message = '(' + count + '/' + numTeams + ') ' + division + ' ' + year + ' ' + team.name;
        if (teamInDb) {
          console.log(message + ' ALREADY EXISTS');
          cb();
        }
        else {
          console.log(message);
          getDataForTeam(division, year, team.id, function (err, fullTeam) {
            teamsDb.insert(fullTeam);
            cb();
          });
        }
      });
    });
  });
};

var year = 2013,
    set = 1;

if (set == 1) {
    generate('open', year);
    // generate('mixed', year);
    // generate('womens', year);
    // generate('masters', year);
} else if (set == 2) {
    generate('college-open', year);
    generate('college-womens', year);
    if (year < 2009) {
        generate('college-mixed', year);
    }
} else if (set == 3) {
    generate('youth-open', year);
    generate('youth-girls', year);
    generate('youth-mixed', year);
    generate('youth-middleschool', year);
} else if (set == 4 && year < 2009) {
    generate('college-all', year);
    generate('all', year);
    generate('youth-all', year);
} else {
    console.log('No set with that number.');
}