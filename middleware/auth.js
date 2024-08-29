const db = require('../services/db');

// Middleware to authenticate using Session
const auth = async (req, res, next) => {
  try {
    console.log('Session:', req.session);
    if (req.session && req.session.userId) {
      const sql = 'SELECT * FROM users WHERE id = ?';
      const rows = await db.query(sql, [req.session.userId]);

      if (!rows.length) {
        throw new Error('Session user ID not found in database');
      }

      req.user = rows[0];
      console.log('Authenticated user:', req.user);
      next();
    } else {
      throw new Error('Authorization header or session not found');
    }
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(401).send({ error: 'Please authenticate.' });
  }
};

// Middleware to authorize roles
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).send({ error: 'Access denied.' });
    }
    next();
  };
};

module.exports = {
  auth,
  authorizeRoles,
};
