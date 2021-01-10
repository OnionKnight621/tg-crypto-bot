const scrap = require('../services/scraper');

const configs = require('../configs');

// get plutus defi from https://coindataflow.com/ru
async function getPlutus() {
    return await scrap(configs.exchangers.plutusDefi, '.details-price span');
}
  
async function scrapCurrency(link, selector) {
    return await scrap(link, selector);
}

