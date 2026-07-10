const Class = require('../../domain/academics/models/Classes');
const Subject = require('../../domain/academics/models/Subject');
const ClassSubjectLink = require('../../domain/academics/models/ClassSubjectLink');
const AcademicYear = require('../../domain/academics/models/AcademicYear');

// Classes
exports.addNewClass = async (req, res) => {
    try {
        const { className } = req.body;
        const existingClass = await Class.findOne({ class: className });
        if (existingClass) {
            return res.status(400).json({ message: 'Class already exists' });
        }
        const newClass = new Class({ class: className });
        await newClass.save();
        return res.status(201).json({ message: 'New class added successfully', newClass });
    } catch (err) {
        return res.status(500).json({ message: 'Server Error', error: err.message });
    }
};

exports.getClasses = async (req, res) => {
    try {
        const classes = await Class.find();
        res.status(200).json({ classes });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching classes', error: error.message });
    }
};

exports.deleteClass = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedClass = await Class.findByIdAndDelete(id);
        if (!deletedClass) {
            return res.status(404).json({ message: 'Class not found' });
        }
        res.status(200).json({ message: 'Class deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting class', error: error.message });
    }
};

// Subjects
exports.updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name || typeof name !== "string" || name.trim() === "") {
            return res.status(400).json({ message: 'Subject name is required.' });
        }

        const existingSubject = await Subject.findOne({ name: name.trim() });
        if (existingSubject && existingSubject._id.toString() !== id) {
            return res.status(400).json({ message: 'Subject with this name already exists.' });
        }

        const updatedSubject = await Subject.findByIdAndUpdate(
            id,
            { name: name.trim() },
            { new: true }
        );

        if (!updatedSubject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        res.json({ message: 'Subject updated successfully', subject: updatedSubject });
    } catch (error) {
        console.error("Error updating subject:", error);
        res.status(500).json({ message: 'Error updating subject' });
    }
};

exports.addNewSubject = async (req, res) => {
    const { subjectName } = req.body;
    if (!subjectName || typeof subjectName !== "string" || subjectName.trim() === "") {
        return res.status(400).json({ message: 'Subject name is required.' });
    }

    try {
        const existingSubject = await Subject.findOne({ name: subjectName.trim() });
        if (existingSubject) {
            return res.status(400).json({ message: 'Subject already exists' });
        }

        const newSubject = new Subject({ name: subjectName.trim() });
        await newSubject.save();

        return res.status(201).json({
            message: 'Subject added successfully.',
            subject: newSubject,
        });
    } catch (error) {
        console.error("Error adding subject:", error);
        return res.status(500).json({ message: 'Error adding subject. Please try again later.' });
    }
};

exports.getSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find();
        res.json({ subjects });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching subjects.' });
    }
};

exports.deleteSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const subject = await Subject.findByIdAndDelete(id);
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }
        res.status(200).json({ message: 'Subject deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting subject', error: error.message });
    }
};

// ClassSubjectLink
exports.classSubjectLink = async (req, res) => {
    try {
        const { classId, subjectIds } = req.body;
        if (!classId || !Array.isArray(subjectIds) || subjectIds.length === 0) {
            return res.status(400).json({ message: 'Class ID and Subject IDs are required' });
        }

        let existingClass = await ClassSubjectLink.findOne({ classId });
        if (existingClass) {
            existingClass.subjectIds = subjectIds;
            await existingClass.save();
        } else {
            existingClass = new ClassSubjectLink({ classId, subjectIds });
            await existingClass.save();
        }

        return res.status(201).json({ message: 'Class-Subject link saved successfully', existingClass });
    } catch (error) {
        return res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getClassSubjects = async (req, res) => {
    try {
        const links = await ClassSubjectLink.find();
        res.status(200).json({ data: links });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Academic Years
exports.addAcademicYear = async (req, res) => {
    try {
        const yearName = req.body.year || req.body.name;
        if (!yearName) {
            return res.status(400).json({ message: "Year name is required" });
        }
        const startYear = parseInt(yearName.split('-')[0]) || new Date().getFullYear();
        const newYear = new AcademicYear({
            name: yearName,
            startDate: new Date(startYear, 3, 1),
            endDate: new Date(startYear + 1, 2, 31),
            status: 'Active'
        });
        await newYear.save();
        res.status(201).json(newYear);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getAcademicYears = async (req, res) => {
    try {
        const years = await AcademicYear.find().sort({ name: -1 });
        const legacyFormattedYears = years.map(y => {
            const doc = y.toObject();
            doc.year = doc.name;
            return doc;
        });
        res.status(200).json({ data: legacyFormattedYears });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteAcademicYear = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const yearId = req.params.id;

        // Load models dynamically to check references
        const StudentEnrollment = mongoose.model('StudentEnrollment');
        const FeeStructure = mongoose.model('FeeStructure');
        const Payment = mongoose.model('Payment');

        const inEnrollment = await StudentEnrollment.findOne({ academicYearId: yearId });
        if (inEnrollment) {
            return res.status(400).json({ message: "This academic year is referenced in student enrollments and cannot be deleted." });
        }

        const inFee = await FeeStructure.findOne({ academicYear: yearId });
        if (inFee) {
            return res.status(400).json({ message: "This academic year is referenced in a fee structure and cannot be deleted." });
        }

        const inPayment = await Payment.findOne({ "academicYears.academicYear": yearId });
        if (inPayment) {
            return res.status(400).json({ message: "This academic year is referenced in payment records and cannot be deleted." });
        }

        const deletedYear = await AcademicYear.findByIdAndDelete(yearId);
        if (!deletedYear) {
            return res.status(404).json({ message: 'Academic Year not found' });
        }
        res.status(200).json({ message: 'Academic Year deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
