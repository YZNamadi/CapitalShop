const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const crypto = require("crypto");
// const otp = require("otp-generator");
const sendMail = require("../helper/email");
const emailTemplate = require("../helper/register");
const createError = require("../utils/error");

// const User = require("../models/User");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const { validationResult } = require("express-validator");
// const crypto = require("crypto");
// const createError = require("../utilities/error");
// const sendMail = require("../utilities/sendMail");
// const emailTemplate = require("../utilities/emailTemplate");

// Register
const registerUser = async (req, res, next) => {
  try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
          return next(createError(400, errors.array()[0].msg));
      }

      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
          return next(createError(400, "User already exists"));
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");

      // Create user
      const newUser = new User({
          name,
          email,
          password: hashedPassword,
          isVerified: false,
          verificationToken,
      });

      await newUser.save();

      try {
          const subject = "Verify Your Email";
          const verifyLink = `${req.protocol}://${req.get("host")}/api/users/verify-email/${verificationToken}`;
          await sendMail({
              email: newUser.email,
              subject,
              text: `Welcome ${newUser.name}, Kindly use this link to verify your email: ${verifyLink}`,
              html: emailTemplate(verifyLink, newUser.name),
          });

          res.status(201).json({
              message: "User registered successfully. Check your email to verify your account.",
          });
      } catch (error) {
          console.error("Failed to send verification email:", error.message);
          return next(createError(500, "Failed to send verification email. Please try again later."));
      }
  } catch (error) {
      next(error);
  }
};

// Login User
const loginUser = async (req, res, next) => {
  try {
      const { email, password } = req.body;

      if (!email || !password) {
          console.error("Missing email or password");
          return next(createError(400, "Email and password are required."));
      }

      
      const user = await User.findOne({ email });
      if (!user) {
          console.error("User not found for email:", email);
          return next(createError(401, "Invalid email or password"));
      }

  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          console.error("Password mismatch for email:", email);
          return next(createError(401, "Invalid email or password"));
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

      // Return success response
      res.json({ message: "Login successful", token });
  } catch (error) {
      console.error("Error during login:", error.message);
      return next(createError(500, "Internal server error"));
  }
};

// module.exports = { registerUser, loginUser };

// Logout User
const logoutUser = (req, res) => {
    res.clearCookie("token");
    res.status(200).json({ message: "Logged out successfully" });
};

// Get User Profile
const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId).select("-password");
        if (!user) return next(createError(404, "User not found"));

        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

// Verify Email
const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({ verificationToken: token });

        if (!user) return next(createError(400, "Invalid or expired verification token"));

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        res.status(200).json({ message: "Email verified successfully. You can now log in." });
    } catch (error) {
        next(error);
    }
};

// Refresh Token
const refreshToken = async (req, res, next) => {
    try {
        const refreshToken = req.headers.authorization?.split(" ")[1];
        if (!refreshToken) return next(createError(401, "Access denied. No token provided."));

        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) return next(createError(404, "User not found"));

        const newAccessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.json({ accessToken: newAccessToken });
    } catch {
        next(createError(403, "Invalid or expired token"));
    }
};

// Export all functions
module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getUserProfile,
    verifyEmail,
    refreshToken,
};
