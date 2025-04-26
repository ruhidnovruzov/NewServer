// server/models/Schedule.js
const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
  time: String,
  subject: String,
  teacher: String,
  room: String
});

const ScheduleSchema = new mongoose.Schema({
  weekType: {
    type: String,
    enum: ['alt', 'ust'],
    required: true
  },
  day: {
    type: String,
    required: true
  },
  lessons: [LessonSchema]
});

// Həftə tipi və günü üzrə unikal indeks yaradırıq
ScheduleSchema.index({ weekType: 1, day: 1 }, { unique: true });

module.exports = mongoose.model('Schedule', ScheduleSchema);