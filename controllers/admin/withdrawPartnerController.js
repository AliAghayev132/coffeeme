const WithdrawPartner = require("../../schemas/withdraw/WithdrawPartner");
const Admin = require("../../schemas/Admin");
const Partner = require("../../schemas/Partner");

const getWithdraws = async (req, res) => {
  try {
    const { email } = req.user;
    const admin = await Admin.findOne({ email });
    console.log(admin, email);

    if (!admin)
      return res
        .status(404)
        .json({ message: "Admin not found", success: false });

    const withdraws = await WithdrawPartner.find().populate({
      path: "partner",
      select: "username",
    });
    return res.status(200).json({
      success: true,
      message: "All withdraws got",
      withdraws,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateWithdrawStatus = async (req, res) => {
  try {
    const { email } = req.user;
    const admin = await Admin.findOne({ email });
    console.log(admin, email);

    const { withdrawId, status, rejectedReason } = req.body;
    console.log({ withdrawId, status, rejectedReason });

    if (!admin)
      return res
        .status(404)
        .json({ message: "Admin not found", success: false });

    // Status değerinin geçerli olup olmadığını kontrol et
    if (!["completed", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status value. Allowed values are 'completed' or 'rejected'.",
      });
    }

    // Withdraw kaydını bul ve güncelle
    const withdraw = await WithdrawPartner.findById(withdrawId);
    if (!withdraw) {
      return res
        .status(404)
        .json({ success: false, message: "Withdraw request not found" });
    }

    // Status'e göre işlemleri yap
    if (status === "rejected") {
      // Rejected durumunda rejectedReason gerekli
      if (!rejectedReason) {
        return res.status(400).json({
          success: false,
          message: "Rejected reason is required when status is 'rejected'",
        });
      }
      withdraw.status = "rejected";
      withdraw.rejectedReason = rejectedReason;

      // Partnerin balansını geri ekle
      const partner = await Partner.findById(withdraw.partnerId);
      if (partner) {
        partner.balance += withdraw.amount;
        await partner.save();
      }
    } else if (status === "completed") {
      withdraw.status = "completed";
    }

    withdraw.modifiedDate = Date.now();
    await withdraw.save();

    return res.status(200).json({
      success: true,
      message: `Withdraw request ${status} successfully`,
      data: withdraw,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getWithdraws, updateWithdrawStatus };
// updateWithdrawStatus
