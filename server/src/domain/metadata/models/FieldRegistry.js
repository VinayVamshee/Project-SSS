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
        entity: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EntityRegistry",
            default: null
        },
        sourceType: {
            type: String,
            enum: [
                "document",
                "nestedArray"
            ],
            default: "document"
        },
        arrayPath: {
            type: String,
            default: ""
        },
        displayField: {
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
        valueField: {
            field: {
                type: String,
                default: "_id"
            },
            source: {
                type: String,
                enum: [
                    "core",
                    "nested"
                ],
                default: "core"
            },
            path: {
                type: String,
                default: ""
            }
        },
        searchable: {
            type: Boolean,
            default: true
        },
        multiple: {
            type: Boolean,
            default: false
        },
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
