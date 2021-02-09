const logger = require('../utils/logger');

module.exports = async function scraper(browser, url, selectors){
    try {
        let page = await browser.newPage();
        logger.info(`[SCRAPER] Navigating to ${url}...`);
        await page.goto(url);
        await page.waitForSelector(selectors);
        return data = await page.$eval(selectors, item => {
            item = item.innerHTML.replace('/n', '').replace('/t', '').trim();
            return item;
        });
    } catch (ex) {
        logger.error(`[SCRAPER] error`, { ex });
        throw ex;
    }
};