const {performance} = require('perf_hooks');
// const fs = require('fs');
// const co = require('co');
const Nightmare = require('nightmare');
const cheerio = require('cheerio');
const htmlparser2 = require('htmlparser2');

const logger = require('../utils/logger');

// disabled due to nightmare conflicts with heroku
async function scrapper(uri, selectors) {
    const t0 = performance.now();

    const nightmare = Nightmare({show: false});
    let currencyValue = null;

    try {
        await nightmare.goto(uri)
        .wait(1000)
        .wait('body')
        .evaluate(() => {
            return document.body.innerHTML;
        })
        .then(async (html) => {
            logger.info('[SCRAPER] Getting currency value');

            const dom = htmlparser2.parseDocument(html, {
                withDomLvl1        : true,
                normalizeWhitespace: false,
                xmlMode            : true,
                decodeEntities     : true
            });
            const $ = cheerio.load(dom);
            const value = $(selectors).contents().first().text().trim();
            currencyValue = value;
        })
        .catch(err => logger.error(`[SCRAPPER] error`, { err }));

        const t1 = performance.now();
        logger.info(`[SCRAPER] Time spent: ${Number((t1 - t0) / 1000).toFixed(2)}`);
        return currencyValue;
    } catch (ex) {
        logger.error(`[SCRAPER] error`, { ex });
        throw ex;
    }
}

module.exports = scrapper;