const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Try to load from .env or .env.local
dotenv.config(); 
dotenv.config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// DB Connection
const connectDB = async () => {
    try {
        if (!MONGO_URI) {
            throw new Error("MONGO_URI is missing in environment variables");
        }
        await mongoose.connect(MONGO_URI);
        console.log("✅ MongoDB Connected: ChainSeal");
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
        process.exit(1);
    }
};

// Test Route
app.get('/', (req, res) => {
    res.send('ChainSeal Backend is Running');
});

// Start Server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
});
