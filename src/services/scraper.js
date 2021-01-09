const {performance} = require('perf_hooks');
const fs = require('fs');
const Nightmare = require('nightmare');
const cheerio = require('cheerio');
const axios = require('axios').default;

async function scrapper(uri, selectors) {
    const t0 = performance.now();

    const nightmare = Nightmare({show: true});

    await nightmare.goto(uri)
        .wait(10)
        .wait('body')
        .evaluate(() => {
            console.log(11)
            return document.body.innerHTML;
        })
        // .end()
        .then(res => {
            nightmare.end()
            console.log(res, 12)
            getData(res)
        })
        .catch(err => console.log({err}));

    let getData = html => {
        console.log(html)
        return 112;
    }

    const t1 = performance.now();
    console.log(`Time spent: ${Number((t1 - t0) / 1000).toFixed(2)}`);
    return r;
    // process.exit(0);
}

module.exports = scrapper;