// sessionStore.js
const Sequelize = require('sequelize');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const config = require('./config'); // Adjust path as necessary

const sequelize = new Sequelize(config.db.database, config.db.user, config.db.password, {
  host: config.db.host,
  dialect: 'mysql',
  logging: false, // Disable logging for Sequelize operations if not needed
});

const sessionStore = new SequelizeStore({
  db: sequelize,
  expiration: 24 * 60 * 60 * 1000, // Session expiry in milliseconds (optional)
});

// Sync the session store with the database schema
sessionStore.sync();

module.exports = {
  sessionStore,
  sequelize,
};
