const mongoose = require('mongoose');

const Schema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },

        link: {
            type: String,
            required: true
        },

        selector: {
            type: String,
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