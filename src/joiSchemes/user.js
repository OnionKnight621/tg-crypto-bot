const Joi = require('joi');
const roles = require('../constants').USER_ROLES;

const createUser = Joi.object().keys({
    chatId    : Joi.number().required(),
    name      : Joi.string().required(),
    username  : Joi.string().required(),
    subscribed: Joi.boolean().default(false),
    role      : Joi.string().default(roles.USER),
    createdAt : Joi.date().default(new Date()),
    updatedAt : Joi.date().default(new Date())
});

module.exports = {
    createUser
}