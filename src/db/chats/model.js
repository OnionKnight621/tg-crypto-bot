const mongoose = require('mongoose');

const Schema = require('./mongooseSchema');

const Model = mongoose.model("Chat", Schema);

const Chat = {
    Origin: Model,

    createOrUpdate(data) {
        return Model.updateOne({ chatId: data.chatId }, data, { upsert: true });
    },

    getAll() {
        return Model.find();
    },

    getSubscribed() {
        return Model.find({ subscribed: true });
    },

    get(chatId) {
        return Model.findOne({chatId});
    },

    deleteByChatId(chatId) {
        return Model.findOneAndDelete({ chatId })
    }
};

const indexes = [
    Model.collection.createIndex({ chatId: 1 }, { background: true }),
    Model.collection.createIndex({ username: 1 }, { background: true })
];

Promise.all(indexes).catch((error) => {
    logger.error('Building indexes error', error);
});

module.exports = Chat;