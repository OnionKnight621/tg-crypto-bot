const { Telegraf } = require('telegraf');
const {performance} = require('perf_hooks');
// const { Router, session } = Telegraf;
const schedule = require('node-schedule');
const mongoose = require('mongoose');
const express = require('express');
const request = require('request');
const expressApp = express();

const configs = require('./configs');
const User = require('./db/chats/model');
const Currency = require('./db/currencies/model');
const logger = require('./utils/logger');
// const scrapper = require('./services/scraperNightmare');
const webBrowser = require('./services/webBrowser');
const pageController = require('./services/pageController');
const joiValidate = require('./utils/joiValidate');
const currenciesJoiSchema = require('./joiSchemes/currency').addCurrency;
const createUserJoiSchema = require('./joiSchemes/user').createUser;

async function scrapCurrency(link, selector) {
    // old
    // try {
    //   return await scrap(link, selector);
    // } catch (ex) {
    //   logger.error(`[SCRAP] err `, { ex });
    //   throw ex;
    // }

    let browserInstance = webBrowser.startBrowser();
    return pageController(browserInstance, link, selector);
}

const bot = new Telegraf(configs.token);

// seems no need
// bot.telegram.setWebhook(`${configs.appUri}/bot${configs.token}`);
// expressApp.use(bot.webhookCallback(`/bot${configs.token}`));

const mongodbUri = configs.mongodbUri;

mongoose.connect(mongodbUri, configs.mongooseConnectionOptions)
    .then(() => logger.info("[DB] Connected to mongodb..."))
    .catch(err => logger.error(`[DB] Could not connect to mongodb... [${err}]`));

bot.use((ctx, next) => {
    if (ctx.message) {
        logger.info(`[MESSAGE] "${ctx.message.text}" [id ${ctx.chat.id}, username ${ctx.chat.username}]`);
    } else if (ctx.update.callback_query.data) { // if action triggered
        logger.info(`[ACTION] "${ctx.update.callback_query.data}" [id ${ctx.chat.id}, username ${ctx.chat.username}]`);
        ctx.update.callback_query.options = ctx.update.callback_query.data.split(' ')[1];
        ctx.update.callback_query.data = ctx.update.callback_query.data.split(' ')[0];
    } else {
        logger.info('Smth strange', {c: ctx.message});
    }
    return next();
});

bot.start(async (ctx) => {
    const payload = {
        chatId  : ctx.chat.id,
        name    : ctx.chat.first_name,
        username: ctx.chat.username 
    };
    let options;
    try {
        options = await joiValidate(payload, createUserJoiSchema);
    } catch (ex) {
        logger.error('[ADD] currency validation error', ex);
        return ctx.reply(`[ADD] Validation error: ${ex}`);
    }
    try {
        await User.createOrUpdate(options);
        logger.info(`[START] created user [id ${ctx.chat.id}, username ${ctx.chat.username}]`);
    } catch (ex) {
        logger.error(`[START] create user error [id ${ctx.chat.id}, username ${ctx.chat.username}]`, { ex });
    }

    return ctx.reply('Dorou. Commands: /help, /subscribe, /unsubscribe, /getall, /getlist, /add, /get')
});

bot.help((ctx) => {
    logger.info(`[HELP] [id ${ctx.chat.id}, username ${ctx.chat.username}]`)
    return ctx.reply(`Commands usage:
    /subscribe, /unsubscribe - to scheduled messages
    /getall - get all valid currencies from DB
    /getlist - get full list of currencies
    /getnames - get full list of currencies names
    /add [name] [link] [selectors] - add custom currency ('name' and 'link' params should be without whitespaces but whitespaces allowed for 'selectors' param).
    /get [name] - get currency value`);
});

bot.command('subscribe', async (ctx) => {
    try {
        await User.createOrUpdate({ chatId: ctx.chat.id, subscribed: true, updatedAt: new Date() });
        logger.info(`[SUBSCRIBE] succesfully subscribed [id ${ctx.chat.id}, username ${ctx.chat.username}]`);
        return ctx.reply('Малаца');
    } catch (ex) {
        logger.error(`[SUBSCRIBE] error [id ${ctx.chat.id}, username ${ctx.chat.username}]`, { ex });
        return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
    }
});

bot.command('unsubscribe', async (ctx) => {
    try {
        await User.createOrUpdate({ chatId: ctx.chat.id, subscribed: false, updatedAt: new Date() });
        logger.info(`[UNSUBSCRIBE] succesfully unsubscribed [id ${ctx.chat.id}, username ${ctx.chat.username}]`);
        return ctx.reply('Nu i spierdalaj!');
    } catch (ex) {
        logger.error(`[UNSUBSCRIBE] error [id ${ctx.chat.id}, username ${ctx.chat.username}]`, { ex });
        return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
    }
});

bot.command('getall', async (ctx) => {
    const t0 = performance.now();
    let currencies;
    try {
        currencies = await Currency.getAll();
    } catch (ex) {
        logger.error(`[GET ALL] get currencies error [id ${ctx.chat.id}, username ${ctx.chat.username}]`, { ex });
        return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
    }

    ctx.reply('Scrapping...');

    let message = `Currencies:
    `;

    if (currencies.length) {
        for (const currency of currencies) {
            let value;
            try {
                value = await scrapCurrency(currency.link, currency.selector);
            } catch (ex) {
                logger.error(`[GET ALL] scrap error [id ${ctx.chat.id}, username ${ctx.chat.username}]`, { ex });
                throw ex;
            }
            message += `- <b><a href="${currency.link}">${currency.name}</a></b>: ${currency.lastPrice} -> ${value} 
    `; //shit, but needed for formatting
        }
        ctx.reply(message, {parse_mode: 'HTML'});
    }

    const t1 = performance.now();
    logger.info(`[GET ALL] [id ${ctx.chat.id}, username ${ctx.chat.username}], spent ${Number((t1 - t0) / 1000).toFixed(2)}`);
    return;
});

bot.command('add', async (ctx) => {
    const re = /[\d\w\.]{3,}\//gmi;
    const inputString = ctx.message.text.trim();
    const wIndices = [];

    if (inputString === '/add') {
        logger.info(`[ADD] No params inside add [id ${ctx.chat.id}, username ${ctx.chat.username}]`);
        return ctx.reply(`Specify params for currency`); 
    }

    for (let i = 0; i < inputString.length; i++) {
        if (inputString[i] === ' ') {
            wIndices.push(i);
        }
    }

    if (wIndices.length < 3) {
        logger.error('[ADD] currency validation error: not enough params');
        return ctx.reply(`Validation error: Not enough params`);
    }

    const payload = {
        name         : inputString.slice(wIndices[0] + 1, wIndices[1]),
        link         : encodeURI(inputString.slice(wIndices[1] + 1, wIndices[2])),
        selector     : inputString.slice(wIndices[2] + 1, wIndices[wIndices.length]),
        exchangeStock: inputString.slice(wIndices[1] + 1, wIndices[2]).match(re)[0]
    }

    let options;
    try {
        options = await joiValidate(payload, currenciesJoiSchema);
    } catch (ex) {
        logger.error('[ADD] currency validation error', ex);
        return ctx.reply(`[ADD] Validation error: ${ex}`);
    }

    try {
        await Currency.createOrUpdate(options);
        logger.info(`[ADD] Successfully added [id ${ctx.chat.id}, username ${ctx.chat.username}]`);
        return ctx.reply(`Added new currency ${options.name}`);
    } catch (ex) {
        logger.error('[ADD] currency store error', ex);
        return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
    }
});

bot.command('get', async (ctx) => {
    const inputString = ctx.message.text.trim();
    const name = inputString.split(' ')[1];
    let currency;

    if (!name) {
        logger.info(`[GET] no name [id ${ctx.chat.id}, username ${ctx.chat.username}]`);
        return ctx.reply(`Specify currency name`);
    }

    try {
        currency = await Currency.getByName(name);
        logger.info(`[GET] Successfully got ${name} [id ${ctx.chat.id}, username ${ctx.chat.username}]`);
    } catch (ex) {
        logger.error('[GET] get currency error', ex);
        return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
    }

    if (currency) {
        let value;
        ctx.reply('Scrapping...');
        try {
            value = await scrapCurrency(currency.link, currency.selector);
        } catch (ex) {
            logger.error(`[GET] scrap error [id ${ctx.chat.id}, username ${ctx.chat.username}]`, { ex });
            throw ex;
        }
        logger.info(`[GET] ${currency.name} currency value succesfully got`);
        return ctx.reply(`<b><a href="${currency.link}">${currency.name}</a></b>: ${currency.lastPrice} -> ${value}`, {parse_mode: 'HTML'});
    }

    return ctx.reply(`No such currency inside DB`);
});

bot.action('get', async (ctx) => {
    const name = ctx.update.callback_query.options;
    let currency;

    if (!name) {
        logger.info(`[GET] no name [id ${ctx.chat.id}, username ${ctx.chat.username}]`);
        return ctx.reply(`Specify currency name`);
    }

    try {
        currency = await Currency.getByName(name);
    } catch (ex) {
        logger.error('[GET] get currency error', ex);
        return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
    }

    if (currency) {
        let value;
        ctx.reply('Scrapping...');
        try {
            value = await scrapCurrency(currency.link, currency.selector);
        } catch (ex) {
            logger.error(`[GET] scrap error [id ${ctx.chat.id}, username ${ctx.chat.username}]`, { ex });
            throw ex;
        }
        logger.info(`[GET] ${currency.name} currency value succesfully got`);
        return ctx.reply(`<b><a href="${currency.link}">${currency.name}</a></b>: ${currency.lastPrice} -> ${value}`, {parse_mode: 'HTML'});
    };

    return ctx.reply(`No such currency inside DB`);
});

bot.command('getlist', async (ctx) => {
    try {
        const currencies = await Currency.getAll();
        let message = `List:
        `;
        currencies.forEach(item => {
            message += `- <b>${item.name}</b>, selector: ${item.selector}, <a href="${item.link}">link</a>
        `;
        });
        logger.info(`[GET LIST] Succesfully got list [id ${ctx.chat.id}, username ${ctx.chat.username}]`);
        return ctx.reply(message,  {parse_mode: 'HTML'});
    } catch (ex) {
        logger.error(`[GET LIST] error`, { ex });
        return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
    }
});

bot.command('getnames', async (ctx) => {
    try {
        const currencies = await Currency.getAll();

        const inlineKeyboardArr = [];
        let lineArray = [];
        for (let i = 0; i < currencies.length; i++) {
            if (lineArray.length >= 3 || i === currencies.length - 1) {
                lineArray.push({text: currencies[i].name, callback_data: `get ${currencies[i].name}`});
                inlineKeyboardArr.push(lineArray);
                lineArray = [];
            } else {
                lineArray.push({text: currencies[i].name, callback_data: `get ${currencies[i].name}`});
            }
        }

        logger.info(`[GET NAMES] Succesfully got list of names [id ${ctx.chat.id}, username ${ctx.chat.username}]`);
        return ctx.reply('All available currencies', {
            reply_markup: {
                inline_keyboard:[...inlineKeyboardArr]
            }
        });
    } catch (ex) {
        logger.error(`[GET NAMES] error`, { ex });
        return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
    }
});

bot.hears('ping', (ctx) => ctx.reply('pong'));

schedule.scheduleJob('0 0 */1 * * *', async function() {
    let currencies;
    let subscribed;
    try {
        currencies = await Currency.getAll();
    } catch (ex) {
        logger.error(`[GET ALL] get currencies error [id ${ctx.chat.id}, username ${ctx.chat.username}]`, { ex });
        return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
    }

    let message = `Currencies:
    `;

    if (currencies.length) {
        for (const currency of currencies) {
            let value;
            try {
                value = await scrapCurrency(currency.link, currency.selector);
            } catch (ex) {
                logger.error(`[SCHEDULER] scrap error `, { ex });
            }
            message += `- <b><a href="${currency.link}">${currency.name}</a></b>: ${currency.lastPrice} -> ${value} 
    `; //shit, but needed for formatting

            try {
                await Currency.createOrUpdate({
                    name: currency.name,
                    lastPrice: value
                })
            } catch (ex) {
                logger.error(`[GET ALL] save value error [id ${ctx.chat.id}, username ${ctx.chat.username}]`, { ex });
                throw ex;
            }
        }
    }

    try {
        subscribed = await User.getSubscribed();
    } catch (ex) {
        logger.error(`[GET ALL] get subscribed error [id ${ctx.chat.id}, username ${ctx.chat.username}]`, { ex });
        return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
    }

    if (subscribed.length) {
        for (const sub of subscribed) {
            bot.telegram.sendMessage(sub.chatId, message, {parse_mode: 'HTML'});
        }
    }

    logger.info(`[SCHEDULER] ping`)
});

schedule.scheduleJob('0 */5 * * * *', async function() {
    request('https://tg-pinger.herokuapp.com/', function (error, response, body) {
        if (error) {
            console.log(error);
            return;
        }
        console.log('Ping. Res: ', response && response.statusCode);
    });
});

bot.launch();

expressApp.get('/', (req, res) => {
    res.send(`Server is running on ${configs.port}`);
    logger.info('pinged');
});

expressApp.get('/ping', (req, res) => {
    res.send('pong');
    logger.info('ponged');
});

expressApp.listen(configs.port, () => {
    logger.info(`Server is running on ${configs.port}`);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

