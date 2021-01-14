const { Telegraf } = require('telegraf');
const { Router, session } = Telegraf;
const schedule = require('node-schedule');
const mongoose = require('mongoose');
const moment = require('moment');

const configs = require('./configs');
const User = require('./db/chats/model');
const Currency = require('./db/currencies/model');
const logger = require('./utils/logger');
const scrap = require('./services/scraper');
const joiValidate = require('./utils/joiValidate');
const currenciesJoiSchema = require('./joiSchemes/currency').addCurrency;

// get plutus defi from https://coindataflow.com/ru
async function getPlutus() {
  return await scrap(configs.exchangers.plutusDefi, '.details-price span');
}

async function scrapCurrency(link, selector) {
  return await scrap(link, selector);
}

const bot = new Telegraf(configs.token);

const mongodbUri = configs.mongodbUri;

mongoose.connect(mongodbUri, configs.mongooseConnectionOptions)
    .then(() => logger.info("[DB] Connected to mongodb..."))
    .catch(err => logger.error(`[DB] Could not connect to mongodb... [${err}]`));

// some shit
bot.use(session({
  makeKey: (ctx) => ctx.from?.id
}));

bot.use((ctx, next) => {
  if (ctx.message) {
    logger.info(`[MESSAGE] "${ctx.message.text}" [id ${ctx.chat.id}, username ${ctx.chat.username}]`);
  } else {
    if (ctx.update.callback_query.data) {
      logger.info(`[ACTION] "${ctx.update.callback_query.data}" [id ${ctx.chat.id}, username ${ctx.chat.username}]`);
      ctx.update.callback_query.options = ctx.update.callback_query.data.split(' ')[1];
      ctx.update.callback_query.data = ctx.update.callback_query.data.split(' ')[0];
    } else {
      logger.info('Smth strange', {c: ctx.message});
    }
  }
  return next();
});

bot.start((ctx) => {
  logger.info(`[START] [id ${ctx.message.chat.id}, username ${ctx.message.chat.username}]`)

  return ctx.reply('Dorou. Commands: /help, /subscribe, /unsubscribe, /getall, /getlist, /add, /get')
});

bot.help((ctx) => {
  logger.info(`[HELP] [id ${ctx.message.chat.id}, username ${ctx.message.chat.username}]`)
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
    await User.createOrUpdate({
      chatId  : ctx.message.chat.id,
      name    : ctx.message.chat.first_name,
      username: ctx.message.chat.username 
    });
    logger.info(`[SUBSCRIBE] succesfully subscribed [id ${ctx.message.chat.id}, username ${ctx.message.chat.username}]`);
    return ctx.reply('Малаца');
  } catch (ex) {
    logger.error(`[SUBSCRIBE] error [id ${ctx.message.chat.id}, username ${ctx.message.chat.username}]`, { ex });
    return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
  }
});

bot.command('unsubscribe', async (ctx) => {
  try {
    await User.deleteByChatId(ctx.message.chat.id);
    logger.info(`[UNSUBSCRIBE] succesfully unsubscribed [id ${ctx.message.chat.id}, username ${ctx.message.chat.username}]`);
    return ctx.reply('Nu i spierdalaj!');
  } catch (ex) {
    logger.error(`[UNSUBSCRIBE] error [id ${ctx.message.chat.id}, username ${ctx.message.chat.username}]`, { ex });
    return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
  }
});

bot.command('getall', async (ctx) => {
  const value = await getPlutus();
  logger.info(`[GET ALL] [id ${ctx.message.chat.id}, username ${ctx.message.chat.username}]`);
  return ctx.reply(`Plutus DeFi current price: ${value} | time: ${moment().format()} | link: ${configs.exchangers.plutusDefi}`);
});

bot.command('add', async (ctx) => {
  const inputString = ctx.message.text.trim();
  const wIndices = [];

  if (inputString === '/add') {
    logger.info(`[ADD] No params inside add [id ${ctx.message.chat.id}, username ${ctx.message.chat.username}]`);
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
    name: inputString.slice(wIndices[0] + 1, wIndices[1]),
    link: inputString.slice(wIndices[1] + 1, wIndices[2]),
    selector: inputString.slice(wIndices[2] + 1, wIndices[wIndices.length])
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
    logger.info(`[ADD] Successfully added [id ${ctx.message.chat.id}, username ${ctx.message.chat.username}]`);
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
    logger.info(`[GET] no name [id ${ctx.message.chat.id}, username ${ctx.message.chat.username}]`);
    return ctx.reply(`Specify currency name`);
  }

  try {
    currency = await Currency.getByName(name);
    logger.info(`[GET] Successfully got ${name} [id ${ctx.message.chat.id}, username ${ctx.message.chat.username}]`);
  } catch (ex) {
    logger.error('[GET] get currency error', ex);
    return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
  }

  if (currency) {
    const value = await scrapCurrency(currency.link, currency.selector);
    logger.info(`[GET] ${currency.name} currency value succesfully got`);
    return ctx.reply(`${currency.name}: ${value}`);
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

  console.log(name)

  try {
    currency = await Currency.getByName(name);
    logger.info(`[GET] Successfully got ${name} [id ${ctx.chat.id}, username ${ctx.chat.username}]`);
  } catch (ex) {
    logger.error('[GET] get currency error', ex);
    return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
  }

  if (currency) {
    const value = await scrapCurrency(currency.link, currency.selector);
    logger.info(`[GET] ${currency.name} currency value succesfully got`);
    return ctx.reply(`${currency.name}: ${value}`);
  };

  return ctx.reply(`No such currency inside DB`);
})

bot.command('getlist', async (ctx) => {
  try {
    const currencies = await Currency.getAll();
    const formatted = currencies.map((item) => {
      return {
        name: item.name,
        link: item.link,
        selectors: item.selector,
        date: item.createdAt
      }
    })
    logger.info(`[GET LIST] Succesfully got list [id ${ctx.message.chat.id}, username ${ctx.message.chat.username}]`);
    return ctx.reply(`List: ${JSON.stringify(formatted, null, ' ')}`);
  } catch (ex) {
    logger.error(`[GET LIST] error`, { ex });
    return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
  }
});

bot.command('getnames', async (ctx) => {
  try {
    const currencies = await Currency.getAll();
    const formatted = currencies.map((item) => {
      return {text: item.name, callback_data: `get ${item.name}`}
      // return {text: `/get ${item.name}`}
    });
    logger.info(`[GET LIST] Succesfully got list of names [id ${ctx.message.chat.id}, username ${ctx.message.chat.username}]`);
    return ctx.reply(`List`, {
      reply_markup: {
        inline_keyboard:[formatted]
      }
    });
  } catch (ex) {
    logger.error(`[GET LIST] error`, { ex });
    return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
  }
});

bot.hears('ping', (ctx) => ctx.reply('pong'));

schedule.scheduleJob('0 */5 * * * *', async function(){
  try {
    // const users = await User.getAll();
    // if (users.length) {
    //   for(const user of users) {
    //     bot.telegram.sendMessage(user.chatId, 'scheduled phrase `волк не тот, кто ночью выл, а тот, кто за собой парашу смыл`');
    //   }
    // }
    logger.info('[SCHEDULER] Scheduler ping');
  } catch (ex) {
    logger.error('SCheduled error', { ex });
    throw ex;
  }
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))