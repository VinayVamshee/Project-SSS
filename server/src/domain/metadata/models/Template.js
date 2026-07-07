const mongoose = require('mongoose');

const TemplateSchema = new mongoose.Schema({
    isGlobalRegistry: {
        type: Boolean,
        default: true
    },
    key: {
        type: String,
        required: true,
        unique: true
    },
    label: {
        type: String,
        required: true
    },
    description: String,
    entity: {
        type: String,
        required: true
    },
    scope: {
        type: String,
        enum: ["global", "selectedSchools"],
        default: "global"
    },
    schools: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "School"
    }],
    status: {
        type: String,
        enum: ["draft", "active", "archived"],
        default: "draft"
    },
    version: {
        type: Number,
        default: 1
    },
    fields: [
        {
            fieldId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "FieldRegistry",
                required: true
            },
            order: {
                type: Number,
                required: true
            },
            required: {
                type: Boolean,
                default: false
            },
            hidden: {
                type: Boolean,
                default: false
            },
            readonly: {
                type: Boolean,
                default: false
            },
            width: {
                type: Number,
                default: 12
            }
        }
    ]
}, {
    timestamps: true
});

module.exports = mongoose.model('Template', TemplateSchema);
