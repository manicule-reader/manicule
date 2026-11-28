const pool = require("../db/pool");

async function requireGroupMember(req, res, next) {
  const groupId = Number(req.params.groupId);

  if (!Number.isInteger(groupId)) {
    return res.status(400).json({
      error: "Valid group ID is required",
    });
  }

  try {
    const result = await pool.query(
      `SELECT 1
       FROM group_members
       WHERE group_id = $1
         AND user_id = $2`,
      [groupId, req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: "You are not a member of this group",
      });
    }

    next();
  } catch (error) {
    console.error("Group authorization error:", error);

    return res.status(500).json({
      error: "Unable to verify group membership",
    });
  }
}

module.exports = requireGroupMember;