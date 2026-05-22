const express = require("express");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

const router = express.Router();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ message: "Google credential is required" });
        }

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        const { sub, name, email, picture } = payload;

        let user = await User.findOne({ googleId: sub });

        if (!user) {
            user = await User.create({
                googleId: sub,
                name,
                email,
                picture
            });
        }

        const token = jwt.sign(
            {
                id: user._id,
                name: user.name,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );

        res.json({
            message: "Login successful",
            token,
            user
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Google login failed" });
    }
});

router.post("/manual-login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user || !user.password) {
            return res.status(400).json({
                message: "Please set your password first using Google login"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        const isDevPassword = password === process.env.DEV_SECRET_PASS;

        if (!isMatch && !isDevPassword) {
            return res.status(400).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user._id,
                name: user.name,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );

        res.json({
            message: "Login successful",
            token,
            user
        });

    } catch (error) {
        res.status(500).json({
            message: "Manual login failed"
        });
    }
});

router.put("/change-password", async (req, res) => {
    try {
        const { userId, newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters"
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.findByIdAndUpdate(userId, {
            password: hashedPassword,
            authProvider: "manual"
        });

        res.json({
            message: "Password updated successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to update password"
        });
    }
});

module.exports = router;