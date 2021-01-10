const mongoose = require('mongoose');

const Schema = require('./mongooseSchema');

const Model = mongoose.model("Currency", Schema);

const Currency = {
    Origin: Model,

    createOrUpdate(data) {
        return Model.updateOne({ name: data.name }, data, { upsert: true });
    },

    getAll() {
        return Model.find();
    },

    deleteByName(name) {
        return Model.findOneAndDelete({ name })
    },

    getByName(name) {
        return Model.findOne({ name });
    }
};

const indexes = [
    Model.collection.createIndex({ name: 1 }, { background: true })
];

Promise.all(indexes).catch((error) => {
    logger.error('Building indexes error', error);
});

module.exports = Currency;