const checkStreak = ({ streak }) => {
  if (streak) {
    const { lastOrderDate } = streak;
    const now = new Date();

    if (lastOrderDate) {
      // Convert lastOrderDate to Date if it's a timestamp
      const lastOrderDateObj = new Date(lastOrderDate);
      console.log(lastOrderDateObj.getDay);
      

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

const user = {
  streak: {
    count: 0,
    lastOrderDate: Date.now("2022-11-08T23:38:43.512+00:00"),
  },
};

console.log(checkStreak({ streak: user.streak }));
