const cron = require('node-cron');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const { sendMulticastNotification } = require('./notificationService');
const { determineWeekType, getDayName, getTomorrowInfo } = require('../utils/scheduleUtils');

// Bütün bildiriş planlaşdırıcılarını başlatmaq
const initSchedulers = () => {
  // Hər gün axşam 20:00-da sabahkı dərs cədvəli haqqında bildiriş
  cron.schedule('23 09 * * *', async () => {
    try {
      console.log('Running evening notification job...');
      
      const { date, dayName, weekType } = getTomorrowInfo();
      
      // Əgər həftə sonudursa, bildiriş göndərmirik
      if (date.getDay() === 1) {
        console.log('Tomorrow is weekend, skipping notifications');
        return;
      }
      
      // Sabahkı dərsləri tap
      const schedule = await Schedule.findOne({ weekType, day: dayName });
      
      if (!schedule || !schedule.lessons || schedule.lessons.length === 0) {
        console.log(`No lessons found for tomorrow (${dayName}, ${weekType})`);
        return;
      }
      
      // Bütün istifadəçiləri tapırıq
      const users = await User.find();
      const recipients = users
        .filter(user => user.deviceToken || user.email) // Yalnız token və ya email olanları seçirik
        .map(user => ({
          token: user.deviceToken || null,
          email: user.email || null,
        }));
      
      if (recipients.length === 0) {
        console.log('No valid users found for sending notifications');
        return;
      }
      
      // Dərs sayını və birinci dərsin başlama vaxtını əldə edirik
      const lessonCount = schedule.lessons.length;
      let firstLessonTime = 'N/A';
      let lessonDetails = '';
      
      if (lessonCount > 0 && schedule.lessons[0].time) {
        firstLessonTime = schedule.lessons[0].time.split('-')[0];
        
        // İlk 2 dərsin məlumatlarını əlavə et
        schedule.lessons.slice(0, 2).forEach((lesson, index) => {
          lessonDetails += `${index + 1}. ${lesson.time} - ${lesson.subject} (${lesson.room})\n`;
        });
        
        if (lessonCount > 2) {
          lessonDetails += `... və daha ${lessonCount - 2} dərs`;
        }
      }
      
      // Bildiriş göndəririk
      await sendMulticastNotification(
        recipients,
        `Sabahkı Dərs Cədvəli - ${dayName}`,
        `${dayName} (${weekType} həftə) ${lessonCount} dərsiniz var. İlk dərs: ${firstLessonTime}\n\n${lessonDetails}`
      );
      
      console.log(`Evening notification sent to ${recipients.length} users`);
    } catch (error) {
      console.error('Error in evening notification job:', error);
    }
  });
  
  // Hər 5 dəqiqədən bir dərs başlamazdan əvvəl bildiriş yoxlanması
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('Checking for upcoming lessons...');
      
      const now = new Date();
      const weekType = determineWeekType(now);
      const dayName = getDayName(now.getDay());
      
      // Həftə sonunda yoxlama etmirik
      if (now.getDay() === 0 || now.getDay() === 6) {
        return;
      }
      
      // Cari günün dərs cədvəlini tapırıq
      const schedule = await Schedule.findOne({ weekType, day: dayName });
      
      if (!schedule || !schedule.lessons || schedule.lessons.length === 0) {
        return;
      }
      
      // İndiki vaxtdan 15 dəqiqə sonra başlayan dərsləri tapırıq
      const upcomingLessons = schedule.lessons.filter(lesson => {
        if (!lesson.time || !lesson.time.includes('-')) return false;
        
        const [startTime] = lesson.time.split('-');
        const [hours, minutes] = startTime.split(':').map(Number);
        
        const lessonTime = new Date();
        lessonTime.setHours(hours);
        lessonTime.setMinutes(minutes);
        lessonTime.setSeconds(0);
        
        // Dərs vaxtından 15 dəqiqə çıxırıq
        const notificationTime = new Date(lessonTime.getTime() - 15 * 60 * 1000);
        
        // İndiki vaxtla notifikasiya vaxtı arasında 2.5 dəqiqə (~5 dəqiqəlik interval yarısı) tolerantlıq
        const diffInMinutes = Math.abs(now - notificationTime) / (60 * 1000);
        return diffInMinutes <= 2.5;
      });
      
      if (upcomingLessons.length === 0) {
        return;
      }
      
      // Bütün istifadəçiləri tapırıq
      const users = await User.find();
      const recipients = users
        .filter(user => user.deviceToken || user.email)
        .map(user => ({
          token: user.deviceToken || null,
          email: user.email || null,
        }));
      
      if (recipients.length === 0) {
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
    } catch (error) {
      console.error('Error in lesson reminder job:', error);
    }
  });
  
  console.log('All notification schedulers initialized');
};

module.exports = {
  initSchedulers,
};