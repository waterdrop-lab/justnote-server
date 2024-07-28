const mongoose = require("mongoose");

const systemLogSchema = new mongoose.Schema({
  data: {
    type: Object, // Change the type to Object
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("SystemLog", systemLogSchema);
