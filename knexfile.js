// Update with your config settings.

require('@babel/register');
const config = require('config').knex;

module.exports = {
	development: config,
	staging: config,
	testing: config,
	production: config,
};
