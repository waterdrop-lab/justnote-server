require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("node:http");
const { startSocket } = require("./websocket");
const systemLogRoutes = require("./routes/systemLogRoutes");
const { errorLog } = require("./utils");

const app = express();
const PORT = process.env.PORT || 5002;

process.on("uncaughtException", (err) => {
  errorLog(err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  errorLog(reason);
  process.exit(1);
});

mongoose.connect(process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(cors());
app.use(bodyParser.json());
app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.use("/api", systemLogRoutes);


const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

startSocket(server);
