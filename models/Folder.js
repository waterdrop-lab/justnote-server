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
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false },
});

folderSchema.statics.getRoot = async function (userId) {
  const folder = await this.findOne({ userId, parentId: null });
  if (folder) return folder;
  const root = new this({
    name: "root",
    parentId: null,
    userId,
  });
  await root.save();
  return root;
};
folderSchema.statics.create = async function (name, userId, parentId, isFile) {
  if (!parentId) {
    parentId = (await this.getRoot(userId))._id;
  }

  const folder = new this({
    name: name,
    parentId: parentId,
    userId,
    isFile,
  });
  await folder.save();
  return folder;
};
folderSchema.statics.getFolders = async function (userId) {
  let folders = await this.find({
    userId,
    $or: [
      { isDeleted: false },
      { isDeleted: { $exists: false } },
      { isDeleted: null },
    ],
  });
  if (folders.length === 0) {
    folders.push(await this.getRoot(userId));
  }
  return folders;
};

folderSchema.statics.deleteFolder = async function (userId, folderId) {
  await this.findOneAndUpdate(
    { _id: folderId, userId },
    { isDeleted: true, deletedAt: new Date() }
  );
};


module.exports = mongoose.model("Folder", folderSchema);
