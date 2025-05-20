const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: false,
        unique: false
    },
    deviceToken: {
        type: String,
        required: false
    },
    telegramChatId: { // Telegram Chat ID-sini saxlayırıq
        type: String,
        required: false, // Bu sahənin doldurulması məcburi deyil
        unique: true // Hər istifadəçinin unikal chat ID-si olmalıdır
    },
    telegramUsername: { // Telegram istifadəçi adını da saxlaya bilərik (isteğe bağlı)
        type: String,
        required: false
    },
    firstName: {  // İstifadəçinin adını saxlaya bilərik
        type: String,
        required: false
    },
    lastName: { // İstifadəçinin soyadını saxlaya bilərik
        type: String,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);