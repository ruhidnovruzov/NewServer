const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
require('./services/telegramService')

// 


// .env faylını yükləyirik
dotenv.config();

// Marşrutları idxal edirik
const userRoutes = require('./routes/userRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');

// Bildiriş planlaşdırıcısını idxal edirik
const { initSchedulers } = require('./services/schedulerService');

// Express tətbiqini yaradırıq
const app = express();

// Middleware
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());

// Əsas marşrut
app.get('/', (req, res) => {
    res.send('Dərs cədvəli bildiriş API işləyir');
});

// API marşrutları
app.use('/api/users', userRoutes);
app.use('/api/schedules', scheduleRoutes);

// MongoDB-yə qoşulma
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected');

        // Bildiriş planlaşdırıcılarını başladırıq
        initSchedulers();

        // Serveri dinləyirik
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Əgər hər hansı bir səhv baş verərsə
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    // Server-i təmiz bağlayırıq
    // server.close(() => process.exit(1)); // 'server' dəyişəni burada tanımlanmayıb
    process.exit(1);
});