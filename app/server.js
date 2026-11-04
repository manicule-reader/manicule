require("dotenv").config();
const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
  socket.on("join", (room) => {
    socket.join(room);
    socket.data.room = room;
  });

  socket.on("message", (msg) => {
    io.to(socket.data.room).emit("message", msg);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Listening at: http://localhost:${port}`);
});