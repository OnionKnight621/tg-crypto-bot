const { Telegraf } = require('telegraf');
const schedule = require('node-schedule');
const mongoose = require('mongoose');
const moment = require('moment');

const configs = require('./configs');
const User = require('./chats/model');
const logger = require('./utils/logger');
const scrap = require('./services/scraper');

// get plutus defi from https://coindataflow.com/ru
async function getPlutus() {
  return await scrap(configs.exchangers.plutusDefi, '.details-price span');
}

const bot = new Telegraf(configs.token);

const mongodbUri = configs.mongodbUri;

mongoose.connect(mongodbUri, configs.mongooseConnectionOptions)
    .then(() => logger.info("Connected to mongodb..."))
    .catch(err => logger.error(`Could not connect to mongodb... [${err}]`));

bot.start((ctx) => {
  return ctx.reply('Dorou. Commands: /help, /subscribe, /unsubscribe')
});

bot.use((ctx, next) => {
  logger.info(`message "${ctx.message.text}", id ${ctx.message.chat.id}, username ${ctx.message.chat.username}`)
  return next();
});

bot.help((ctx) => {
  return ctx.reply('Пашол нахуй!')
});

bot.command('subscribe', async (ctx) => {
  try {
    await User.createOrUpdate({
      chatId  : ctx.message.chat.id,
      name    : ctx.message.chat.first_name,
      username: ctx.message.chat.username 
    });
    logger.info(`subscribed, id ${ctx.message.chat.id}, username ${ctx.message.chat.username}`);
    return ctx.reply('Малаца');
  } catch (ex) {
    logger.error('Subscribe error', { ex });
    return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
  }
});

bot.command('unsubscribe', async (ctx) => {
  try {
    await User.deleteByChatId(ctx.message.chat.id);
    logger.info(`unsubscribed, id ${ctx.message.chat.id}, username ${ctx.message.chat.username}`);
    return ctx.reply('Да пошел ты нахой!');
  } catch (ex) {
    logger.error('Subscribe error', { ex });
    return ctx.reply(`Smth went wrong: ${JSON.stringify(ex, null, ' ')}`);
  }
});

bot.command('getall', async (ctx) => {
  const value = await getPlutus();
  return ctx.reply(`Plutus DeFi current price: ${value} | time: ${moment().format()} | link: ${configs.exchangers.plutusDefi}`);
});

// bot.hears('hi', (ctx) => ctx.reply('Hey there'));

schedule.scheduleJob('0 */5 * * * *', async function(){
  try {
    const users = await User.getAll();
    if (users.length) {
      for(const user of users) {
        bot.telegram.sendMessage(user.chatId, 'scheduled phrase `волк не тот, кто ночью выл, а тот, кто за собой парашу смыл`');
      }
    }
    logger.info('Scheduler ping');
  } catch (ex) {
    logger.error('Subscribe error', { ex });
    throw ex;
  }
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))