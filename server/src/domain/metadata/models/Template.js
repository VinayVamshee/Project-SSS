const mongoose = require("mongoose");

// ===========================================================
// TEMPLATE FIELD
// ===========================================================

const TemplateFieldSchema = new mongoose.Schema(
{
    fieldId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FieldRegistry",
        required: true
    },

    order: {
        type: Number,
        default: 1,
        min: 1
    },

    // =======================================================
    // FIELD SETTINGS
    // =======================================================

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

    // =======================================================
    // UI
    // =======================================================

    width: {
        type: Number,
        default: 12,
        min: 1,
        max: 12
    },

    placeholder: {
        type: String,
        default: ""
    },

    helperText: {
        type: String,
        default: ""
    },

    // =======================================================
    // DEFAULT VALUE
    // =======================================================

    defaultValue: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },

    // =======================================================
    // VALIDATION OVERRIDES
    // =======================================================

    validation: {

        min: Number,

        max: Number,

        minLength: Number,

        maxLength: Number,

        pattern: String,

        message: String

    }

},
{
    _id: false
});


// ===========================================================
// TEMPLATE SECTION
// ===========================================================

const TemplateSectionSchema = new mongoose.Schema(
{
    label: {
        type: String,
        default: ""
    },

    description: {
        type: String,
        default: ""
    },

    icon: {
        type: String,
        default: ""
    },

    order: {
        type: Number,
        default: 1,
        min: 1
    },

    collapsible: {
        type: Boolean,
        default: false
    },

    collapsedByDefault: {
        type: Boolean,
        default: false
    },

    fields: [TemplateFieldSchema]

},
{
    _id: true
});


// ===========================================================
// TEMPLATE
// ===========================================================

const TemplateSchema = new mongoose.Schema(
{
    isGlobalRegistry: {
        type: Boolean,
        default: true
    },

    // =======================================================
    // BASIC INFORMATION
    // =======================================================

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

    purpose: {
        type: String,
        required: true,
        enum: [

            "student_registration",
            "student_information",
            "student_promotion",
            "student_transfer",
            "student_tc",
            "student_import",

            "employee_registration",
            "employee_information",

            "fee_structure",
            "student_fee_payment",
            "assessment_setup",
            "student_marks"

        ]
    },

    // =======================================================
    // ENTITY
    // =======================================================

    entity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EntityRegistry",
        required: true
    },

    // =======================================================
    // VISIBILITY
    // =======================================================

    scope: {
        type: String,
        enum: [
            "global",
            "selectedSchools"
        ],
        default: "global"
    },

    schools: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School"
        }
    ],

    // =======================================================
    // FORM LAYOUT
    // =======================================================

    sections: [TemplateSectionSchema],

    // =======================================================
    // TEMPLATE SETTINGS
    // =======================================================

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

    // =======================================================
    // STATUS
    // =======================================================

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
