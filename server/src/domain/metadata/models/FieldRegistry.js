const mongoose = require("mongoose");

const FieldRegistrySchema = new mongoose.Schema({
    isGlobalRegistry: {
        type: Boolean,
        default: true
    },
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    label: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ""
    },
    category: {
        type: String,
        default: "General"
    },
    type: {
        type: String,
        required: true,
        enum: [
            "text", "textarea", "number", "currency", "date", "datetime", "time",
            "email", "phone", "password", "checkbox", "switch", "radio", "select",
            "multiselect", "lookup", "file", "image"
        ]
    },
    placeholder: {
        type: String,
        default: ""
    },
    helperText: {
        type: String,
        default: ""
    },
    required: {
        type: Boolean,
        default: false
    },
    unique: {
        type: Boolean,
        default: false
    },
    min: Number,
    max: Number,
    minLength: Number,
    maxLength: Number,
    validationPattern: {
        type: String,
        default: ""
    },
    validationMessage: {
        type: String,
        default: ""
    },
    defaultValue: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    options: [{
        label: String,
        value: String
    }],
    lookup: {
        entity: {
            type: String,
            default: null
        },
        displayField: {
            type: String,
            default: "name"
        },
        valueField: {
            type: String,
            default: "_id"
        },
        multiple: {
            type: Boolean,
            default: false
        },
        searchable: {
            type: Boolean,
            default: true
        }
    },
    ui: {
        icon: {
            type: String,
            default: ""
        },
        color: {
            type: String,
            default: ""
        },
        width: {
            type: Number,
            default: 12
        }
    },
    status: {
        type: String,
        enum: ["draft", "active", "archived"],
        default: "draft"
    },
    version: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("FieldRegistry", FieldRegistrySchema);
