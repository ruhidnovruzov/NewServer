// server/utils/scheduleUtils.js
/**
 * Verilən tarix üçün həftə tipini müəyyən edir (alt/üst)
 * @param {Date} date - Yoxlamaq üçün tarix
 * @returns {string} 'alt' və ya 'ust'
 */
const determineWeekType = (date) => {
    // Semestrin başlanğıc tarixi (alt həftə ilə başlayır)
    const semesterStartDate = new Date('2025-04-20');
    
    // İki tarix arasındakı həftə sayını hesablayırıq
    const weekDiff = Math.floor((date - semesterStartDate) / (7 * 24 * 60 * 60 * 1000));
    
    // Əgər cüt həftədirsə alt, tək həftədirsə üst
    return weekDiff % 2 === 0 ? 'alt' : 'ust';
  };


  
  /**
   * Həftənin gününün adını qaytarır
   * @param {number} dayNumber - Həftənin günü (0-6)
   * @returns {string} Günün adı
   */
  const getDayName = (dayNumber) => {
    const days = ['Bazar', 'Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə'];
    return days[dayNumber];
  };
  
 /**
   * Sabahın tarixini və gün adını qaytarır
   * @returns {Object} { date: Date, dayName: string, weekType: string }
   */
  const getTomorrowInfo = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      date: tomorrow,
      dayName: getDayName(tomorrow.getDay() ),
      weekType: determineWeekType(tomorrow ) // Buranı düzəldirik
    };
  };

  console.log(getTomorrowInfo())


  module.exports = {
    determineWeekType,
    getDayName,
    getTomorrowInfo
  };