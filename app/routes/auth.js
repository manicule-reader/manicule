const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db/pool");
const requireAuth = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
    const { username, email, password } = req.body;
  
    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Username, email, and password are required",
      });
    }
  
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();
  
    if (normalizedUsername.length < 3 || normalizedUsername.length > 50) {
      return res.status(400).json({
        error: "Username must be between 3 and 50 characters",
      });
    }
  
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({
        error: "Please enter a valid email address",
      });
    }
  
    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters",
      });
    }
  
    try {
      const passwordHash = await bcrypt.hash(password, 10);
  
      const result = await pool.query(
        `INSERT INTO users (username, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, username, email, created_at`,
        [normalizedUsername, normalizedEmail, passwordHash]
      );
  
      return res.status(201).json({
        user: result.rows[0],
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: "Username or email already exists",
        });
      }
  
      console.error("Registration error:", error);
      return res.status(500).json({
        error: "Unable to create account",
      });
    }
  });

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }
  
    try {
      const result = await pool.query(
        `SELECT id, username, email, password_hash
         FROM users
         WHERE email = $1`,
         [email.trim().toLowerCase()]
      );
  
      if (result.rows.length === 0) {
        return res.status(401).json({
          error: "Invalid email or password",
        });
      }
  
      const user = result.rows[0];
  
      const passwordMatches = await bcrypt.compare(
        password,
        user.password_hash
      );
  
      if (!passwordMatches) {
        return res.status(401).json({
          error: "Invalid email or password",
        });
      }
  
      req.session.userId = user.id;
  
      return res.status(200).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
  
      return res.status(500).json({
        error: "Unable to log in",
      });
    }
  });

  router.get("/me", requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, username, email, created_at
         FROM users
         WHERE id = $1`,
        [req.session.userId]
      );
  
      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "User not found",
        });
      }
  
      return res.status(200).json({
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Current user error:", error);
  
      return res.status(500).json({
        error: "Unable to retrieve user",
      });
    }
  });

  router.post("/logout", requireAuth, (req, res) => {
    req.session.destroy((error) => {
      if (error) {
        console.error("Logout error:", error);
  
        return res.status(500).json({
          error: "Unable to log out",
        });
      }
  
      res.clearCookie("connect.sid");
  
      return res.status(200).json({
        message: "Logged out successfully",
      });
    });
  });

module.exports = router;