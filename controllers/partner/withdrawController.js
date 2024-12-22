const Partner = require("../../schemas/Partner");
const WithdrawPartner = require("../../schemas/withdraw/WithdrawPartner");

const withdrawBalance = async (req, res) => {
  try {
    const { username } = req.user;
    const { amount } = req.body;
    // Partneri bulma
    const partner = await Partner.findOne({ username });
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    // Balans kontrolü
    if (partner.balance < amount) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });
    }

    // Partner balansını güncelleme
    partner.balance -= amount;

    // Withdraw kaydını oluşturma
    const newWithdraw = new WithdrawPartner({
      amount,
      partner: partner._id,
      status: "pending",
    });
    await newWithdraw.save();
    partner.withdraws.push(newWithdraw._id);
    await partner.save();
    return res.status(200).json({
      success: true,
      message: "Withdrawal request created successfully",
      data: newWithdraw,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getWithdraws = async (req, res) => {
  try {
    const { username } = req.user;
    const partner = await Partner.findOne({ username }).populate("withdraws");
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }
    return res.status(200).json({
      success: true,
      message: "All withdraws got",
      withdraws: partner.withdraws,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Withdraw durumunu güncelleyen endpoint
// const updateWithdrawStatus = async (req, res) => {
//   try {
//     const { withdrawId, status, rejectedReason } = req.body;

//     // Status değerinin geçerli olup olmadığını kontrol et
//     if (!["completed", "rejected"].includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid status value. Allowed values are 'completed' or 'rejected'.",
//       });
//     }

//     // Withdraw kaydını bul ve güncelle
//     const withdraw = await WithdrawPartner.findById(withdrawId);
//     if (!withdraw) {
//       return res.status(404).json({ success: false, message: "Withdraw request not found" });
//     }

//     // Status'e göre işlemleri yap
//     if (status === "rejected") {
//       // Rejected durumunda rejectedReason gerekli
//       if (!rejectedReason) {
//         return res.status(400).json({
//           success: false,
//           message: "Rejected reason is required when status is 'rejected'",
//         });
//       }
//       withdraw.status = "rejected";
//       withdraw.rejectedReason = rejectedReason;

//       // Partnerin balansını geri ekle
//       const partner = await Partner.findById(withdraw.partnerId);
//       if (partner) {
//         partner.balance += withdraw.amount;
//         await partner.save();
//       }
//     } else if (status === "completed") {
//       // Status completed olarak ayarlanır
//       withdraw.status = "completed";
//     }

//     withdraw.modifiedDate = Date.now();
//     await withdraw.save();

//     return res.status(200).json({
//       success: true,
//       message: `Withdraw request ${status} successfully`,
//       data: withdraw,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

module.exports = { withdrawBalance, getWithdraws };
// updateWithdrawStatus
