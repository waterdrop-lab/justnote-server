const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema({
  name: { type: String },
  isFile: { type: Boolean, default: false },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Folder",
    default: null,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updateAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Folder", folderSchema);
