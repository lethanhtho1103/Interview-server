const User = require("../models/User");

class UserController {
  async getAllUsers(req, res, next) {
    try {
      const user = await User.find();
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      await User.findById(req.params.id);
      res.status(200).json("delete successfully");
    } catch (error) {
      res.status(500).json(error);
    }
  }
}

module.exports = new UserController();
