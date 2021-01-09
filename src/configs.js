const path = require('path');
const configs = {};

// app options
configs.appDir = path.resolve(__dirname);
configs.appname = 'telegramCryptoBot';
configs.port = process.env.NODE_ENV || 5555;
configs.appUri = `localhost:${configs.port}`;
configs.mongodbUri = `mongodb://localhost:27017/${configs.appname}`;
configs.mongooseConnectionOptions = {
    useNewUrlParser   : true, 
    useUnifiedTopology: true,
    useFindAndModify  : false
};

// redis
configs.redisPort = process.env.REDIS_PORT || 6379;
configs.redisHost = process.env.REDIS_HOST || 'localhost';
configs.redisPassword = process.env.REDIS_PASSWORD || '';
// configs.redisDb = 0

// tg options
configs.name = '长尸计刀丅口米从仈乂';
configs.username = 'cryptoJMbIXBot';
configs.link = 't.me/cryptoJMbIXBot';
configs.token = '1147822070:AAEX32tj_f5txAUddGq3KO4seOzP5JNyHxE';

// crypto stock exchangers
configs.exchangers = {
    plutusDefi: 'https://coindataflow.com/ru/%D0%BA%D1%80%D0%B8%D0%BF%D1%82%D0%BE%D0%B2%D0%B0%D0%BB%D1%8E%D1%82%D1%8B/plutus-defi'
};

module.exports = configs;