// server/routes/userRoutes.js
const express = require('express');
const { createUser, updateDeviceToken } = require('../controllers/userController');

const router = express.Router();

router.post('/', createUser);
router.put('/device-token', updateDeviceToken);

module.exports = router;