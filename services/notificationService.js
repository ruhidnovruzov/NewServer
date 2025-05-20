const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const axios = require("axios");
const mongoose = require("mongoose");

// Load environment variables
dotenv.config();

// Get Firebase configuration from base64 encoded environment variable
const firebaseCredentials = JSON.parse(
  Buffer.from(process.env.FIREBASE_CREDENTIALS_BASE64, "base64").toString(
    "utf-8"
  )
);

// Initialize Firebase with credentials
admin.initializeApp({
  credential: admin.credential.cert(firebaseCredentials),
});

// Configure nodemailer for email transport
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER,
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    refreshToken: process.env.OAUTH_REFRESH_TOKEN,
    accessToken: process.env.OAUTH_ACCESS_TOKEN,
  },
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define User Schema
const userSchema = new mongoose.Schema({
  name: String,
  telegramChatId: String,
  telegramUsername: String,
  firstName: String,
  createdAt: { type: Date, default: Date.now }
});

// Create User model if it doesn't exist already
const User = mongoose.models.User || mongoose.model('User', userSchema);

/**
 * Send notification to a single Telegram user
 * @param {string} chatId - User's Telegram chat ID
 * @param {string} message - Message to send
 * @returns {Promise} - Result of the API call
 */
const sendSingleTelegramNotification = async (chatId, message) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken || !chatId) {
    console.warn("Telegram token və ya chat ID tapılmadı. Bildiriş göndərilmir.");
    return null;
  }

  const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const res = await axios.post(telegramApiUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    });
    console.log(`Telegram bildirişi göndərildi (${chatId}): ${res.data.result.message_id}`);
    return res.data;
  } catch (error) {
    console.error(
      `Telegram bildirişi zamanı xəta baş verdi (${chatId}):`,
      error.response?.data || error.message
    );
    return null;
  }
};

/**
 * Send notification to all registered Telegram users
 * @param {string} message - Message to send
 * @returns {Promise} - Results of all API calls
 */
const sendTelegramNotification = async (message) => {
  try {
    // Get all users with telegramChatId
    const users = await User.find({ telegramChatId: { $exists: true, $ne: "" } });
    
    if (!users || users.length === 0) {
      console.log("Qeydiyyatdan keçmiş Telegram istifadəçiləri tapılmadı.");
      
      // Fallback to environment variable if available
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (chatId) {
        console.log("Ehtiyat variantı: .env faylından chatId istifadə edilir.");
        return await sendSingleTelegramNotification(chatId, message);
      }
      return null;
    }

    console.log(`${users.length} telegram istifadəçisinə bildiriş göndərilir...`);
    
    // Send message to all users
    const results = await Promise.allSettled(
      users.map(user => sendSingleTelegramNotification(user.telegramChatId, message))
    );

    const successCount = results.filter(r => r.status === "fulfilled" && r.value).length;
    console.log(`${successCount}/${users.length} telegram bildirişi uğurla göndərildi.`);
    
    return results;
  } catch (error) {
    console.error("Telegram bildirişlərini göndərərkən xəta baş verdi:", error);
    return null;
  }
};

/**
 * Send notification via FCM push notification or email
 * @param {Object} options - Notification details
 * @param {string} [options.token] - Firebase device token
 * @param {string} [options.email] - User's email address
 * @param {string} [options.telegramChatId] - User's Telegram chat ID
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification message
 * @param {Object} [options.data] - Additional data (optional)
 */
const sendNotification = async ({
  token,
  email,
  telegramChatId,
  title,
  body,
  data = {},
}) => {
  try {
    let emailResult = null;
    let pushResult = null;
    let telegramResult = null;

    if (email) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: title,
        text: body,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a56db;">${title}</h2>
            <div style="white-space: pre-line; margin-top: 20px; padding: 15px; background-color: #f0f4ff; border-radius: 5px;">
              ${body.replace(/\n/g, "<br>")}
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
              Bu, universitet dərs cədvəli bildiriş sistemi tərəfindən avtomatik göndərilən məlumatdır.
            </p>
          </div>
        `,
      };
      emailResult = await transporter.sendMail(mailOptions);
      console.log(`Email notification sent to ${email}: ${emailResult.messageId}`);
    }

    if (token) {
      const message = {
        notification: { title, body },
        data,
        token,
      };
      pushResult = await admin.messaging().send(message);
      console.log(`Push notification sent to device: ${pushResult}`);
    }

    if (telegramChatId) {
      const telegramMessage = `📢 *${title}*\n\n${body}`;
      telegramResult = await sendSingleTelegramNotification(telegramChatId, telegramMessage);
    } else {
      // If no specific telegramChatId is provided, send to all registered users
      const telegramMessage = `📢 *${title}*\n\n${body}`;
      telegramResult = await sendTelegramNotification(telegramMessage);
    }

    return { emailResult, pushResult, telegramResult };
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
};

/**
 * Send notifications to multiple recipients
 * @param {Array} recipients - List of users (each with { token, email, telegramChatId })
 * @param {string} title - Notification title
 * @param {string} body - Notification message
 * @param {Object} data - Additional data (optional)
 */
const sendMulticastNotification = async (
  recipients,
  title,
  body,
  data = {}
) => {
  if (!recipients || !recipients.length) {
    console.log("No recipients provided for multicast notification");
    return;
  }

  try {
    const validRecipients = recipients.filter(
      (recipient) =>
        recipient &&
        (recipient.email || recipient.token || recipient.telegramChatId)
    );

    if (!validRecipients.length) {
      console.log("No valid recipients found for multicast notification");
      return;
    }

    console.log(
      `Sending "${title}" notification to ${validRecipients.length} recipients`
    );

    const results = await Promise.allSettled(
      validRecipients.map(({ token, email, telegramChatId }) =>
        sendNotification({ token, email, telegramChatId, title, body, data })
      )
    );

    const successCount = results.filter(
      (result) => result.status === "fulfilled"
    ).length;
    const failureCount = results.length - successCount;

    console.log(
      `${successCount}/${results.length} notifications sent successfully`
    );
    if (failureCount > 0) {
      console.log(`${failureCount} notifications failed`);
    }

    return results;
  } catch (error) {
    console.error("Error in multicast notification:", error);
    throw error;
  }
};

/**
 * Send broadcast notification to all registered Telegram users
 * @param {string} title - Notification title
 * @param {string} body - Notification message
 * @param {Object} data - Additional data (optional)
 */
const sendTelegramBroadcast = async (title, body, data = {}) => {
  try {
    // Get all users with telegramChatId
    const users = await User.find({ telegramChatId: { $exists: true, $ne: "" } });
    
    if (!users || users.length === 0) {
      console.log("Qeydiyyatdan keçmiş Telegram istifadəçiləri tapılmadı.");
      return [];
    }

    console.log(`${users.length} telegram istifadəçisinə yayın bildirişi göndərilir...`);
    
    // Convert users to recipients format
    const recipients = users.map(user => ({
      telegramChatId: user.telegramChatId
    }));
    
    // Use multicast function to send to all users
    return await sendMulticastNotification(recipients, title, body, data);
  } catch (error) {
    console.error("Telegram yayın bildirişləri göndərərkən xəta baş verdi:", error);
    throw error;
  }
};

module.exports = {
  sendNotification,
  sendMulticastNotification,
  sendTelegramNotification,
  sendTelegramBroadcast,
  User // Export User model for access in other modules
};