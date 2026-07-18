const express = require("express");
const router = express.Router();
const { verifyAdminSecret } = require("../middlewares/auth");
const {
  getCustomers,
  deleteCustomer,
  updateCustomerStatus,
  getCustomerRides,
  getDrivers,
  getDriver,
  updateDriver,
  getDriverRides,
  getLogs,
} = require("../controllers/adminController");

router.use(verifyAdminSecret);

router.get("/customers", getCustomers);
router.delete("/customers/:id", deleteCustomer);
router.patch("/customers/:id/status", updateCustomerStatus);
router.get("/customers/:id/rides", getCustomerRides);

router.get("/drivers", getDrivers);
router.get("/drivers/:id", getDriver);
router.patch("/drivers/:id", updateDriver);
router.get("/drivers/:id/rides", getDriverRides);
router.get("/logs", getLogs);

module.exports = router;
