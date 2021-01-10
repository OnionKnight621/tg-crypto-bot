const Joi = require('joi');

const addCurrency = Joi.object().keys({
    name    : Joi.string().required(),
    link    : Joi.string().required(),
    selector: Joi.string().required()
});

module.exports = {
    addCurrency
}