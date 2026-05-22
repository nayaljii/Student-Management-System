const express = require("express");
const User = require("../models/User");
const Student = require("../models/Student");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 }).select("-password");
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch users" });
    }
});

router.get("/students/:userId", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const students = await Student.find({
            createdBy: req.params.userId
        }).sort({ createdAt: -1 });

        res.json(students);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch user students" });
    }
});

router.put("/student/:id", authMiddleware, adminMiddleware, async (req, res) => {

    try {

        const student =
            await Student.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true }
            );

        if (!student) {

            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.json({
            message: "Student updated successfully",
            student
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to update student"
        });
    }
});

router.delete("/student/:id", authMiddleware, adminMiddleware, async (req, res) => {

    try {

        const student =
            await Student.findByIdAndDelete(
                req.params.id
            );

        if (!student) {

            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.json({
            message: "Student deleted successfully"
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to delete student"
        });
    }
});

module.exports = router;