const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get Firebase configuration from base64 encoded environment variable
const firebaseCredentials = JSON.parse(
  Buffer.from(process.env.FIREBASE_CREDENTIALS_BASE64, 'base64').toString('utf-8')
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
    accessToken: process.env.OAUTH_ACCESS_TOKEN
  }
});

/**
 * Send notification via FCM push notification or email
 * @param {Object} options - Notification details
 * @param {string} [options.token] - Firebase device token
 * @param {string} [options.email] - User's email address
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification message
 * @param {Object} [options.data] - Additional data (optional)
 */
const sendNotification = async ({ token, email, title, body, data = {} }) => {
  try {
    // Prioritize email notification if email is provided
    if (email) {
      // Send email notification
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: title,
        text: body,
        // HTML version for better formatting
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a56db;">${title}</h2>
            <div style="white-space: pre-line; margin-top: 20px; padding: 15px; background-color: #f0f4ff; border-radius: 5px;">
              ${body.replace(/\n/g, '<br>')}
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
              Bu, universitet dərs cədvəli bildiriş sistemi tərəfindən avtomatik göndərilən məlumatdır.
            </p>
          </div>
        `
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email notification sent to ${email}: ${info.messageId}`);
      return info;
    } 
    // Fall back to push notification if email is not available but token is
    else if (token) {
      const message = {
        notification: { title, body },
        data,
        token,
      };
      const response = await admin.messaging().send(message);
      console.log(`Push notification sent to device: ${response}`);
      return response;
    } else {
      console.log('Neither email nor token provided. Notification skipped.');
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

/**
 * Send notifications to multiple recipients
 * @param {Array} recipients - List of users (each with { token, email })
 * @param {string} title - Notification title
 * @param {string} body - Notification message
 * @param {Object} data - Additional data (optional)
 */
const sendMulticastNotification = async (recipients, title, body, data = {}) => {
  if (!recipients || !recipients.length) {
    console.log('No recipients provided for multicast notification');
    return;
  }

  try {
    // Filter valid recipients (those with email or token)
    const validRecipients = recipients.filter(
      (recipient) => recipient && (recipient.email || recipient.token)
    );

    if (!validRecipients.length) {
      console.log('No valid recipients found for multicast notification');
      return;
    }

    console.log(`Sending "${title}" notification to ${validRecipients.length} recipients`);
    
    // Send notifications in parallel
    const results = await Promise.all(
      validRecipients.map(async ({ token, email }) => {
        try {
          return await sendNotification({ token, email, title, body, data });
        } catch (err) {
          console.error(`Failed to send notification to ${email || token}:`, err);
          return null;
        }
      })
    );

    const successCount = results.filter(result => result !== null).length;
    console.log(`${successCount}/${validRecipients.length} notifications sent successfully`);
    return results;
  } catch (error) {
    console.error('Error in multicast notification:', error);
    throw error;
  }
};

module.exports = {
  sendNotification,
  sendMulticastNotification,
};