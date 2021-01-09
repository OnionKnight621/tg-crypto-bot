const colors = require('colors');
const moment = require('moment');

function info(message, options) {
    console.log(`${colors.cyan(moment().format())} - ${colors.blue(`INFO:`)} ${message} ${JSON.stringify(options, null, ' ') || ''}`);
}

function error(message, options) {
    console.log(`${colors.cyan(moment().format())} - ${colors.red(`ERROR:`)} ${message} ${JSON.stringify(options, null, ' ') || ''}`);
}

module.exports = {
    info,
    error
};