
var _        = require('underscore'),
    mustache = require('mustache'),
    urls     = {
        "teamsNew" : "http://scores.usaultimate.org/scores{{ year }}/#{{ division }}/teams",
        "teamsOld" : "http://ultimate.scorereport.net/{{ year }}/scores.cgi?page=2&div={{ division }}",
        "teamNew"  : "http://scores.usaultimate.org/scores{{ year }}/#{{ division }}/team/{{ id }}",
        "teamOld"  : "http://ultimate.scorereport.net/{{ year }}/scores.cgi?page=3&team={{ id }}"
    };

var divisions = [
    'open', 'womens', 'mixed', 'masters', 'college-open', 'college-womens', 'college-mixed',
    'youth-all', 'youth-open', 'youth-girls', 'youth-mixed', 'youth-middleschool', 'all', 'college-all'
];

var oldDivs = {
    'open' : 20,
    'womens' : 36,
    'mixed' : 68,
    'masters' : 12,
    'all' : 124,
    'college-open' : 122,
    'college-womens' : 34,
    'college-mixed' : 66,
    'college-all' : 122,
    'youth-all' : 121,
    'youth-open' : 17,
    'youth-girls' : 33,
    'youth-mixed' : 65,
    'youth-middleschool' : 9
  };


function validateDivision(division) {
    if (_.indexOf(divisions, division) < 0) {
        throw "Invalid division.";
    }
}

function validateYear(year) {
    if (year < 2004) {
        throw "No data available before 2004";
    }
}

exports.teams = function (division, year) {
    validateDivision(division);
    validateYear(year);

    var route = 'teamsNew';
    if (year === 2013) {
        year = '';
    }
    else if (year <= 2009) {
        division = oldDivs[division];
        route = 'teamsOld';
    }
    return mustache.render(urls[route], { division : division, year : year });
};


exports.team = function (division, year, id) {
    validateDivision(division);
    validateYear(year);

    var route = 'teamNew';
    if (year === 2013) {
        year = '';
    }
    else if (year <= 2009) {
        route = 'teamOld';
    }
    return mustache.render(urls[route], { division : division, year : year, id : id });
};
