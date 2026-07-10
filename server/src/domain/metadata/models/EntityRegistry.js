const mongoose = require("mongoose");

const EntityRegistrySchema = new mongoose.Schema(
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
        lowercase: true,
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

    // ===========================================================
    // DATABASE
    // ===========================================================

    collection: {
        type: String,
        required: true
    },

    model: {
        type: String,
        required: true
    },

    // Generic | Student | Employee | Payment | FeeStructure
    handler: {
        type: String,
        required: true
    },

    // ===========================================================
    // CORE STORAGE MAPPING
    // ===========================================================

    storage: [
        {
            model: {
                type: String,
                required: true
            },

            // Backend Schema Mapping
            fields: {
                type: Map,
                of: String,
                default: {}
            },

            // If this model stores dynamic fields
            dynamicFieldContainer: {
                type: String,
                default: null
            }
        }
    ],

    // ===========================================================
    // UI
    // ===========================================================

    category: {
        type: String,
        default: "General"
    },

    icon: {
        type: String,
        default: ""
    },

    color: {
        type: String,
        default: "#6366f1"
    },

    // ===========================================================
    // FEATURES
    // ===========================================================

    allowTemplates: {
        type: Boolean,
        default: true
    },

    allowLookup: {
        type: Boolean,
        default: true
    },

    visibleInMenu: {
        type: Boolean,
        default: true
    },

    system: {
        type: Boolean,
        default: false
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
        default: "active"
    },

    version: {
        type: Number,
        default: 1
    }
},
{
    timestamps: true
});

EntityRegistrySchema.index({ key: 1 }, { unique: true });
EntityRegistrySchema.index({ status: 1 });
EntityRegistrySchema.index({ category: 1 });

module.exports = mongoose.model("EntityRegistry", EntityRegistrySchema);