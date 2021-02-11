const Joi = require('joi');

const addCurrency = Joi.object().keys({
    name         : Joi.string().required(),
    link         : Joi.string().uri().required(),
    selector     : Joi.string().required(),
    exchangeStock: Joi.string()
});

module.exports = {
    addCurrency
}