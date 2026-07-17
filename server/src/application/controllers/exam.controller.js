const mongoose = require('mongoose');
const Chapter = require('../../domain/academics/models/Chapter');
const Exam = require('../../domain/academics/models/Exam');
const Marks = require('../../domain/academics/models/Marks');

// Chapters
exports.addChapter = async (req, res) => {
    try {
        const { classId, subjectId, chapters } = req.body;

        if (!classId || !subjectId || !Array.isArray(chapters) || chapters.length === 0) {
            return res.status(400).json({ message: 'classId, subjectId and chapters are required' });
        }

        let existing = await Chapter.findOne({ classId, subjectId });
        if (existing) {
            existing.chapters = chapters;
            await existing.save();
            return res.status(200).json({ message: 'Chapters updated successfully', data: existing });
        }

        const newChapter = new Chapter({ classId, subjectId, chapters });
        await newChapter.save();
        res.status(201).json({ message: 'Chapters added successfully', data: newChapter });
    } catch (error) {
        console.error('Error adding chapters:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

exports.getChapters = async (req, res) => {
    try {
        const { classId, subjectId } = req.query;
        const filter = {};
        if (classId) filter.classId = classId;
        if (subjectId) filter.subjectId = subjectId;

        const allChapters = await Chapter.find(filter);
        res.status(200).json({ success: true, data: allChapters });
    } catch (error) {
        console.error('Error fetching chapters:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getChaptersByClassAndSubject = async (req, res) => {
    try {
        const { classId, subjectId } = req.params;
        if (!classId || !subjectId) {
            return res.status(400).json({ message: 'Missing classId or subjectId' });
        }

        const chapterDoc = await Chapter.findOne({ classId, subjectId });
        if (!chapterDoc) {
            return res.status(404).json({ message: 'No chapters found for this class and subject' });
        }

        res.status(200).json({ success: true, chapters: chapterDoc.chapters });
    } catch (error) {
        console.error('❌ Error in GET /chapters/:classId/:subjectId →', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.deleteChapter = async (req, res) => {
    const { classId, subjectId, chapterId } = req.params;
    if (!classId || !subjectId || !chapterId) {
        return res.status(400).json({ message: 'Missing parameters' });
    }

    try {
        const QuestionPaper = mongoose.model('QuestionPaper');
        const hasQuestions = await QuestionPaper.findOne({
            chapter: new mongoose.Types.ObjectId(chapterId),
            questions: { $exists: true, $not: { $size: 0 } }
        });

        if (hasQuestions) {
            return res.status(400).json({ message: 'The chapter is linked to a question and then it cannot be deleted' });
        }

        const updated = await Chapter.findOneAndUpdate(
            { classId, subjectId },
            { $pull: { chapters: { _id: chapterId } } },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: 'Chapter document not found' });
        }

        res.status(200).json({ message: 'Chapter deleted', data: updated });
    } catch (err) {
        console.error('Error deleting chapter:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

exports.updateChapter = async (req, res) => {
    try {
        const { classId, subjectId, chapterId } = req.params;
        const { newName } = req.body;

        if (!classId || !subjectId || !chapterId || !newName) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const updatedDoc = await Chapter.findOneAndUpdate(
            {
                classId: new mongoose.Types.ObjectId(classId),
                subjectId: new mongoose.Types.ObjectId(subjectId),
                "chapters._id": new mongoose.Types.ObjectId(chapterId)
            },
            {
                $set: { "chapters.$.name": newName }
            },
            { new: true }
        );

        if (!updatedDoc) {
            return res.status(404).json({ message: 'Chapter not found' });
        }

        res.status(200).json({ success: true, data: updatedDoc });
    } catch (error) {
        console.error('❌ Update chapter error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Exams
exports.addExams = async (req, res) => {
    const { className, numExams, examNames } = req.body;

    try {
        let exam = await Exam.findOne({ class: className });
        if (exam) {
            exam.numExams = numExams;
            exam.examNames = examNames;
            await exam.save();
            return res.status(200).send('Exam data updated successfully');
        }

        exam = new Exam({
            class: className,
            numExams: numExams,
            examNames: examNames
        });
        await exam.save();
        res.status(201).send('Exam data saved successfully');
    } catch (error) {
        res.status(500).json({ message: 'Error saving exams', error: error.message });
    }
};

exports.getExams = async (req, res) => {
    try {
        const exams = await Exam.find();
        res.status(200).json({ exams });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching exams', error: error.message });
    }
};

// Marks
exports.submitMarks = async (req, res) => {
    try {
        const marksDataArray = req.body;
        if (!Array.isArray(marksDataArray)) {
            return res.status(400).json({ error: "Invalid data format. Expected an array." });
        }

        for (const data of marksDataArray) {
            const { studentId, academicYear, class: className, examName, subjects } = data;

            let studentMarks = await Marks.findOne({ studentId, academicYear, examName });
            if (studentMarks) {
                studentMarks.class = className;
                studentMarks.subjects = subjects;
                await studentMarks.save();
            } else {
                studentMarks = new Marks({
                    studentId,
                    academicYear,
                    class: className,
                    examName,
                    subjects
                });
                await studentMarks.save();
            }
        }

        res.status(200).json({ message: "Marks submitted successfully!" });
    } catch (error) {
        console.error("Error submitting marks:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.getMarks = async (req, res) => {
    try {
        const { academicYear, class: className, examName } = req.query;
        if (!academicYear || !className || !examName) {
            return res.status(400).json({ error: "Missing required query parameters." });
        }

        const studentMarks = await Marks.find({ academicYear, class: className, examName });
        res.json({ studentMarks });
    } catch (error) {
        console.error("Error fetching marks:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.getResultsConfig = async (req, res) => {
    try {
        const Class = require('../../domain/academics/models/Classes');
        const ClassSubjectLink = require('../../domain/academics/models/ClassSubjectLink');
        const AcademicYear = require('../../domain/academics/models/AcademicYear');
        const Template = require('../../domain/metadata/models/Template');

        const { academicYear, classId } = req.query;

        let yearDoc = null;
        if (academicYear) {
            yearDoc = await AcademicYear.findOne({ name: academicYear });
        }

        let classDoc = null;
        if (classId) {
            if (mongoose.Types.ObjectId.isValid(classId)) {
                classDoc = await Class.findById(classId);
            } else {
                classDoc = await Class.findOne({ class: classId });
            }
        }

        let exams = [];
        if (classDoc) {
            const examSetup = await Exam.findOne({ class: classDoc.class });
            if (examSetup && Array.isArray(examSetup.examNames)) {
                exams = examSetup.examNames.map(name => ({ _id: name, name }));
            }
        }

        let subjects = [];
        if (classDoc) {
            const link = await ClassSubjectLink.findOne({ classId: classDoc._id }).populate('subjectIds');
            if (link && Array.isArray(link.subjectIds)) {
                subjects = link.subjectIds.map(sub => ({ _id: sub._id, name: sub.name }));
            }
        }

        const template = await Template.findOne({
            status: 'active',
            key: { $regex: 'result', $options: 'i' }
        }) || await Template.findOne({ status: 'active' }) || null;

        res.json({
            academicYear: yearDoc ? yearDoc.name : academicYear,
            class: classDoc ? { _id: classDoc._id, class: classDoc.class } : null,
            exams,
            subjects,
            template
        });
    } catch (err) {
        console.error("Error fetching results config:", err);
        res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
};

