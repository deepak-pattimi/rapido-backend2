const Driver = require("../models/Driver");

// 🟢 RECHARGE DRIVER WALLET
exports.rechargeWallet = async (req, res) => {
  try {
    const { amount } = req.body;
    const driverId = req.user.id; // This comes from your JWT auth middleware

    // 1. Validate the input
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: "Invalid recharge amount" });
    }

    // 2. ATOMIC UPDATE: Increment the wallet balance
    // This completely replaces db.collection('drivers').doc(uid).update({ walletBalance: FieldValue.increment(...) })
    const updatedDriver = await Driver.findByIdAndUpdate(
      driverId,
      {
        $inc: { walletBalance: Number(amount) },
      },
      { new: true }, // This tells MongoDB to return the newly updated driver document
    );

    // 3. Check if driver actually exists
    if (!updatedDriver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    // 4. Send success response back to the app
    res.json({
      success: true,
      message: "Wallet recharged successfully",
      newBalance: updatedDriver.walletBalance, // Sending the new balance back is a nice touch for the frontend UI!
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
