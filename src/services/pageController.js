const pageScraper = require('./pageScraper');
const {performance} = require('perf_hooks');

const logger = require('../utils/logger');

module.exports = async function scrap(browserInstance, url, selectors){
    try {
        const t0 = performance.now();

        const browser = await browserInstance;
        const scrappedData = await pageScraper(browser, url, selectors); 
        await browser.close();

        const t1 = performance.now();
        logger.info(`[SCRAP CONTROLLER] Time spent: ${Number((t1 - t0) / 1000).toFixed(2)}`)
        return scrappedData;
    }
    catch (ex){
        logger.error(`[SCRAP CONTROLLER] error`, { ex });
        throw ex;
    }
};