const { Router } = require("express");
const SystemLog = require("../models/SystemLog");

const router = Router();

router.get("/logs", async (req, res) => {
  const logs = await SystemLog.find();
  res.send(logs);
});
router.post("/logs", async (req, res) => {
  const systemLog = new SystemLog({
    data: req.body,
  });
  await systemLog.save();
  res.send({ message: "Data saved" });
});

module.exports = router;
