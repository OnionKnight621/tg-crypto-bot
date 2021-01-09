const TelegramBot = require('node-telegram-bot-api');
const { Telegraf } = require('telegraf');
const schedule = require('node-schedule');
const mongoose = require('mongoose');

const configs = require('./configs');
const User = require('./chats/model');
const logger = require('./utils/logger');
const scrap = require('./services/scraper');

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

bot.command('get', async (ctx) => {
  scrap('https://coindataflow.com/ru/%D0%BA%D1%80%D0%B8%D0%BF%D1%82%D0%BE%D0%B2%D0%B0%D0%BB%D1%8E%D1%82%D1%8B/plutus-defi', 'prefer-nav__left--price')
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