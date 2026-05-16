const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
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

    marks: {
        subject1: { type: Number, default: 0 },
        subject2: { type: Number, default: 0 },
        subject3: { type: Number, default: 0 }
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });

module.exports = mongoose.model("Student", studentSchema);