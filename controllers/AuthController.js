const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const validator = require("validator");

let refreshTokens = [];
let otps = {};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MFA_EMAIL_USER,
    pass: process.env.MFA_EMAIL_PASS,
  },
});

const OTP_EXPIRATION_TIME = 60 * 1000; // 1 phút

const AuthController = {
  register: async (req, res) => {
    try {
      const { fullName, email, password } = req.body;

      // Kiểm tra tính hợp lệ của email
      if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Invalid email format." });
      }

      // Tạo hash mật khẩu
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);

      // Tạo người dùng mới
      const newUser = new User({
        fullName,
        email,
        password: hashed,
      });

      // Lưu người dùng mới
      const user = await newUser.save();
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error." });
    }
  },

  generateAccessToken: (user) => {
    return jwt.sign(
      {
        id: user.id,
        admin: user.admin,
      },
      process.env.JWT_ACCESS_TOKEN,
      { expiresIn: "30s" }
    );
  },

  generateRefreshToken: (user) => {
    return jwt.sign(
      {
        id: user.id,
        admin: user.admin,
      },
      process.env.JWT_REFRESH_TOKEN,
      { expiresIn: "7d" }
    );
  },

  loginUser: async (req, res) => {
    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        return res.status(403).json({ message: "Invalid email." });
      }

      const validPassword = await bcrypt.compare(
        req.body.password,
        user.password
      );
      if (!validPassword) {
        return res.status(403).json({ message: "Invalid password." });
      }

      // Nếu tên đăng nhập và mật khẩu đúng, tạo mã OTP
      const otp = crypto.randomInt(100000, 999999); // Tạo mã OTP ngẫu nhiên 6 chữ số
      const expirationTime = Date.now() + OTP_EXPIRATION_TIME; // Thời gian hết hạn

      // Lưu OTP và thời gian hết hạn
      otps[user.email] = { otp, expirationTime };

      // Gửi OTP qua email
      const mailOptions = {
        from: process.env.MFA_EMAIL_USER,
        to: user.email,
        subject: "OTP Verification Code",
        text: `Your OTP code is: ${otp}. It is valid for 60 seconds.`,
      };

      await transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return res.status(500).json({ message: "Error sending OTP email." });
        } else {
          res.status(200).json({ message: "OTP has been sent to your email." });
        }
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal server error." });
    }
  },

  verifyOtp: async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(403).json({ message: "Invalid email." });
    }

    const savedOtpData = otps[email];

    // Kiểm tra OTP có tồn tại không
    if (!savedOtpData) {
      return res.status(403).json({ message: "OTP does not exist." });
    }

    const { otp: savedOtp, expirationTime } = savedOtpData;

    // Kiểm tra thời gian hết hạn của OTP
    if (Date.now() > expirationTime) {
      // Xóa OTP nếu đã hết hạn
      delete otps[email];
      return res.status(403).json({ message: "OTP has expired." });
    }

    // Kiểm tra OTP có khớp không
    if (savedOtp == otp) {
      // Xóa OTP sau khi xác thực thành công
      delete otps[email];

      // Tạo accessToken và refreshToken
      const accessToken = AuthController.generateAccessToken(user);
      const refreshToken = AuthController.generateRefreshToken(user);
      refreshTokens.push(refreshToken);

      // res.cookie("refresh_token", refreshToken, {
      //   httpOnly: true,
      //   secure: false,
      //   sameSite: "None",
      //   path: "/",
      //   maxAge: 7 * 24 * 60 * 60 * 1000, // Cookie tồn tại trong 7 ngày
      // });

      const { password, ...props } = user._doc;
      return res.status(200).json({ props, accessToken, refreshToken });
    } else {
      return res.status(403).json({ message: "Invalid OTP." });
    }
  },

  requestRefreshToken: (req, res) => {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      return res.status(403).json({ message: "You're not authenticated." });
    }
    // if (!refreshTokens.includes(refreshToken)) {
    //   return res.status(403).json({ message: "Refresh Token is not valid." });
    // }
    jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN, (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Token is not valid." });
      }
      refreshTokens = refreshTokens.filter(
        (token) => token !== req.cookies.refresh_token
      );

      const newAccessToken = AuthController.generateAccessToken(user);
      const newRefreshToken = AuthController.generateRefreshToken(user);
      refreshTokens.push(newRefreshToken);

      // res.cookie("refresh_token", newRefreshToken, {
      //   httpOnly: true,
      //   secure: false,
      //   path: "/",
      //   sameSite: "None",
      // });
      res.status(200).json({ accessToken: newAccessToken });
    });
  },
};

module.exports = AuthController;
