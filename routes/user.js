const express = require("express");
const router = express.Router();
const userController = require("../controllers/UserController");
const userMiddleware = require("../middlewares/userMiddleware");

// GET ALL USERS
router.get("/", userMiddleware.verifyToken, userController.getAllUsers);

// DELETE USER
router.delete(
  "/:id",
  userMiddleware.verifyUserAndAdminToken,
  userController.deleteUser
);

module.exports = router;
