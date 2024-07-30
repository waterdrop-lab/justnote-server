const socketIo = require("socket.io");

const User = require("./models/User");
const Folder = require("./models/Folder");
const Note = require("./models/Note");
const AuthToken = require("./models/AuthToken");
const { errorToJSON, errorLog } = require("./utils");
const { authRouter, unauthRouter, emitFolders } = require("./websocketRoutes");

const errorCode = {
  unauth: 401,
  noteNotExist: "noteNotExist",
};

function router(socket) {
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
    socket.on(message, errorHandler(authHandler(handler.bind({ socket }))));
  });
  unauthRouter.forEach((handler, message) => {
    socket.on(message, errorHandler(handler.bind({ socket })));
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
