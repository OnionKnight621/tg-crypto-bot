const puppeteer = require('puppeteer');

const logger = require('../utils/logger');

async function startBrowser(){
    let browser;
    try {
        logger.info("[BROWSER] Opening the browser...");
        browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ],
            'ignoreHTTPSErrors': true
        });
    } catch (ex) {
        logger.error(`[BROWSER] error`, { ex });
        throw ex;
    }
    return browser;
}

module.exports = {
    startBrowser
};