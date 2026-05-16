const express = require("express");
const Student = require("../models/Student");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
    try {
        const student = await Student.create({
            ...req.body,
            createdBy: req.user.id
        });

        res.status(201).json({
            message: "Student added successfully",
            student
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to add student" });
    }
});

router.get("/", authMiddleware, async (req, res) => {
    try {
        const students = await Student.find({ createdBy: req.user.id }).sort({ createdAt: -1 });

        res.json(students);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch students" });
    }
});

router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const student = await Student.findOneAndUpdate(
            { _id: req.params.id, createdBy: req.user.id },
            req.body,
            { new: true }
        );

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.json({
            message: "Student updated successfully",
            student
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to update student" });
    }
});

router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const student = await Student.findOneAndDelete({
            _id: req.params.id,
            createdBy: req.user.id
        });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.json({ message: "Student deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete student" });
    }
});

module.exports = router;