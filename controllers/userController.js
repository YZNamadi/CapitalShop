const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const crypto = require("crypto");
// const otp = require("otp-generator");
const sendMail = require("../helper/email");
const emailTemplate = require("../helper/register");
const createError = require("../utils/error");


// Register
const registerUser = async (req, res, next) => {
  try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
          return next(createError(400, errors.array()[0].msg));
      }

      const { name, email, password } = req.body;

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
          return next(createError(400, "Please provide a valid email address"));
      }

      // Validate password strength
      if (password.length < 8) {
          return next(createError(400, "Password must be at least 8 characters long"));
      }

      // Check if user already exists - case insensitive email check
      const existingUser = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
      if (existingUser) {
          return next(createError(409, "An account with this email already exists. Please login or use a different email."));
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");

      // Create user
      const newUser = new User({
          name,
          email: email.toLowerCase(), // Store email in lowercase
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
              success: true,
              message: "Registration successful! Please check your email to verify your account.",
              data: {
                  name: newUser.name,
                  email: newUser.email,
                  isVerified: newUser.isVerified
              }
          });
      } catch (error) {
          console.error("Failed to send verification email:", error.message);
          // Delete the user if email sending fails
          await User.findByIdAndDelete(newUser._id);
          return next(createError(500, "Failed to complete registration due to email service error. Please try again later."));
      }
  } catch (error) {
      console.error("Registration error:", error);
      next(createError(500, "Registration failed. Please try again later."));
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
      res.json({ message: "Login successful",
         data: user,
         token
         });
  } catch (error) {
      console.error("Error during login:", error.message);
      return next(createError(500, "Internal server error"));
  }
};

// module.exports = { registerUser, loginUser };

// Logout User
const logoutUser = (req, res) => {
    try {
        res.clearCookie("token");
        res.status(200).json({ 
            success: true,
            message: "Logged out successfully" 
        });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ 
            success: false,
            message: "Error during logout",
            error: error.message
        });
    }
};

// Get User Profile
const getUserProfile = async (req, res, next) => {
    try {
        // Extract user ID from JWT token
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return next(createError(401, "No token provided"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select("-password");
        
        if (!user) {
            return next(createError(404, "User not found"));
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error("Get profile error:", error);
        if (error.name === 'JsonWebTokenError') {
            return next(createError(401, "Invalid token"));
        }
        if (error.name === 'TokenExpiredError') {
            return next(createError(401, "Token expired"));
        }
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
