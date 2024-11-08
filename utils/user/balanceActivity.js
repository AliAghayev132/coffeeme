const balanceActivity = (user, { category, title, amount }) => {
  const newActivity = {
    category,
    title,
    amount,
  };

  user.balanceActivities.push(newActivity);
};

module.exports = balanceActivity;
