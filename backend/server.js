const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Try to load from .env or .env.local
dotenv.config(); 
dotenv.config({ path: '.env.local' });

const app = express();

// Trust proxy (Required for Render/Heroku SSL termination)
app.set('trust proxy', 1);

// Middleware
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: allowedOrigin, 
  credentials: true 
}));
app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// DB Connection
const connectDB = async () => {
    try {
        if (!MONGO_URI) {
            throw new Error("MONGO_URI is missing in environment variables");
        }
        await mongoose.connect(MONGO_URI);
        console.log("✅ MongoDB Connected: ZeroLeak");
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
        process.exit(1);
    }
};

// Routes
app.get('/', (req, res) => {
    res.send('ZeroLeak Backend is Running');
});

// Mount auth routes
app.use('/api/auth', require('./routes/auth'));

// Start Server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
});
