const express = require("express");
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require("cors");
require("dotenv").config();
const admin = require("firebase-admin");
const serviceAccount = require("./firebase/appuser-96f18-firebase-adminsdk-cp7ap-831b7e58d4.json")
const firebase = require("firebase/app");
require("firebase/auth");
const config = require('./config'); // Make sure the path is correct

// Firebase client config
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};
firebase.initializeApp(firebaseConfig);

// Import routers
const productRouter = require("./routes/productRoutes");
const categoriesRouter = require('./routes/categoryRoutes');
const subCategoryRouter = require("./routes/subCategoryRoutes");
const subSubCategoryRouter = require("./routes/subSubCategoryRoutes");
const bannerRouter = require("./routes/bannerRoutes")
const userRouter = require('./routes/userRoutes');
const orderRouter = require('./routes/orderRoutes');
const cartRouter = require('./routes/cartRoutes');
const wishlistRouter = require('./routes/wishlistRoutes');
const { auth, authorizeRoles } = require('./middleware/auth');
const geocodeController = require('./controllers/geocodeController');
const autocompleteController = require('./controllers/autocompleteController');
const placeDetailsController = require('./controllers/placeDetailsController');
const storeRoutes = require('./routes/storeRoutes');
const locationRouter = require('./routes/locationRoutes');
const productPricesRouter = require('./routes/productPricesRoutes');
const subStoreRouter = require("./routes/subStoreRoutes");
const adminDetailsRouter = require("./routes/adminDetailsRoutes")


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://appuser-96f18-default-rtdb.firebaseio.com/"
});

// MySQL session store configuration
const sessionStore = new MySQLStore({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  clearExpired: true,
  checkExpirationInterval: 900000, // Check every 15 minutes
  expiration: config.session.cookie.maxAge, // Session expiry time
  createDatabaseTable: true, // Ensure the sessions table is automatically created if not exists
  schema: {
      tableName: 'sessions',
      columnNames: {
          session_id: 'session_id', // Specify the correct column name here
          expires: 'expires',
          data: 'data'
      }
  }
});

const app = express();
const port = 4000;

app.set('trust proxy', 1); // Add this line to trust the first proxy

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS with credentials
app.use(cors({
  origin: ['http://localhost:3000', 'https://www.vivimart.in'], // Allow both localhost and the live site
  credentials: true,
  methods: 'GET,POST,PUT,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type,Authorization'
}));

// Session middleware
app.use(session({
  secret: config.session.secret,
  resave: true,
  saveUninitialized: true,
  store: sessionStore,
  cookie: config.session.cookie
}));

// Test route
app.get("/", (req, res) => {
  res.json({ message: "ok" });
});

// Authentication-protected routes
app.use('/api/orders', orderRouter);
app.use('/api/cart', auth, cartRouter);
app.use('/api/wishlist', auth, wishlistRouter);

// Public routes
app.use("/api/products", productRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/banners', bannerRouter)
app.use("/api/sub-categories", subCategoryRouter);
app.use("/api/sub-sub-categories", subSubCategoryRouter);
app.use('/api/users', userRouter);
app.use('/api/stores', storeRoutes);
app.use('/api/locations', locationRouter)
app.use('/api/product-prices', productPricesRouter)
app.use("/api/sub-stores", subStoreRouter);
app.use("/api/admin-details", adminDetailsRouter)

// Geo location routes
app.get('/api/geocode', (req, res) => geocodeController.getGeocode(req, res, process.env.GOOGLE_LOCATION_API_KEY));

// Define the autocomplete endpoint
app.get('/api/autocomplete', (req, res) => autocompleteController.getAutocomplete(req, res, process.env.GOOGLE_LOCATION_API_KEY));
app.get('/api/place-details', async (req, res) => {
  const { place_id } = req.query;

  try {
    const placeDetails = await placeDetailsController.getPlaceDetails(place_id, process.env.GOOGLE_LOCATION_API_KEY);
    res.json(placeDetails);
  } catch (error) {
    console.error('Error in /api/place-details:', error);
    res.status(500).json({ error: 'Failed to fetch place details' });
  }
});

app.post("/api/notify", async (req, res) => {
  const { token, title, body } = req.body;

  const message = {
    notification: {
      title: title,
      body: body
    },
    token: token
  }
  try {
    const response = await admin.messaging().send(message);
    res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Firebase OTP verification
// Send OTP
app.post('/api/send-otp', async (req, res) => {
  const { phoneNumber } = req.body;
  
  console.log("Phone number submitted:", phoneNumber); // Log the submitted phone number

  try {
    // Use Firebase Admin SDK to create a custom token for the phone number
    const customToken = await admin.auth().createCustomToken(phoneNumber);
    
    console.log("Custom token generated:", customToken); // Log the custom token

    // Send the custom token to the client
    res.status(200).json({ customToken });
    console.log("OTP sent successfully to:", phoneNumber); // Log successful OTP sending
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP
app.post("/api/verify-otp", async (req, res) => {
  const { idToken } = req.body;

  try {
    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const phoneNumber = decodedToken.phone_number;

    // Check if the user exists in your database
    const [rows] = await db.query("SELECT * FROM users WHERE phone = ?", [phoneNumber]);

    let user;
    if (rows.length) {
      user = rows[0];
    } else {
      // Create a new user if not exists
      const result = await db.query("INSERT INTO users (phone) VALUES (?)", [phoneNumber]);
      user = { id: result.insertId, phone: phoneNumber };
    }

    // Regenerate session and set user information
    req.session.regenerate((err) => {
      if (err) {
        console.error("Error regenerating session:", err);
        return res.status(500).send({ error: "Internal server error" });
      }
      req.session.userId = user.id;
      req.session.userRole = user.role;
      res.send({ user });
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(err.message, err.stack);
  res.status(statusCode).json({ message: err.message });
});

app.listen(port, () => {
  console.log(`Vivimart listening at http://localhost:${port}`);
});
