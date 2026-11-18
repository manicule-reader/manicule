const express = require("express");
const pool = require("../db/pool");
const requireAuth = require("../middleware/auth");
const requireGroupMember = require("../middleware/groupAuth");

// mergeParams so :groupId from mount path is visible
const router = express.Router({ mergeParams: true });

const guard = [requireAuth, requireGroupMember];
const MAX_COMMENT = 5000;

function cleanBody(body) {
  if (typeof body !== "string" || !body.trim()) return null;
  const trimmed = body.trim();
  return trimmed.length > MAX_COMMENT ? null : trimmed;
}

// create a thread on a highlighted range + its first comment
router.post("/threads", guard, async (req, res) => {
  const groupId = Number(req.params.groupId);
  const { passage_id, start_offset, end_offset } = req.body;
  const body = cleanBody(req.body.body);

  if (
    !Number.isInteger(passage_id) ||
    !Number.isInteger(start_offset) ||
    !Number.isInteger(end_offset) ||
    start_offset < 0 ||
    end_offset <= start_offset
  ) {
    return res.status(400).json({ error: "Invalid passage or range" });
  }
  if (!body) {
    return res.status(400).json({
      error: `Comment is required (max ${MAX_COMMENT} characters)`,
    });
  }

  const client = await pool.connect();
  try {
    // passage must belong to this group's book and also need its length
    const passage = await client.query(
      `SELECT p.body
       FROM passages p
       JOIN groups g ON g.book_id = p.book_id
       WHERE p.id = $1 AND g.id = $2`,
      [passage_id, groupId]
    );
    if (passage.rows.length === 0) {
      return res.status(404).json({ error: "Passage not found in this group's book" });
    }

    if (end_offset > passage.rows[0].body.length) {
      return res.status(400).json({ error: "Range is outside the passage" });
    }

    await client.query("BEGIN");
    const thread = await client.query(
      `INSERT INTO threads (group_id, passage_id, start_offset, end_offset, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, group_id, passage_id, start_offset, end_offset, created_by, created_at`,
      [groupId, passage_id, start_offset, end_offset, req.session.userId]
    );
    const comment = await client.query(
      `INSERT INTO comments (thread_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, thread_id, user_id, body, created_at`,
      [thread.rows[0].id, req.session.userId, body]
    );
    await client.query("COMMIT");

    req.app.get("io").to(`group:${groupId}`).emit("thread:new", {
      thread: thread.rows[0],
    });

    return res.status(201).json({
      thread: thread.rows[0],
      comment: comment.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Create thread error:", error);
    return res.status(500).json({ error: "Unable to create thread" });
  } finally {
    client.release();
  }
});

// all of  group's highlights in one section (for drawing on load)
router.get("/sections/:seq/threads", guard, async (req, res) => {
  const groupId = Number(req.params.groupId);
  const seq = Number(req.params.seq);
  if (!Number.isInteger(seq)) {
    return res.status(400).json({ error: "Invalid section" });
  }

  try {
    const result = await pool.query(
      `SELECT t.id, t.passage_id, t.start_offset, t.end_offset,
              t.created_by, t.created_at
       FROM threads t
       JOIN passages p ON p.id = t.passage_id
       JOIN sections s ON s.id = p.section_id
       WHERE t.group_id = $1 AND s.seq = $2
       ORDER BY p.seq, t.start_offset`,
      [groupId, seq]
    );
    return res.json({ threads: result.rows });
  } catch (error) {
    console.error("List threads error:", error);
    return res.status(500).json({ error: "Unable to load threads" });
  }
});

// Comments on one thread 
router.get("/threads/:threadId/comments", guard, async (req, res) => {
  const groupId = Number(req.params.groupId);
  const threadId = Number(req.params.threadId);
  if (!Number.isInteger(threadId)) {
    return res.status(400).json({ error: "Invalid thread" });
  }

  try {
    const thread = await pool.query(
      "SELECT 1 FROM threads WHERE id = $1 AND group_id = $2",
      [threadId, groupId]
    );
    if (thread.rows.length === 0) {
      return res.status(404).json({ error: "Thread not found" });
    }

    const result = await pool.query(
      `SELECT c.id, c.body, c.created_at, u.username
       FROM comments c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.thread_id = $1
       ORDER BY c.created_at, c.id`,
      [threadId]
    );
    return res.json({ comments: result.rows });
  } catch (error) {
    console.error("List comments error:", error);
    return res.status(500).json({ error: "Unable to load comments" });
  }
});

// Reply to a thread
router.post("/threads/:threadId/comments", guard, async (req, res) => {
  const groupId = Number(req.params.groupId);
  const threadId = Number(req.params.threadId);
  const body = cleanBody(req.body.body);
  if (!Number.isInteger(threadId)) {
    return res.status(400).json({ error: "Invalid thread" });
  }
  if (!body) {
    return res.status(400).json({
      error: `Comment is required (max ${MAX_COMMENT} characters)`,
    });
  }

  try {
    // insert only if the thread is in this group
    const result = await pool.query(
      `WITH c AS (
        INSERT INTO comments (thread_id, user_id, body)
        SELECT t.id, $3, $4 FROM threads t
        WHERE t.id = $1 AND t.group_id = $2
        RETURNING id, thread_id, user_id, body, created_at
      )
      SELECT c.*, u.username FROM c LEFT JOIN users u ON u.id = c.user_id`,
      [threadId, groupId, req.session.userId, body]
    );
    //  t.group_id = $2 check stops a member of group A reading group B's threads by guessing ids
    //  Candidate for Ruhma's requireThreadInGroup middleware in #33
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Thread not found" });
    }
    const comment = result.rows[0];
    req.app.get("io").to(`group:${groupId}`).emit("comment:new", comment);
    return res.status(201).json({ comment });
  } catch (error) {
    console.error("Reply error:", error);
    return res.status(500).json({ error: "Unable to post comment" });
  }
});

module.exports = router;