const express = require("express");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

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

module.exports = router;