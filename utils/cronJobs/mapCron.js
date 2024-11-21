const Partner = require("../../schemas/Partner");
const cron = require("node-cron");

cron.schedule("* * * * *", async () => {
  try {
    const thresholdTime = Date.now() - 60 * 1000;
    const partners = await Partner.find({});

    for (const partner of partners) {
      const updatedCloseUsers = partner.closeUsers.filter((closeUser) => {
        return closeUser.lastLocationUpdate >= thresholdTime;
      });

      if (updatedCloseUsers.length !== partner.closeUsers.length) {
        await Partner.updateOne(
          { _id: partner._id }, // Hangi belgeyi güncelleyeceğimizi belirtir
          { closeUsers: updatedCloseUsers } // Güncellenen alan
        );
        console.log(`Updated closeUsers for partner ${partner._id}`);
      }
    }
  } catch (error) {
    console.error("Error during closeUsers cleanup:", error);
  }
});
