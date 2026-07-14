const mongoose = require('mongoose');

const assessmentConfigurationSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true
    },
    academicYearId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AcademicYear",
        required: true
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
        required: true
    },
    assessmentName: {
        type: String,
        required: true
    },
    displayOrder: {
        type: Number,
        default: 1
    },
    weightage: {
        type: Number,
        default: 100
    },
    status: {
        type: String,
        enum: ["Draft", "Published"],
        default: "Draft"
    },
    subjects: [
        {
            subjectId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Subject",
                required: true
            },
            selectedChapterIds: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Chapter"
                }
            ],
            maximumMarks: {
                type: Number,
                required: true
            },
            passingMarks: {
                type: Number,
                required: true
            },
            examDate: Date,
            duration: Number
        }
    ]
}, { timestamps: true });

assessmentConfigurationSchema.index({ academicYearId: 1, classId: 1, assessmentName: 1 }, { unique: true });

module.exports = mongoose.model('AssessmentConfiguration', assessmentConfigurationSchema);
