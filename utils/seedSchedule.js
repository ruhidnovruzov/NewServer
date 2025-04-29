const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Schedule = require('../models/Schedule');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected for seeding'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const scheduleData = {
  alt: {
    'Bazar ertəsi': [
      { time: '09:00-10:20', subject: 'Dərs yoxdur', teacher: '', room: '' },
      { time: '10:30-11:50', subject: 'ZPTA (M)', teacher: 'Abasova E.S.', room: '401-1(otaq-korpus)' },
      { time: '12:00-13:20', subject: 'ZPTA (L)', teacher: 'Vahidli Q.', room: '412-5(otaq-korpus)' },
    ],
    'Çərşənbə axşamı': [
      { time: '09:00-10:20', subject: 'Kript. esas. (M)', teacher: 'Imamverdiyev Y.N.', room: '426-1(otaq-korpus)' },
      { time: '10:30-11:50', subject: 'NSE (M)', teacher: 'Sadiqzade C.', room: '426-1(otaq-korpus)' },
      { time: '12:00-13:20', subject: 'MNST (L)', teacher: 'Meherremova A.', room: '115-5(otaq-korpus)' },
    ],
    'Çərşənbə': [
      { time: '09:00-10:20', subject: 'Sah es. ve biz.gir. (M)', teacher: 'Ebdurehmanova S.E.', room: '404-1(otaq-korpus)' },
      { time: '10:30-11:50', subject: 'MNST (m)', teacher: 'Arifli A.', room: '409-3(otaq-korpus)' },
      { time: '12:00-13:20', subject: 'Dərs yoxdur', teacher: '', room: '' },
    ],
    'Cümə axşamı': [
      { time: '09:00-10:20', subject: 'Elek. es. ve IoT tehl (M)', teacher: 'Agababayev R.R.', room: '426-1(otaq-korpus)' },
      { time: '10:30-11:50', subject: 'MNST (M)', teacher: 'Meherremova A.', room: '517-1(otaq-korpus)' },
      { time: '12:00-13:20', subject: 'NSE (L)', teacher: 'Sadiqzade C.', room: '115-5(otaq-korpus)' },
    ],
    'Cümə': [
      { time: '', subject: 'Dərs yoxdur', teacher: '', room: '' },
    ]
  },
  ust: {
    'Bazar ertəsi': [
      { time: '09:00-10:20', subject: 'Kript. esas. (m)', teacher: 'Ibrahimova A.B.', room: '122-1(otaq-korpus)' },
      { time: '10:30-11:50', subject: 'ZPTA (M)', teacher: 'Abasova E.S.', room: '401-1(otaq-korpus)' },
      { time: '12:00-13:20', subject: 'ZPTA (m)', teacher: 'Vahidli Q.', room: '412-5(otaq-korpus)' },
    ],
    'Çərşənbə axşamı': [
      { time: '09:00-10:20', subject: 'Kript. esas. (M)', teacher: 'Imamverdiyev Y.N.', room: '426-1(otaq-korpus)' },
      { time: '10:30-11:50', subject: 'NSE (M)', teacher: 'Sadiqzade C.', room: '426-1(otaq-korpus)' },
      { time: '12:00-13:20', subject: 'Elek. es. ve IoT tehl (m)', teacher: 'Meherremova A.', room: '409-3(otaq-korpus)' },
    ],
    'Çərşənbə': [
      { time: '02:00-10:20', subject: 'Sah es. ve biz.gir. (M)', teacher: 'Ebdurehmanova S.E.', room: '404-1(otaq-korpus)' },
      { time: '10:30-11:50', subject: 'Sah es. ve biz.gir. (m)', teacher: 'Ebdurehmanova S.E.', room: '405-1(otaq-korpus)' },
      { time: '12:00-13:20', subject: 'NSE (m)', teacher: 'Sadiqzade C.', room: '303-3(otaq-korpus)' },
    ],
    'Cümə axşamı': [
     // server/utils/seedSchedule.js (davamı)
     { time: '09:00-10:20', subject: 'Elek. es. ve IoT tehl (M)', teacher: 'Agababayev R.R.', room: '426-1(otaq-korpus)' },
     { time: '10:30-11:50', subject: 'MNST (M)', teacher: 'Meherremova A.', room: '517-1(otaq-korpus)' },
     { time: '12:00-13:20', subject: 'NSE (L)', teacher: 'Sadiqzade C.', room: '115-5(otaq-korpus)' },
   ],
   'Cümə': [
     { time: '', subject: 'Dərs yoxdur', teacher: '', room: '' },
   ]
 }
};

// Cədvəl məlumatlarını yükləmək funksiyası
const seedSchedules = async () => {
 try {
   // Əvvəlki məlumatları təmizləyirik
   await Schedule.deleteMany();
   console.log('Existing schedules deleted');

   // Bütün dərs cədvəllərini əlavə edirik
   const schedulePromises = [];

   for (const weekType in scheduleData) {
     for (const day in scheduleData[weekType]) {
       const schedule = new Schedule({
         weekType,
         day,
         lessons: scheduleData[weekType][day]
       });
       
       schedulePromises.push(schedule.save());
     }
   }

   await Promise.all(schedulePromises);
   console.log('Schedule data seeded successfully');
   
   // Əlavə edilən məlumatları göstəririk
   const count = await Schedule.countDocuments();
   console.log(`Total ${count} schedule records added`);
   
   process.exit(0);
 } catch (error) {
   console.error('Error seeding schedules:', error);
   process.exit(1);
 }
};

// Məlumatları yükləyirik
seedSchedules();