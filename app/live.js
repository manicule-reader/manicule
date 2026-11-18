const { Server } = require("socket.io");

function setupLive(server, sessionMiddleware) {
  const io = new Server(server);
  io.on("connection", (socket) => {
    console.log("socket connected", socket.id);
  });
  return io;
}

module.exports = setupLive;