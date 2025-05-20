// server/routes/userRoutes.js
const express = require('express');
const { createUser, updateDeviceToken, registerTelegramUser } = require('../controllers/userController');

const router = express.Router();

router.post('/', createUser);
router.put('/device-token', updateDeviceToken);
router.post('/telegram/register', registerTelegramUser); 


module.exports = router;