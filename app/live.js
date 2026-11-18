const { Server } = require("socket.io");
const pool = require("./db/pool");

function setupLive(server, sessionMiddleware) {
  const io = new Server(server);

  io.engine.use(sessionMiddleware);

  io.use((socket, next) => {
    if (socket.request.session?.userId) return next();
    next(new Error("Authentication required"));
  });

  io.on("connection", (socket) => {
    const userId = socket.request.session.userId;

    // same check as requireGroupMember
    socket.on("join-group", async (groupId, ack) => {
      if (typeof ack !== "function") ack = () => {};
      const id = Number(groupId);
      if (!Number.isInteger(id)) return ack({ ok: false, error: "Invalid group" });
      try {
        const result = await pool.query(
          "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
          [id, userId]
        );
        if (result.rows.length === 0) {
          return ack({ ok: false, error: "You are not a member of this group" });
        }
        socket.join(`group:${id}`);
        ack({ ok: true });
      } catch (error) {
        console.error("Socket join error:", error);
        ack({ ok: false, error: "Unable to join group" });
      }
    });
  });

  return io;
}

module.exports = setupLive;