const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const noteRoutes = require("./routes/noteRoutes");
const userRoutes = require("./routes/userRoutes");
const http = require("node:http");
const { startSocket } = require("./websocket");

const app = express();
const PORT = process.env.PORT || 5002;

mongoose.connect("mongodb://localhost:27017/justnote", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(cors());
app.use(bodyParser.json());
app.use("/api", userRoutes);

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

startSocket(server);