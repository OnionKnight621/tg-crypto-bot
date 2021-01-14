const mongoose = require('mongoose');
const roles = require('../../constants').USER_ROLES;

const Schema = new mongoose.Schema(
    {
        chatId: {
            type    : String,
            required: true
        },

        name: {
            type    : String,
            required: true
        },
    
        username: {
            type    : String,
            required: true
        },

        role: {
            type: String,
            default: roles.USER,
            enum: Object.values(roles)
        },

        subscribed: {
            type: Boolean,
            default: false
        },

        updatedAt: {
            type   : Date,
            default: Date.now
        },

        createdAt: {
            type   : Date,
            default: Date.now
        }
    }
);

module.exports = Schema;