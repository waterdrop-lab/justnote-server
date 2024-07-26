const socketIo = require("socket.io");
const { v4: uuid } = require("uuid");
const User = require("./models/User");
const Folder = require("./models/Folder");
const Note = require("./models/Note");
const AuthToken = require("./models/AuthToken");

const errorCode = {
  unauth: 401,
  noteNotExist: "noteNotExist",
};

function errorToJSON(error) {
  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
    ...error,
  };
}

function generateToken() {
  const token = uuid();
  return "jn-" + token;
}

async function generateAuthToken(user) {
  const token = generateToken();
  const authToken = new AuthToken({
    token,
    userId: user._id,
    expiresAt: new Date(Date.now() + 3600 * 1000 * 24), // expire in one day
  });
  await authToken.save();
  return token;
}
async function authenticateToken(token) {
  const result = await AuthToken.aggregate([
    { $match: { token } },
    {
      $lookup: {
        from: "users", // 要连接的集合名称
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" }, // 展开 user 数组
    { $project: { token: 1, user: 1 } }, // 投影需要的字段
  ]);

  if (result.length === 0) {
    return null;
  }

  return result[0].user;
}

async function createNote(userId, parentId, name, content) {
  const folder = await createFolder(name, userId, parentId, true);

  const note = new Note({
    content,
    folderId: folder._id,
    userId,
  });
  await note.save();
  return { folder, note };
}

async function emitFolders(socket, userId) {
  let folders = await Folder.find({ userId });
  if (folders.length === 0) {
    folders.push(await getRoot(userId));
  }
  if (folders.length === 1) {
    const { folder } = await createNote(userId, folders[0]._id, "", "");
    folders.push(folder);
  }
  folders.sort((a, b) => {
    const timeA = new Date(a.createdAt);
    const timeB = new Date(b.createdAt);
    return timeB - timeA;
  });
  socket.emit("folders", folders);
}

async function loginUser(username, password) {
  const user = await User.findOne({ username });
  if (!user) {
    throw new Error("Incorrect username.");
  }
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error("Incorrect password.");
  }

  return await generateAuthToken(user);
}

async function getRoot(userId) {
  const folder = await Folder.findOne({ userId, parentId: null });
  if (folder) return folder;
  const root = new Folder({
    name: "root",
    parentId: null,
    userId,
  });
  await root.save();
  return root;
}

async function createFolder(name, userId, parentId, isFile) {
  if (!parentId) {
    parentId = (await getRoot(userId))._id;
  }

  const folder = new Folder({
    name: name,
    parentId: parentId,
    userId,
    isFile,
  });
  await folder.save();
  return folder;
}

function router(socket) {
  const authRouter = new Map();
  const unauthRouter = new Map();
  unauthRouter.set("login", async function login(username, password, callback) {
    try {
      console.log("login", username, password);
      const token = await loginUser(username, password);
      const user = await authenticateToken(token);
      emitFolders(socket, user._id);
      callback({ token });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  authRouter.set("getNote", async function getNote(folderId, callback) {
    console.log("getNote", folderId);
    const folder = await Folder.findById(folderId);
    const note = await Note.findOne({ folderId });
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
    const userId = socket.user._id;
    await createFolder(name, userId, parentId, false);
    await emitFolders(socket, userId);
  });
  authRouter.set("updateNote", async function updateNote(folderId, content) {
    const userId = socket.user._id;
    await Folder.findOneAndUpdate(
      { _id: folderId, userId },
      { updateAt: new Date() }
    );
    await Note.findOneAndUpdate(
      { folderId, userId },
      { content, lastUpdateAt: new Date() }
    );
  });
  authRouter.set(
    "updateNoteTitle",
    async function updateNoteTitle(folderId, title) {
      const userId = socket.user._id;
      await Folder.findOneAndUpdate(
        { _id: folderId, userId },
        { name: title, updateAt: new Date() }
      );
      await Note.findOneAndUpdate({ folderId }, { updateAt: new Date() });
      await emitFolders(socket, userId);
    }
  );
  authRouter.set(
    "deleteFolder",
    async function deleteFolder(folderId, callback) {
      const userId = socket.user._id;
      await Folder.findOneAndDelete({ _id: folderId, userId });
      await emitFolders(socket, userId);
      callback({});
    }
  );
  authRouter.set(
    "addNote",
    async function addNote(name, parentId, content, callback) {
      const userId = socket.user._id;
      const { note, folder } = await createNote(
        userId,
        parentId,
        name,
        content
      );
      callback({ note, folder });
      await emitFolders(socket, userId);
    }
  );

  // unauthRouter

  const errorHandler =
    (handler) =>
    async (...args) => {
      try {
        await handler(...args);
      } catch (err) {
        console.log("catched error", err);

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
    const token = socket.handshake.auth.token;
    console.log("auth", socket.handshake.auth);
    if (!token) {
      return next(); // 允许未登录用户继续连接
    }

    authenticateToken(token)
      .then((user) => {
        console.log("authenticateToken", user);
        socket.user = user;
        next();
      })
      .catch((err) => {
        console.error("Authentication error:", err);
        next(new Error("Authentication error"));
      });
  });

  io.on("connection", (socket) => {
    console.log("a user connected");

    socket.emit(
      "userInfo",
      socket.user
        ? { username: socket.user.username, token: socket.handshake.auth.token }
        : {}
    );

    if (socket.user) {
      emitFolders(socket, socket.user._id);
    }
    router(socket);
    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });
}

module.exports = {
  startSocket,
};
