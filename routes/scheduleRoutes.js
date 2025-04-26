// server/routes/scheduleRoutes.js
const express = require('express');
const {
  addSchedule,
  getAllSchedules,
  getScheduleByDayAndWeekType,
  getCurrentDaySchedule
} = require('../controllers/scheduleController');

const router = express.Router();

router.post('/', addSchedule);
router.get('/', getAllSchedules);
router.get('/current', getCurrentDaySchedule);
router.get('/:weekType/:day', getScheduleByDayAndWeekType);

module.exports = router;