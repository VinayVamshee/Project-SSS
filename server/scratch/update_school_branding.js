const mongoose = require('mongoose');
require('dotenv').config();

async function updateSchools() {
    try {
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/SSS';
        console.log('Connecting to:', mongoUrl);
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        const School = require('../Models/School');

        // 1. Update Brilliant Public School
        const bps = await School.findOne({ slug: "brilliant-public-school" });
        if (bps) {
            bps.motto = "Nurturing Excellence, Inspiring Brilliance";
            bps.backgroundImage = "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80";
            await bps.save();
            console.log("Updated Brilliant Public School branding!");
        }

        // 2. Update Vamshee Techno School
        const vts = await School.findOne({ slug: "primary" });
        if (vts) {
            vts.motto = "Innovation in Education, Excellence in Life";
            vts.backgroundImage = null; // Stays null to test dynamic Unsplash fallback resolution!
            await vts.save();
            console.log("Updated Vamshee Techno School branding!");
        }

        process.exit(0);
    } catch (err) {
        console.error('Update failed:', err);
        process.exit(1);
    }
}

updateSchools();
