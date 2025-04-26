// server/controllers/scheduleController.js
const Schedule = require('../models/Schedule');
const { determineWeekType, getDayName } = require('../utils/scheduleUtils');

// Dərs cədvəlini əlavə etmək
exports.addSchedule = async (req, res) => {
  try {
    const { weekType, day, lessons } = req.body;
    
    // Əvvəlcə baxırıq ki, bu cədvəl artıq mövcuddurmu
    let schedule = await Schedule.findOne({ weekType, day });
    
    if (schedule) {
      // Mövcud cədvəli yeniləyirik
      schedule.lessons = lessons;
      await schedule.save();
      
      return res.status(200).json({
        success: true,
        message: 'Schedule updated successfully',
        data: schedule
      });
    }
    
    // Yeni cədvəl yaradırıq
    schedule = new Schedule({
      weekType,
      day,
      lessons
    });
    
    await schedule.save();
    
    res.status(201).json({
      success: true,
      message: 'Schedule added successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Error in addSchedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Bütün cədvəlləri götürmək
exports.getAllSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find();
    
    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    console.error('Error in getAllSchedules:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Müəyyən həftə və gün üçün cədvəli götürmək
exports.getScheduleByDayAndWeekType = async (req, res) => {
  try {
    const { weekType, day } = req.params;
    
    const schedule = await Schedule.findOne({ weekType, day });
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error in getScheduleByDayAndWeekType:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Cari və ya sabahkı dərs cədvəlini götürmək
exports.getCurrentDaySchedule = async (req, res) => {
  try {
    const now = new Date();
    const weekType = determineWeekType(now);
    const dayName = getDayName(now.getDay());
    
    const schedule = await Schedule.findOne({ weekType, day: dayName });
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'No schedule found for today'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        date: now.toISOString().split('T')[0],
        day: dayName,
        weekType,
        schedule
      }
    });
  } catch (error) {
    console.error('Error in getCurrentDaySchedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};