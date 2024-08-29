const storeAuth = async (req, res, next) => {
    try {
      console.log('Session:', req.session);
      if (req.session && req.session.userId) {
        const sql = 'SELECT * FROM stores WHERE id = ?';
        const rows = await db.query(sql, [req.session.userId]);
  
        if (!rows.length) {
          throw new Error('Session store ID not found in database');
        }
  
        req.store = rows[0];
        console.log('Authenticated store:', req.store);
        next();
      } else {
        throw new Error('Authorization header or session not found');
      }
    } catch (error) {
      console.error('Authentication error:', error.message);
      res.status(401).send({ error: 'Please authenticate.' });
    }
  };
  
  module.exports = {
    storeAuth,
  };
  