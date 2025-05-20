// server/services/telegramService.js
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();


// .env faylından tokeni alırıq
const token = process.env.TELEGRAM_BOT_TOKEN;
const USER_REGISTRATION_ENDPOINT = 'http://localhost:5000/api/users/telegram/register'; // Sizin server endpointiniz

// Tokenin olub olmadığını yoxlayırıq
if (!token) {
    console.error('XƏTA: Telegram Bot Token .env faylında tapılmadı!');
    // Əgər token yoxdursa, botu işə salmırıq və xəta atırıq (isteğe bağlı)
    throw new Error('Telegram Bot Token not provided in .env');
}

// Bot obyektini yaradırıq
const bot = new TelegramBot(token, { polling: true });

// /start komandasını idarə edirik
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramUsername = msg.from.username;
    const firstName = msg.from.first_name;
    const lastName = msg.from.last_name;

    try {
        const response = await axios.post(USER_REGISTRATION_ENDPOINT, {
            chatId: chatId,
            username: telegramUsername,
            firstName: firstName,
            lastName: lastName
        });
        bot.sendMessage(chatId, 'Bildirişlərə uğurla abunə oldunuz!');
        console.log(`Yeni Telegram istifadəçisi qoşuldu: Chat ID - ${chatId}, İstifadəçi Adı - ${telegramUsername}`);
    } catch (error) {
        console.error('Telegram Chat ID göndərilməsi zamanı xəta:', error.message);
        bot.sendMessage(chatId, 'Bildirişlərə abunə olmaqda xəta baş verdi. Zəhmət olmasa, yenidən cəhd edin.');
    }
});

module.exports = bot; // Bot obyektini başqa fayllarda istifadə etmək üçün ixrac edirik