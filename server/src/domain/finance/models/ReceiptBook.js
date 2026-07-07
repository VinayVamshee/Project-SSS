const mongoose = require("mongoose");

const ReceiptBookSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    prefix: {
        type: String,
        required: true
    },
    suffix: {
        type: String,
        default: ""
    },
    paddingLength: {
        type: Number,
        default: 5
    },
    separator: {
        type: String,
        default: "-"
    },
    resetPolicy: {
        type: String,
        enum: [
            "never",
            "yearly",
            "monthly"
        ],
        default: "yearly"
    },
    counterKey: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("ReceiptBook", ReceiptBookSchema);
