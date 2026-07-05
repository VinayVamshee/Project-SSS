const QuestionPaper = require('../Models/QuestionPaper');
const Counter = require('../Models/Counter');
const InstructionTemplate = require('../Models/InstructionTemplate');

// GET all questions for a specific class, subject & (optionally) chapter
exports.getQuestions = async (req, res) => {
    const { class: classId, subject: subjectId, chapter: chapterId } = req.query;

    try {
        const filter = { class: classId, subject: subjectId };
        if (chapterId) filter.chapter = chapterId;

        const paper = await QuestionPaper.findOne(filter);
        if (!paper) return res.json({ questions: [] });

        res.json({ questions: paper.questions });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getDuplicates = async (req, res) => {
    try {
        const duplicates = await QuestionPaper.aggregate([
            { $unwind: "$questions" },
            {
                $project: {
                    question: "$questions",
                    paperId: "$_id",
                    class: 1,
                    subject: 1,
                    chapter: 1
                }
            },
            {
                $group: {
                    _id: "$question.questionId",
                    count: { $sum: 1 },
                    docs: { $push: "$$ROOT" }
                }
            },
            { $match: { count: { $gt: 1 } } }
        ]);

        const populated = await QuestionPaper.populate(duplicates, [
            { path: 'docs.class', select: 'name' },
            { path: 'docs.subject', select: 'name' },
            { path: 'docs.chapter', select: 'name' }
        ]);

        res.json(populated);
    } catch (err) {
        console.error("Duplicate check error:", err);
        res.status(500).json({ message: err.message });
    }
};

// Helpers for question IDs
async function getNextQuestionId() {
    const counter = await Counter.findOneAndUpdate(
        { name: 'questionId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return `Q_${String(counter.seq).padStart(5, '0')}`;
}

async function assignQuestionIds(question) {
    try {
        question.questionId = await getNextQuestionId();
        if (question.subQuestions && question.subQuestions.length > 0) {
            for (const subQ of question.subQuestions) {
                await assignQuestionIds(subQ);
            }
        }
    } catch (err) {
        console.error("Error assigning questionId:", err);
        throw err;
    }
}

// POST a new question to a question paper
exports.addQuestion = async (req, res) => {
    const { class: classId, subject: subjectId, chapter: chapterId, question } = req.body;

    if (!classId || !subjectId || !question || !question.questionType) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    try {
        await assignQuestionIds(question);

        const filter = { class: classId, subject: subjectId, chapter: chapterId || null };
        let paper = await QuestionPaper.findOne(filter);
        if (!paper) {
            paper = new QuestionPaper({
                class: classId,
                subject: subjectId,
                chapter: chapterId || null,
                questions: [question],
            });
        } else {
            paper.questions.push(question);
        }

        await paper.save();
        res.status(201).json(paper.questions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save question.' });
    }
};

// DELETE a question
exports.deleteQuestion = async (req, res) => {
    const { class: classId, subject: subjectId, chapter: chapterId, mongoId } = req.body;

    if (!classId || !subjectId || !mongoId) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const filter = { class: classId, subject: subjectId, chapter: chapterId || null };
        const paper = await QuestionPaper.findOne(filter);
        if (!paper) return res.status(404).json({ message: 'Question paper not found' });

        let deleted = false;

        function removeById(arr) {
            return arr
                .map(q => {
                    if (q._id.toString() === mongoId) {
                        deleted = true;
                        return null;
                    }
                    if (q.subQuestions?.length > 0) {
                        q.subQuestions = removeById(q.subQuestions);
                    }
                    return q;
                })
                .filter(Boolean);
        }

        paper.questions = removeById(paper.questions);

        if (!deleted) return res.status(404).json({ message: 'Question not found' });

        await paper.save();
        return res.json({ questions: paper.questions });
    } catch (err) {
        console.error('Delete error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// PUT to update a specific question
exports.updateQuestion = async (req, res) => {
    const { class: classId, subject: subjectId, chapter: chapterId, mongoId, updatedQuestion } = req.body;

    if (!mongoId) {
        return res.status(400).json({ error: 'Missing question identifier' });
    }

    try {
        const filter = { class: classId, subject: subjectId, chapter: chapterId || null };
        const paper = await QuestionPaper.findOne(filter);
        if (!paper) return res.status(404).json({ error: 'Question paper not found' });

        let updated = false;

        async function updateById(arr) {
            for (let q of arr) {
                if (q._id.toString() === mongoId) {
                    if (updatedQuestion.subQuestions?.length > 0) {
                        for (const subQ of updatedQuestion.subQuestions) {
                            if (!subQ.questionId) await assignQuestionIds(subQ);
                        }
                    }
                    Object.assign(q, updatedQuestion);
                    updated = true;
                    return true;
                }
                if (q.subQuestions?.length > 0) await updateById(q.subQuestions);
            }
        }

        await updateById(paper.questions);

        if (!updated) return res.status(404).json({ error: 'Question not found' });

        await paper.save();
        res.json({ questions: paper.questions });
    } catch (err) {
        console.error('Update error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Templates
exports.getAllTemplates = async (req, res) => {
    try {
        const templates = await InstructionTemplate.find();
        res.status(200).json(templates);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
};

exports.saveTemplate = async (req, res) => {
    try {
        const newTemplate = new InstructionTemplate(req.body);
        const saved = await newTemplate.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: 'Failed to save template' });
    }
};

exports.deleteTemplate = async (req, res) => {
    try {
        await InstructionTemplate.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete template' });
    }
};
