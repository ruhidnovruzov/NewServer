const cron = require('node-cron');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const { sendMulticastNotification } = require('./notificationService');
const { determineWeekType, getDayName, getTomorrowInfo } = require('../utils/scheduleUtils');

// İstifadəçiləri tapırıq və bildiriş göndərilə bilənləri seçirik
const getRecipients = async () => {
  const users = await User.find();
  return users
    .filter(user => user.deviceToken || user.email) // Yalnız token və ya email olanları seçirik
    .map(user => ({
      token: user.deviceToken || null,
      email: user.email || null,
    }));
};

// Sabahkı dərs cədvəli haqqında bildiriş
const sendTomorrowScheduleNotification = async () => {
  console.log('Running evening notification job...');

  const { date, dayName, weekType } = getTomorrowInfo();

  // Əgər həftə sonudursa, bildiriş göndərmirik
  if (date.getDay() === 0 || date.getDay() === 6) {
    console.log('Tomorrow is weekend, skipping notifications');
    return;
  }

  // Sabahkı dərsləri tap
  const schedule = await Schedule.findOne({ weekType, day: dayName });

  if (!schedule || !schedule.lessons || schedule.lessons.length === 0) {
    console.log(`No lessons found for tomorrow (${dayName}, ${weekType})`);
    return;
  }

  // Real dərsləri filtrləyirik
  const realLessons = schedule.lessons.filter(lesson => lesson.subject !== 'Dərs yoxdur');

  // Dərs məlumatlarını formatlaşdırırıq
  const lessonCount = realLessons.length;
  let firstLessonTime = 'N/A';
  let lessonDetails = '';

  if (lessonCount > 0 && realLessons.length > 0 && realLessons[0].time) {
    firstLessonTime = realLessons[0].time.split('-')[0];

    realLessons.forEach((lesson, index) => {
      lessonDetails += `${index + 1}. ${lesson.time} - ${lesson.subject} (${lesson.room})\n`;
    });
  }

  // İstifadəçiləri tapırıq
  const recipients = await getRecipients();

  if (recipients.length === 0) {
    console.log('No valid users found for sending notifications');
    return;
  }

  // Bildiriş göndəririk
  await sendMulticastNotification(
    recipients,
    `Sabahkı Dərs Cədvəli - ${dayName}`,
    `${dayName} (${weekType} həftə) ${lessonCount} dərsiniz var. İlk dərs: ${firstLessonTime}\n\n${lessonDetails}`
  );

  console.log(`Evening notification sent to ${recipients.length} users`);
};

// Dərsdən 15 dəqiqə əvvəl bildiriş göndərmək - DÜZƏLDILMIŞ FUNKSIYA
const sendLessonReminderNotifications = async () => {
  console.log('Checking for upcoming lessons...');

  const now = new Date();
  const weekType = determineWeekType(now);
  const dayName = getDayName(now.getDay());

  // Həftə sonunda yoxlama etmirik
  if (now.getDay() === 0 || now.getDay() === 6) {
    console.log('Today is weekend, skipping notifications');
    return;
  }

  // Cari günün dərs cədvəlini tapırıq
  const schedule = await Schedule.findOne({ weekType, day: dayName });


  if (!schedule || !schedule.lessons || schedule.lessons.length === 0) {
    console.log(`No lessons found for today (${dayName}, ${weekType})`);
    return;
  }

  // DÜZƏLDILMIŞ HİSSƏ: İndiki vaxtdan 15 dəqiqə sonra başlayan dərsləri tapırıq
  const upcomingLessons = schedule.lessons.filter(lesson => {
    // Dərs yoxdursa və ya vaxt boşdursa, keçirik
    if (lesson.subject === 'Dərs yoxdur' || !lesson.time || lesson.time === '') {
      return false;
    }

    // Vaxt formatını yoxlayırıq
    if (!lesson.time.includes('-')) {
      console.log(`Invalid time format for lesson: ${lesson.subject}`);
      return false;
    }

    const [startTime] = lesson.time.split('-');
    const [hours, minutes] = startTime.trim().split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes)) {
      console.log(`Could not parse time for lesson: ${lesson.subject}, time: ${lesson.time}`);
      return false;
    }

    // Dərs başlama vaxtını hazırkı tarix üçün düzəldirik
    const lessonTime = new Date(now);
    lessonTime.setHours(hours, minutes, 0, 0);

    // İndiki vaxtla dərs vaxtı arasındakı fərqi dəqiqə ilə hesablayırıq
    const diffInMilliseconds = lessonTime.getTime() - now.getTime();
    const diffInMinutes = diffInMilliseconds / (60 * 1000);

    // Dərs 15-20 dəqiqə ərzində başlayacaqsa, bildiriş göndəririk
    // Bu 5 dəqiqəlik pəncərə cron job-ın işləmə intervalı üçün lazımdır
    return diffInMinutes >= 14 && diffInMinutes <= 20;
  });

  if (upcomingLessons.length === 0) {
    console.log('No upcoming lessons found for notification');
    return;
  }

  // Bildiriş göndəriləcək istifadəçiləri tapırıq
  const recipients = await getRecipients();

  if (recipients.length === 0) {
    console.log('No valid users found for sending notifications');
    return;
  }

  // Hər dərs üçün bildiriş göndəririk
  for (const lesson of upcomingLessons) {
    await sendMulticastNotification(
      recipients,
      `Dərs Başlayır: ${lesson.subject}`,
      `${lesson.time} - ${lesson.subject} dərsi 15 dəqiqə sonra başlayır.\nMüəllim: ${lesson.teacher}\nOtaq: ${lesson.room}`
    );

    console.log(`Lesson reminder sent for ${lesson.subject} to ${recipients.length} users`);
  }
};

// Serverə deploy etdikdən sonra serverın vaxtını və saat qurşağını yoxlamaq üçün bu kodu əlavə edin
console.log('Server current time:', new Date().toString());
console.log('Server timezone offset:', new Date().getTimezoneOffset() / -60);

// Bütün bildiriş planlaşdırıcılarını başlatmaq
const initSchedulers = () => {
  // Hər gün axşam 20:00-da sabahkı dərs cədvəli haqqında bildiriş
  cron.schedule('43 05 * * *', sendTomorrowScheduleNotification,
    {
      scheduled: true,
      timezone: "Asia/Baku"   // Açıq şəkildə Azərbaycan saat qurşağını təyin edirik
    }
  );

  // Hər 5 dəqiqədən bir dərs başlamazdan əvvəl bildiriş yoxlanması
  cron.schedule('*/5 * * * *', sendLessonReminderNotifications,
    {
      scheduled: true,
      timezone: "Asia/Baku"   // Açıq şəkildə Azərbaycan saat qurşağını təyin edirik
    }
  );

  console.log('All notification schedulers initialized');
};

module.exports = {
  initSchedulers,
};