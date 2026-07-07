const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true,
        index: true
    },
    studentCode: {
        type: String,
        required: true,
        trim: true
    },
    lifecycleStatus: {
        type: String,
        enum: [
            "Active",
            "Inactive",
            "Transferred",
            "Alumni"
        ],
        default: "Active"
    }
}, {
    timestamps: true
});

StudentSchema.index(
    {
        schoolId: 1,
        studentCode: 1
    },
    {
        unique: true
    }
);

module.exports = mongoose.model("Student", StudentSchema);
