const mongoose = require("mongoose");
const Folder = require("./Folder");

const noteSchema = new mongoose.Schema({
  content: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Folder",
    unique: true,
  },
});

noteSchema.statics.create = async function (userId, parentId, name, content) {
  const folder = await Folder.create(name, userId, parentId, true);

  const note = new this({
    content,
    folderId: folder._id,
    userId,
  });
  await note.save();
  return { folder, note };
};
noteSchema.statics.getNote = async function (folderId) {
  const folder = await Folder.findById(folderId);
  const note = await this.findOne({ folderId });
  return { note, folder };
};
noteSchema.statics.updateNoteContent = async function (
  userId,
  folderId,
  content
) {
  await Folder.findOneAndUpdate(
    { _id: folderId, userId },
    { updatedAt: new Date() }
  );
  await this.findOneAndUpdate(
    { folderId, userId },
    { content, updatedAt: new Date() }
  );
};
noteSchema.statics.updateNoteTitle = async function (userId, folderId, title) {
  await Folder.findOneAndUpdate(
    { _id: folderId, userId },
    { name: title, updatedAt: new Date() }
  );
  await this.findOneAndUpdate({ folderId, userId }, { updatedAt: new Date() });
};

module.exports = mongoose.model("Note", noteSchema);
