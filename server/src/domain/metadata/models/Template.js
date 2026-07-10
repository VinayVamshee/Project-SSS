const mongoose = require("mongoose");

const TemplateSchema = new mongoose.Schema(
{
    isGlobalRegistry: {
        type: Boolean,
        default: true
    },

    // ===========================================================
    // BASIC INFORMATION
    // ===========================================================

    key: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
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

    // ===========================================================
    // ENTITY
    // ===========================================================

    entity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EntityRegistry",
        required: true
    },

    // ===========================================================
    // VISIBILITY
    // ===========================================================

    scope: {
        type: String,
        enum: [
            "global",
            "selectedSchools"
        ],
        default: "global"
    },

    schools: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "School"
    }],

    // ===========================================================
    // FIELDS
    // ===========================================================

    fields: [

        {

            fieldId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "FieldRegistry",
                required: true
            },

            order: {
                type: Number,
                default: 1
            },

            // Validation

            required: {
                type: Boolean,
                default: false
            },

            unique: {
                type: Boolean,
                default: false
            },

            readOnly: {
                type: Boolean,
                default: false
            },

            hidden: {
                type: Boolean,
                default: false
            },

            // UI

            width: {
                type: Number,
                default: 12
            },

            placeholder: {
                type: String,
                default: ""
            },

            helperText: {
                type: String,
                default: ""
            },

            // Default value

            defaultValue: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            },

            // Validation Overrides

            validation: {

                min: Number,

                max: Number,

                minLength: Number,

                maxLength: Number,

                pattern: String,

                message: String

            }
        }

    ],

    // ===========================================================
    // TEMPLATE SETTINGS
    // ===========================================================

    settings: {

        allowCreate: {
            type: Boolean,
            default: true
        },

        allowEdit: {
            type: Boolean,
            default: true
        },

        allowDelete: {
            type: Boolean,
            default: true
        },

        allowExport: {
            type: Boolean,
            default: true
        }

    },

    // ===========================================================
    // STATUS
    // ===========================================================

    status: {
        type: String,
        enum: [
            "draft",
            "active",
            "archived"
        ],
        default: "draft"
    },

    version: {
        type: Number,
        default: 1
    }

},
{
    timestamps: true
});

module.exports = mongoose.model("Template", TemplateSchema);
