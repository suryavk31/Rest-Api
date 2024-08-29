const config = {
    db: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT, 10)
    },
    listPerPage: parseInt(process.env.LIST_PER_PAGE, 10),
    session: {
      secret: process.env.SESSION_SECRET,
      cookie: {
        secure: true, // Set to true if using HTTPS
    httpOnly: true,
    maxAge: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months expiry time
    sameSite: 'strict' // Adjust as needed
      }
    }
  };
  
  module.exports = config;
  