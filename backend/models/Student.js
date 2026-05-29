const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    fatherName: { type: String, required: true },
    rollNo: { type: String, required: true },
    course: { type: String, required: true },
    semester: { type: String, required: true },
    email: String,
    phone: String,
    address: String,
    photo: String,

    attendance: {
        present: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },

    attendanceHistory: [
        {
            date: String,
            month: String,
            present: {
                type: Number,
                default: 0
            },
            total: {
                type: Number,
                default: 0
            }
        }
    ],

    dailyAttendance: [
        {
            date: String,
            status: String
        }
    ],

    marks: {
        obtained: { type: Number, default: 0 },
        outOf: { type: Number, default: 100 }
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });

module.exports = mongoose.model("Student", studentSchema);