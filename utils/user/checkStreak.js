const checkStreakDay = ({ streak }) => {
  if (streak) {
    const { lastOrderDate } = streak;
    const now = new Date();

    if (lastOrderDate) {
      // Convert lastOrderDate to Date if it's a timestamp
      const lastOrderDateObj = new Date(lastOrderDate);

      // Check if lastOrderDateObj is a valid date
      if (!isNaN(lastOrderDateObj.getTime())) {
        // Extract year, month, and day for both dates
        const lastOrderYear = lastOrderDateObj.getFullYear();
        const lastOrderMonth = lastOrderDateObj.getMonth();
        const lastOrderDay = lastOrderDateObj.getDate();

        const nowYear = now.getFullYear();
        const nowMonth = now.getMonth();
        const nowDay = now.getDate();

        // Check if the current date is the next day from the last order date
        const isNextDay =
          nowYear === lastOrderYear &&
          nowMonth === lastOrderMonth &&
          nowDay === lastOrderDay + 1;

        return isNextDay;
      }
    }

    return false;
  }

  return false;
};

const checkStreak = ({ streak }) => {
  if (streak) {
    const { lastOrderDate } = streak;
    const now = new Date();

    if (lastOrderDate) {
      // Convert lastOrderDate to Date if it's a timestamp
      const lastOrderDateObj = new Date(lastOrderDate);

      // Check if lastOrderDateObj is a valid date
      if (!isNaN(lastOrderDateObj.getTime())) {
        const differenceInHours = (now - lastOrderDateObj) / (1000 * 60 * 60);

        // Check if the difference is within the last 24 hours
        return differenceInHours <= 24;
      }
    }

    return false;
  }

  return false;
};

module.exports = { checkStreakDay, checkStreak };
