#!/usr/bin/env node

var scrapeTeams = require('./scrapeTeams')
  , scrapeEvents = require('./scrapeEvents')
  ;

// don't forget to scrape seeding info???

// re-enable info, info_html and format_html in scrapeEvents::getInfo() BEFORE SCRAPING EVENTS!!!!!!!!!

var year = 2013,
    set = 1;

scrapeEvents('mixed', year, function(){
  process.exit();
});

/*
.bracket td {
  height: 50px;
  width: 50px;
  border: dotted 1px;
}
*/


return;

if (set == 1) {
  scrapeTeams('open', year);
  scrapeTeams('mixed', year);
  scrapeTeams('womens', year);
  scrapeTeams('masters', year);
} else if (set == 2) {
    scrapeTeams('college-open', year);
    scrapeTeams('college-womens', year);
    if (year < 2009) {
        scrapeTeams('college-mixed', year);
    }
} else if (set == 3) {
    scrapeTeams('youth-open', year);
    scrapeTeams('youth-girls', year);
    scrapeTeams('youth-mixed', year);
    scrapeTeams('youth-middleschool', year);
} else if (set == 4 && year < 2009) {
    scrapeTeams('college-all', year);
    scrapeTeams('all', year);
    scrapeTeams('youth-all', year);
} else {
    console.log('No set with that number.');
}