const checkStreakDay = ({ streak }) => {
  if (streak) {
    const { lastOrderDate } = streak;
    const now = new Date();

    if (lastOrderDate) {
      const lastOrderDateObj = new Date(lastOrderDate);


      if (!isNaN(lastOrderDateObj.getTime())) {

        const lastOrderYear = lastOrderDateObj.getFullYear();
        const lastOrderMonth = lastOrderDateObj.getMonth();
        const lastOrderDay = lastOrderDateObj.getDate();

        const nowYear = now.getFullYear();
        const nowMonth = now.getMonth();
        const nowDay = now.getDate();

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
      const lastOrderDateObj = new Date(lastOrderDate);
      
      const getEndDate = (orderDate) => {
        const orderDateObj = new Date(orderDate);
        orderDateObj.setDate(orderDateObj.getDate() + 1); 
        orderDateObj.setHours(23, 59, 59, 999); 
        return orderDateObj;
      };

      if (!isNaN(lastOrderDateObj.getTime())) {
        const endDate = getEndDate(lastOrderDateObj);
        
        if (now <= endDate) {
          return true; 
        }
      }
    }

    return false; 
  }

  return false;
};

module.exports = { checkStreakDay, checkStreak };
