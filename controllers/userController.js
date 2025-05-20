// server/controllers/userController.js
const User = require('../models/User');

// Yeni istifadəçi yaratmaq
exports.createUser = async (req, res) => {
    try {
        const { name, email, deviceToken } = req.body;

        // Əgər istifadəçi artıq mövcuddursa, tokeni yeniləyirik
        let user = await User.findOne({ email });

        if (user) {
            user.deviceToken = deviceToken;
            await user.save();
            return res.status(200).json({
                success: true,
                message: 'Device token updated',
                data: user
            });
        }

        // Yeni istifadəçi yaradırıq
        user = new User({
            name,
            email,
            deviceToken
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: user
        });
    } catch (error) {
        console.error('Error in createUser:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Device tokenini yeniləmək
exports.updateDeviceToken = async (req, res) => {
    try {
        const { email, deviceToken } = req.body;

        const user = await User.findOneAndUpdate(
            { email },
            { deviceToken },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Device token updated successfully',
            data: user
        });
    } catch (error) {
        console.error('Error in updateDeviceToken:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Telegram chat ID-sini qəbul edib istifadəçiyə əlavə etmək
exports.registerTelegramUser = async (req, res) => {
    try {
        const { chatId, username, firstName, lastName } = req.body;

        // Chat ID-nin bazada olub olmadığını yoxlayırıq
        let user = await User.findOne({ telegramChatId: chatId });

        if (user) {
            return res.status(200).json({
                success: true,
                message: 'Telegram chat ID artıq qeydə alınıb',
                data: user,
            });
        }

        // Yeni istifadəçi yaradırıq (ad sahəsini də daxil edirik)
        const newUser = new User({
            telegramChatId: chatId,
            telegramUsername: username,
            firstName: firstName,
            lastName: lastName,
            name: username || firstName || 'Telegram İstifadəçisi',
            email: `telegram-${chatId}@example.com` // BURA DƏYİŞİKLİK EDİLİB
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: 'Telegram istifadəçisi uğurla qeydə alındı',
            data: newUser,
        });
    } catch (error) {
        console.error('Telegram istifadəçisi qeydiyyatı zamanı xəta:', error);
        res.status(500).json({
            success: false,
            message: 'Server xətası',
            error: error.message,
        });
    }
};