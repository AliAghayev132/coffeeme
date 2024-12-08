const Referral = require("../../schemas/user/Referral");

const checkReferral = async (user) => {
  if (user.extraDetails.referredBy) {
    try {
      const referral = await Referral.findOneAndUpdate(
        {
          referredUserId: user._id,
          rewardGiven: false,
        },
        {
          rewardGiven: true,
        },
        { new: true }
      ).populate("referrerUserId");

      if (referral) user.balance += 1;
      if (referral.referrerUserId) {
        referral.referrerUserId.balance += 1;
      }
      balanceActivity(user, {
        category: "refer",
        title: `Refer a friend - ${referral.referrerUserId.firstname}`,
        amount: 1,
      });
      await referral.referrerUserId.save();
    } catch (error) {
      console.log(error);
    }
  }
};

module.exports = checkReferral;
