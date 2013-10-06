

/**
 * Returns a list of all teams for a division
 * @return {Array} teams
 * [
 *     {
 *         id   : String,
 *         name : String
 *      }
 * ]
 */
module.exports = function () {

    var teams = [];

    if ($('#__gwt_historyFrame').length) { // new style

        $('td.teamhalf select.gwt-ListBox option').each(function() {
            teams.push({
                id   : $(this).val(),
                name : $(this).text()
            });
        });
    }
    else { // old style

        $('select[name="team"] option').each(function() {
            var lastParen = $(this).text().lastIndexOf('(');
            teams.push({
                id   : $(this).val(),
                name : lastParen == -1 ? $(this).text() : $(this).text().substr(0,lastParen-1) // -1 because there's a space before it too
            });
        });
    }

    return teams;
};