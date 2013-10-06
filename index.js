#!/usr/bin/env node

var _        = require('underscore')
  , async    = require('async')
  , phantom  = require('phantomjs')
  , urls     = require('./urls')
  , teamEval = require('./team')
  , teamsEval = require('./teams')
  ;

var jquery     = "http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js",
    underscore = "http://underscorejs.org/underscore-min.js";

var plugins = [jquery, underscore];

var getPage = function (url, callback) {
  phantom.create(function (client) {
    client.createPage(function (page) {
      var done = function () { // give cleanup function.
        page.release();
        client.exit();
      };
      page.open(url, function (status) {
        async.map(
          plugins,
          function (item, cb) { page.includeJs(item, function () { cb(); }); },
          function onComplete() { return callback(null, page, done); }
        );
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
    callback('No data available for this division and year.', null);
    return;
  }

  var url = urls.teams(options.division, options.year);

  getPage(url, function (err, page, done) {
    page.evaluate(teamsEval, function (teams) {
      callback(null, teams);
      done();
    });
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
    page.evaluate(teamEval, function (team) {
      _.extend(team, { id         : id,
                       year       : year,
                       division   : division });
      callback(null, team);
      done();
    });
  });
};


var generate = function (division, year) {

  // var teams = db.get(division+'_'+year);

  getTeamNames({ division : division, year : year }, function (err, results) {

    console.log(err, results);
    return;

    var numTeams = results.length,
        count = 0;
    console.log('Found ' + numTeams + ' teams for ' + division + ' ' + year);

    async.forEachSeries(results, function (team, cb) {

      teams.findOne({ id: team.id }).on('success', function (teamInDb) {
        count += 1;
        var message = '(' + count + '/' + numTeams + ') ' + division + ' ' + year + ' ' + team.name;
        if (teamInDb) {
//                    console.log(message + ' ALREADY EXISTS');
          cb();
        }
        else {
          console.log(message);
          api.getDataForTeam(division, year, team.id, function (err, fullTeam) {
            teams.insert(fullTeam);
            cb();
          });
        }
      });
    });
  });
};

generate('mixed', 2013);