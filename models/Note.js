const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  content: { type: String },
  createdAt: { type: Date, default: Date.now },
  updateAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Folder",
    unique: true,
  },
});

module.exports = mongoose.model("Note", noteSchema);
