/**
 * Page to scrape a particular team page from SR
 * @return {Object} team
 * {
 *     section : String,
 *     region  : String,
 *     name    : String,
 *     games   : [
 *         {
 *             date     : "August 11",
 *             opponent : {
 *                 id   : String,
 *                 name : String
 *             },
 *             sanctioned : Boolean,
 *             score : "12-11"
 *             tournament : {
 *                 id   : String,
 *                 name : String
 *             }
 *         }
 *     ],
 *     roster  : [
 *         {
 *             first  : String,
 *             height : String,
 *             last   : string,
 *             number : String
 *         }
 *     ]
 * }
 */


module.exports = function () {

    var oldStyle  = !$('#__gwt_historyFrame').length, // is this the old scorereporter style (pre-2010), or the new one
        team      = getInfo(oldStyle);

    team.roster = getRoster(oldStyle);
    team.games = getGames(oldStyle);

    return team;

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


    function extractFromInfo(info, teamType, field) {
        var fields = {
            4: [ // club
                'name', 'region', 'section', 'cityState', 'web', 'contact', 'comments', 'lastMod', 'rri'
            ],
            2: [ // college
                'school', 'name', 'region', 'section', 'cityState', 'web', 'contact', 'comments', 'lastMod', 'rri'
            ],
            1: [ // youth
                'school', 'name', 'city', 'web', 'contact', 'comments', 'lastMod', 'rri'
            ]
        };

        if (!_.has(fields, teamType)) {
            throw "Invalid type.";
        }

        if (_.indexOf(fields[teamType], field) < 0) {
            return null;
        }

        var index = (_.indexOf(fields[teamType], field) + 1) * 2;
        return info[index].innerText.trim();
    }

    function getInfo(oldStyle) {
        if (oldStyle) {
            var info     = $('table[bgcolor="dddddd"] td'),
                teamType = $('select[name="div1"]').val(); // 1 = youth, 2 = college, 4 = club

            var name = extractFromInfo(info, teamType, 'name'),
                school = extractFromInfo(info, teamType, 'school'),
                cityState = extractFromInfo(info, teamType, 'cityState'),
                city,
                state;

            if (cityState) {
                var commaIndex = cityState.indexOf(',');
                if (commaIndex >=0) {
                    city = cityState.substring(0,commaIndex).trim();
                    state = cityState.substring(commaIndex+1).trim();
                }
                else {
                    city = cityState;
                }
            }

            return {
                name     : name,
                school   : school,
                displayName : school ? school : name,
                region   : extractFromInfo(info, teamType, 'region'),
                section  : extractFromInfo(info, teamType, 'section'),
                city     : city,
                state    : state,
                rri      : extractFromInfo(info, teamType, 'rri'),
                contact  : extractFromInfo(info, teamType, 'contact'),
                comments : extractFromInfo(info, teamType, 'comments'),
                web      : extractFromInfo(info, teamType, 'web'),
                lastMod  : extractFromInfo(info, teamType, 'lastMod')
            };

        }
        else {
            var info2 = $('.infotable td'), // info2 because ide complains about info being defined above
                title = $('.pagetitle h2:last')[0];
            return  {
                name     : title.innerText,
                school   : null,
                displayName : title.innerText,
                region   : info2[1].innerText.trim(),
                section  : info2[3].innerText.trim(),
                city     : info2[5].innerText.trim(),
                state    : info2[7].innerText.trim(),
                rri      : info2[9].innerText.trim(),
                contact  : info2[11].innerText.trim(),
                comments : null,
                web      : info2[13].innerText.trim(),
                lastMod  : info2[15].innerText.trim()
            };
        }
    }
};
