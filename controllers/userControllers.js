const db = require('../services/db');
const bcrypt = require('bcryptjs');

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, address, phone } = req.body;
    const hashedPassword = await bcrypt.hash(password, 8);

    const sql = 'INSERT INTO users (name, email, password, role, address, phone) VALUES (?, ?, ?, ?, ?, ?)';
    const result = await db.query(sql, [name, email, hashedPassword, role, address, phone]);

    const user = { id: result.insertId, name, email, role, address, phone };
    res.status(201).send({ user });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).send({ error: 'Phone number and OTP are required' });
    }

    // Verify the OTP using Firebase Admin SDK
    const verificationId = req.session.verificationId; // Get this from your OTP verification process
    const credential = auth.PhoneAuthProvider.credential(verificationId, otp);

    // Sign in the user with the credential
    const userCredential = await auth().signInWithCredential(credential);
    const firebaseUser = userCredential.user;

    // Check if the user exists in your database
    const sql = 'SELECT * FROM users WHERE phone = ?';
    const rows = await db.query(sql, [firebaseUser.phoneNumber]);

    let user;
    if (rows.length === 0) {
      // User does not exist in the database, create a new user record
      const newUser = {
        name: 'New User', // You may want to fetch additional details from Firebase user object
        phone: firebaseUser.phoneNumber,
        role: 'user' // Assuming a default role for new users
      };
      const result = await db.query('INSERT INTO users SET ?', newUser);
      newUser.id = result.insertId;
      user = newUser;
    } else {
      // User exists, fetch user data from database
      user = rows[0];
    }

    res.send({ user });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(400).send({ error: error.message });
  }
};

const verifySession = async (req, res) => {
  if (req.session.userId) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const rows = await db.query(sql, [req.session.userId]);

    if (rows.length) {
      const user = rows[0];
      res.send({ isAuthenticated: true, user });
    } else {
      res.send({ isAuthenticated: false });
    }
  } else {
    res.send({ isAuthenticated: false });
  }
};

const getUsers = async (req, res) => {
  try {
    const sql = 'SELECT * FROM users';
    const users = await db.query(sql);
    res.send(users);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

const logoutUser = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send({ error: 'Could not log out, please try again' });
      }
      res.send({ message: 'Logout successful' });
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, address, phone } = req.body;
    const user_id = req.user.id;

    const sql = 'UPDATE users SET name = ?, address = ?, phone = ? WHERE id = ?';
    await db.query(sql, [name, address, phone, user_id]);

    res.send({ message: 'User details updated successfully' });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUsers,
  logoutUser,
  updateUser,
  verifySession
};
