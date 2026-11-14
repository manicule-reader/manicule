const express = require("express");
const crypto = require("crypto");
const pool = require("../db/pool");
const requireAuth = require("../middleware/auth");
const requireGroupMember = require("../middleware/groupAuth");

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  const { name, book_id } = req.body;

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

  if (!Number.isInteger(book_id)) {
    return res.status(400).json({
      error: "Valid book ID is required",
    });
  }

  try {
    const bookResult = await pool.query(
      "SELECT id FROM books WHERE id = $1",
      [book_id]
    );

    if (bookResult.rows.length === 0) {
      return res.status(404).json({
        error: "Book not found",
      });
    }
  } catch (error) {
    console.error("Book lookup error:", error);

    return res.status(500).json({
      error: "Unable to verify book",
    });
  }

  const inviteCode = crypto.randomBytes(24).toString("hex");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const groupResult = await client.query(
      `INSERT INTO groups (name, book_id, invite_code, owner_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, book_id, invite_code, owner_id, created_at`,
      [normalizedName, book_id, inviteCode, req.session.userId]
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

router.get("/:groupId", requireAuth, requireGroupMember, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
            g.id,
            g.name,
            g.book_id,
            g.owner_id,
            g.created_at
            FROM groups g
            WHERE g.id = $1`,
            [req.params.groupId]
        );
        return res.status(200).json({
            group: result.rows[0],
        });
    } catch (error) {
        console.error("Get group error:", error);
        return res.status(500).json({
            error: "Unable to retrieve group",
        });
    }
});

module.exports = router;