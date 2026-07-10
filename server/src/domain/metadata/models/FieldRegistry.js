const mongoose = require("mongoose");

const FieldRegistrySchema = new mongoose.Schema(
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

    category: {
        type: String,
        default: "General"
    },

    // ===========================================================
    // FIELD TYPE
    // ===========================================================

    type: {
        type: String,
        required: true,
        enum: [
            "text",
            "textarea",
            "number",
            "currency",
            "percentage",
            "date",
            "datetime",
            "time",
            "email",
            "phone",
            "password",
            "checkbox",
            "switch",
            "radio",
            "select",
            "multiselect",
            "lookup",
            "file",
            "image"
        ]
    },

    // ===========================================================
    // STATIC OPTIONS
    // (Only for Select / Radio / MultiSelect)
    // ===========================================================

    options: [
        {
            label: String,
            value: String
        }
    ],

    // ===========================================================
    // LOOKUP CONFIGURATION
    // ===========================================================

    lookup: {

        // Entity to search
        entity: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EntityRegistry",
            default: null
        },

        // Which field should be displayed

        displayField: {

            // field key OR core property
            field: {
                type: String,
                default: null
            },

            source: {
                type: String,
                enum: [
                    "core",
                    "dynamic",
                    "nested"
                ],
                default: "core"
            },

            path: {
                type: String,
                default: ""
            }
        },

        // Value stored in DB

        valueField: {
            type: String,
            default: "_id"
        },

        searchable: {
            type: Boolean,
            default: true
        },

        multiple: {
            type: Boolean,
            default: false
        },

        // Static lookup filters

        filters: [
            {
                field: String,

                source: {
                    type: String,
                    enum: [
                        "core",
                        "dynamic",
                        "nested"
                    ],
                    default: "core"
                },

                operator: {
                    type: String,
                    enum: [
                        "equals",
                        "notEquals",
                        "contains",
                        "startsWith",
                        "endsWith",
                        "in",
                        "notIn",
                        "greaterThan",
                        "lessThan",
                        "greaterThanOrEqual",
                        "lessThanOrEqual"
                    ],
                    default: "equals"
                },

                value: mongoose.Schema.Types.Mixed
            }
        ]
    },

    // ===========================================================
    // SYSTEM
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

module.exports = mongoose.model("FieldRegistry", FieldRegistrySchema);
