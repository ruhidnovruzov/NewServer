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
    let emailResult = null;
    let pushResult = null;

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
              ${body.replace(/\n/g, '<br>')}
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

    return { emailResult, pushResult };
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
    const validRecipients = recipients.filter(
      (recipient) => recipient && (recipient.email || recipient.token)
    );

    if (!validRecipients.length) {
      console.log('No valid recipients found for multicast notification');
      return;
    }

    console.log(`Sending "${title}" notification to ${validRecipients.length} recipients`);

    const results = await Promise.allSettled(
      validRecipients.map(({ token, email }) =>
        sendNotification({ token, email, title, body, data })
      )
    );

    const successCount = results.filter(result => result.status === 'fulfilled').length;
    const failureCount = results.length - successCount;

    console.log(`${successCount}/${results.length} notifications sent successfully`);
    if (failureCount > 0) {
      console.log(`${failureCount} notifications failed`);
    }

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