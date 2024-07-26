// server/routes/noteRoutes.js
const express = require("express");
const router = express.Router();
const Note = require("../models/Note");
const Folder = require("../models/Folder");

router.get("/notes", async (req, res) => {
  const notes = await Note.find({ user_id: req.user._id }); // 仅返回当前用户的笔记
  res.send(notes);
});

router.post("/notes", async (req, res) => {
  const note = new Note({
    content: req.body.content,
    folder_id: req.body.folder_id,
    user_id: req.user._id, // 将当前用户的ID添加到笔记
  });
  await note.save();
  res.send(note);
});

router.get("/folders", async (req, res) => {
  const folders = await Folder.find({ user_id: req.user._id }); // 仅返回当前用户的文件夹
  res.send(folders);
});

router.post("/folders", async (req, res) => {
  const folder = new Folder({
    name: req.body.name,
    parent_id: req.body.parent_id,
    user_id: req.user._id, // 使用当前用户的ID
  });
  await folder.save();
  res.send(folder);
});

router.delete("/folders/:id", async (req, res) => {
  await Folder.findOneAndDelete({ _id: req.params.id, user_id: req.user._id });
  res.send({ message: "Folder deleted" });
});

module.exports = router;
