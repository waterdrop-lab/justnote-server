const socketIo = require("socket.io");

const User = require("./models/User");
const Folder = require("./models/Folder");
const Note = require("./models/Note");
const AuthToken = require("./models/AuthToken");
const { errorToJSON, errorLog } = require("./utils");

const errorCode = {
  unauth: 401,
  noteNotExist: "noteNotExist",
};

async function emitFolders(socket, userId) {
  const folders = await Folder.getFolders(userId);

  if (folders.length === 1) {
    const { folder } = await Note.create(userId, folders[0]._id, "", "");
    folders.push(folder);
  }

  folders.sort((a, b) => {
    const timeA = new Date(a.createdAt);
    const timeB = new Date(b.createdAt);
    return timeB - timeA;
  });
  socket.emit("folders", folders);
}

function router(socket) {
  const authRouter = new Map();
  const unauthRouter = new Map();
  unauthRouter.set("login", async function login(username, password, callback) {
    const { token, user } = await User.login(username, password);
    emitFolders(socket, user._id);
    callback({ token });
  });
  unauthRouter.set(
    "register",
    async function register(username, password, callback) {
      const { token, user } = await User.register(username, password);
      emitFolders(socket, user._id);
      callback({ token });
    }
  );

  authRouter.set("getNote", async function getNote(folderId, callback) {
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
      },
    });
  });
  authRouter.set("addFolder", async function addFolder(name, parentId) {
    await Folder.create(name, socket.user._id, parentId, false);
    await emitFolders(socket, userId);
  });
  authRouter.set(
    "deleteFolder",
    async function deleteFolder(folderId, callback) {
      const userId = socket.user._id;
      await Folder.deleteFolder(userId, folderId);
      await emitFolders(socket, userId);
      callback({});
    }
  );
  authRouter.set("updateNote", async function updateNote(folderId, content) {
    const userId = socket.user._id;
    await Note.updateNoteContent(userId, folderId, content);
  });
  authRouter.set(
    "updateNoteTitle",
    async function updateNoteTitle(folderId, title) {
      const userId = socket.user._id;
      await Note.updateNoteTitle(userId, folderId, title);
      await emitFolders(socket, userId);
    }
  );
  authRouter.set(
    "addNote",
    async function addNote(name, parentId, content, callback) {
      const userId = socket.user._id;
      const { note, folder } = await Note.create(
        userId,
        parentId,
        name,
        content
      );
      await emitFolders(socket, userId);
      callback({ note, folder });
    }
  );

  const errorHandler =
    (handler) =>
    async (...args) => {
      try {
        await handler(...args);
      } catch (err) {
        errorLog(err);

        const error = errorToJSON(err);

        if (args.length > 0) {
          const last = args[args.length - 1];
          if (typeof last === "function") {
            last({ error });
          }
        } else {
          socket.emit("error", error);
        }
      }
    };

  const authHandler =
    (handler) =>
    async (...args) => {
      if (!socket.user) {
        const unauthError = new Error("Unauth user");
        unauthError.errorCode = errorCode.unauth;
        throw unauthError;
      }
      await handler(...args);
    };
  authRouter.forEach((handler, message) => {
    socket.on(message, errorHandler(authHandler(handler)));
  });
  unauthRouter.forEach((handler, message) => {
    socket.on(message, errorHandler(handler));
  });
}

function startSocket(server) {
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      next();
    } catch (err) {
      errorLog(err);
      next(err);
    }
  });
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next();
    }

    AuthToken.toUser(token)
      .then((user) => {
        socket.user = user;
        next();
      })
      .catch((err) => {
        errorLog(err);
        next(new Error("Authentication error"));
      });
  });
  io.on("connection", (socket) => {
    try {
      console.log("a user connected");

      socket.emit(
        "userInfo",
        socket.user
          ? {
              username: socket.user.username,
              token: socket.handshake.auth.token,
            }
          : {}
      );

      if (socket.user) {
        emitFolders(socket, socket.user._id).catch((err) => {
          errorLog(err);
        });
      }
      router(socket);
    } catch (error) {
      errorLog(error);
    }

    socket.on("connect_error", (err) => {
      errorLog(err);
    });
    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });
}

module.exports = {
  startSocket,
};
