const express = require("express");
const crypto = require("crypto");
const pool = require("../db/pool");
const requireAuth = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      error: "Group name is required",
    });
  }

  const normalizedName = name.trim();

  if (normalizedName.length > 100) {
    return res.status(400).json({
      error: "Group name must be 100 characters or fewer",
    });
  }

  const inviteCode = crypto.randomBytes(24).toString("hex");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const groupResult = await client.query(
      `INSERT INTO groups (name, invite_code, owner_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, book_id, invite_code, owner_id, created_at`,
      [normalizedName, inviteCode, req.session.userId]
    );

    const group = groupResult.rows[0];

    await client.query(
      `INSERT INTO group_members (group_id, user_id)
       VALUES ($1, $2)`,
      [group.id, req.session.userId]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      group,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Create group error:", error);

    return res.status(500).json({
      error: "Unable to create group",
    });
  } finally {
    client.release();
  }
});

router.get("/", requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
           g.id,
           g.name,
           g.book_id,
           g.owner_id,
           g.created_at
         FROM groups g
         JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = $1
         ORDER BY g.created_at DESC`,
        [req.session.userId]
      );
  
      return res.status(200).json({
        groups: result.rows,
      });
    } catch (error) {
      console.error("Get groups error:", error);
  
      return res.status(500).json({
        error: "Unable to retrieve groups",
      });
    }
  });
  
module.exports = router;