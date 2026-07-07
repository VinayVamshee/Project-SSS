const mongoose = require("mongoose");

/**
 * EntityRegistry
 *
 * Master catalog of all business entities in SSS.
 * Every Template, Lookup, Report and Dynamic Form references an Entity
 * instead of hardcoding model names.
 */

const EntityRegistrySchema = new mongoose.Schema({

    // Excluded from multi-tenant plugin
    isGlobalRegistry: {
        type: Boolean,
        default: true
    },

    // Stable machine key
    key: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    // Human readable name
    label: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        default: ""
    },

    // Mongo collection name
    collection: {
        type: String,
        required: true
    },

    // Mongoose model name
    model: {
        type: String,
        required: true
    },

    // Sidebar grouping
    category: {
        type: String,
        default: "General"
    },

    // UI
    icon: {
        type: String,
        default: ""
    },

    color: {
        type: String,
        default: "#6366f1"
    },

    // Capabilities
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

    // Prevent deletion of core entities
    system: {
        type: Boolean,
        default: false
    },

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

}, {
    timestamps: true
});

EntityRegistrySchema.index({ key: 1 }, { unique: true });
EntityRegistrySchema.index({ status: 1 });
EntityRegistrySchema.index({ category: 1 });

module.exports = mongoose.model("EntityRegistry", EntityRegistrySchema);