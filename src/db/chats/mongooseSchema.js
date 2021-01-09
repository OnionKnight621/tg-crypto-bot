const mongoose = require('mongoose');

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