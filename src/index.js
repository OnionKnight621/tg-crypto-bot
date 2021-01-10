const { Telegraf } = require('telegraf');
const schedule = require('node-schedule');
const mongoose = require('mongoose');
const moment = require('moment');

const configs = require('./configs');
const User = require('./db/chats/model');
const Currency = require('./db/currencies/model');
const logger = require('./utils/logger');
const scrap = require('./services/scraper');

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

bot.start((ctx) => {
  logger.info(`[START] [id ${ctx.message.chat.id}, username ${ctx.message.chat.username}]`)
  return ctx.reply('Dorou. Commands: /help, /subscribe, /unsubscribe, /getall, /getlist, /add, /get')
});

bot.use((ctx, next) => {
  logger.info(`[MESSAGE] "${ctx.message.text}" [id ${ctx.message.chat.id}, username ${ctx.message.chat.username}]`)
  return next();
});

bot.help((ctx) => {
  logger.info(`[HELP] [id ${ctx.message.chat.id}, username ${ctx.message.chat.username}]`)
  return ctx.reply('Some help message!')
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
    return ctx.reply('Nu i sjerdalaj!');
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

  const name = inputString.slice(wIndices[0], wIndices[1] + 1);
  const link = inputString.slice(wIndices[1], wIndices[2] + 1);
  const selector = inputString.slice(wIndices[2], wIndices[wIndices.length]);

  try {
    await Currency.createOrUpdate({ name, link, selector });
    logger.info(`[ADD] Successfully added [id ${ctx.message.chat.id}, username ${ctx.message.chat.username}]`);
    return ctx.reply(`Added new currency ${name}`);
  } catch (ex) {
    logger.error('[ADD] currency error', { ex });
    return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
  }
});

bot.command('getlist', async (ctx) => {
  try {
    const currencies = await Currency.getAll();
    logger.info(`[GET LIST] Succesfully got list [id ${ctx.message.chat.id}, username ${ctx.message.chat.username}]`);
    return ctx.reply(`List: ${JSON.stringify(currencies, null, ' ')}`);
  } catch (ex) {
    logger.error(`[GET LIST] error`, { ex });
    return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
  }
})

// bot.hears('hi', (ctx) => ctx.reply('Hey there'));

schedule.scheduleJob('0 */1 * * * *', async function(){
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