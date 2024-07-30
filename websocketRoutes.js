const Folder = require("./models/Folder");
const Note = require("./models/Note");
const User = require("./models/User");

const auth = new Map();
auth.set("updateNoteTitle", async function updateNoteTitle(folderId, title) {
  const userId = this.socket.user._id;
  await Note.updateNoteTitle(userId, folderId, title);
  await emitFolders(this.socket, userId);
});
auth.set("getNote", async function getNote(folderId, callback) {
  const { note, folder } = await Note.getNote(folderId);
  if (!note || !folder) {
    return callback({
      error: {
        errorCode: errorCode.noteNotExist,
        folderId,
      },
    });
  }
  callback({
    note: {
      title: folder.name,
      content: note.content,
      updatedAt: note.updatedAt,
      folderId: folder._id,
    },
  });
});
auth.set("addFolder", async function addFolder(name, parentId) {
  await Folder.create(name, this.socket.user._id, parentId, false);
  await emitFolders(this.socket, userId);
});
auth.set("deleteFolder", async function deleteFolder(folderId, callback) {
  const userId = this.socket.user._id;
  await Folder.deleteFolder(userId, folderId);
  await emitFolders(this.socket, userId);
  callback({});
});
auth.set("updateNote", async function updateNote(folderId, content) {
  const userId = this.socket.user._id;
  await Note.updateNoteContent(userId, folderId, content);
  await emitFolders(this.socket, userId);
});
auth.set("addNote", async function addNote(name, parentId, content, callback) {
  const userId = this.socket.user._id;
  const { note, folder } = await Note.create(userId, parentId, name, content);
  await emitFolders(this.socket, userId);
  callback({ note, folder });
});

const unauth = new Map();
unauth.set("login", async function login(username, password, callback) {
  const { token, user } = await User.login(username, password);
  emitFolders(this.socket, user._id);
  callback({ token });
});
unauth.set("register", async function register(username, password, callback) {
  const { token, user } = await User.register(username, password);
  emitFolders(this.socket, user._id);
  callback({ token });
});

async function emitFolders(socket, userId) {
  const folders = await Folder.getFolders(userId);

  if (folders.length === 1) {
    const { folder } = await Note.create(userId, folders[0]._id, "", "");
    folders.push(folder);
  }

  folders.sort((a, b) => {
    const timeA = new Date(a.updatedAt);
    const timeB = new Date(b.updatedAt);
    return timeB - timeA;
  });
  socket.emit("folders", folders);
}

module.exports = {
  authRouter: auth,
  unauthRouter: unauth,
  emitFolders,
};
