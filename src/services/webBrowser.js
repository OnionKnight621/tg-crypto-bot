const puppeteer = require('puppeteer');

const logger = require('../utils/logger');

async function startBrowser(){
    let browser;
    try {
        logger.info("[BROWSER] Opening the browser...");
        browser = await puppeteer.launch({
            headless: true,
            args: ["--disable-setuid-sandbox"],
            'ignoreHTTPSErrors': true
        });
    } catch (err) {
        logger.error(`[BROWSER] error`, { ex });
        throw ex;
    }
    return browser;
}

module.exports = {
    startBrowser
};