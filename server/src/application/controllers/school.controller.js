const School = require('../../domain/shared/models/School');
const User = require('../../domain/auth/models/User');
const Student = require('../../domain/student/models/Student');
const Classes = require('../../domain/academics/models/Classes');
const Subject = require('../../domain/academics/models/Subject');
const AcademicYear = require('../../domain/academics/models/AcademicYear');

exports.getTenantConfig = (req, res) => {
    if (!req.schoolId) {
        return res.status(400).json({ message: 'No school resolved for this host' });
    }
    res.json(req.school);
};

exports.createSchool = async (req, res) => {
    try {
        const newSchool = new School(req.body);
        const savedSchool = await newSchool.save();
        res.status(201).json(savedSchool);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getSchool = async (req, res) => {
    try {
        if (!req.schoolId) {
            return res.status(404).json({ message: 'No school resolved for this host' });
        }
        res.json(req.school);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAllSchools = async (req, res) => {
    try {
        const schools = await School.find().sort({ name: 1 });
        res.json(schools);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSchool = async (req, res) => {
    try {
        const targetId = req.schoolId || req.params.id;
        const updatedSchool = await School.findByIdAndUpdate(
            targetId,
            req.body,
            { new: true }
        );
        if (!updatedSchool) return res.status(404).json({ message: 'School not found' });
        res.json(updatedSchool);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.setInUse = async (req, res) => {
    const targetId = req.schoolId || req.params.id;
    try {
        const updated = await School.findByIdAndUpdate(targetId, { status: 'active' }, { new: true });
        if (!updated) return res.status(404).json({ message: 'School not found' });
        res.json({ message: '✅ School active', master: updated });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update status', details: err.message });
    }
};

exports.deleteSchool = async (req, res) => {
    try {
        const targetId = req.params.id;

        // Perform counts bypassing the active ALS tenant context
        const userCount = await User.countDocuments({ schoolId: targetId }).setOptions({ bypassTenant: true });
        const studentCount = await Student.countDocuments({ schoolId: targetId }).setOptions({ bypassTenant: true });
        const classCount = await Classes.countDocuments({ schoolId: targetId }).setOptions({ bypassTenant: true });
        const subjectCount = await Subject.countDocuments({ schoolId: targetId }).setOptions({ bypassTenant: true });
        const academicYearCount = await AcademicYear.countDocuments({ schoolId: targetId }).setOptions({ bypassTenant: true });

        if (userCount > 0 || studentCount > 0 || classCount > 0 || subjectCount > 0 || academicYearCount > 0) {
            const list = [];
            if (userCount > 0) list.push(`${userCount} users`);
            if (studentCount > 0) list.push(`${studentCount} students`);
            if (classCount > 0) list.push(`${classCount} classes`);
            if (subjectCount > 0) list.push(`${subjectCount} subjects`);
            if (academicYearCount > 0) list.push(`${academicYearCount} academic sessions`);

            return res.status(400).json({
                error: `Delete not possible because there are associated configurations: ${list.join(', ')}.`
            });
        }

        const deleted = await School.findByIdAndDelete(targetId);
        if (!deleted) return res.status(404).json({ message: "School not found" });
        res.json({ message: "School deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
