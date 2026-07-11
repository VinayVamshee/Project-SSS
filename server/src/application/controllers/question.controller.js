const QuestionPaper = require('../../domain/academics/models/QuestionPaper');
const Counter = require('../../domain/shared/models/Counter');
const InstructionTemplate = require('../../domain/academics/models/InstructionTemplate');

// GET all questions for a specific class, subject & (optionally) chapter
exports.getQuestions = async (req, res) => {
    const { class: classId, subject: subjectId, chapter: chapterId } = req.query;

    try {
        if (chapterId) {
            const paper = await QuestionPaper.findOne({ class: classId, subject: subjectId, chapter: chapterId });
            if (!paper) return res.json({ questions: [] });
            
            const questionsWithChapter = (paper.questions || []).map(q => {
                const qObj = q.toObject ? q.toObject() : q;
                qObj.chapter = paper.chapter;
                return qObj;
            });
            return res.json({ questions: questionsWithChapter });
        } else {
            const papers = await QuestionPaper.find({ class: classId, subject: subjectId });
            let allQuestions = [];
            for (const p of papers) {
                const questionsWithChapter = (p.questions || []).map(q => {
                    const qObj = q.toObject ? q.toObject() : q;
                    qObj.chapter = p.chapter;
                    return qObj;
                });
                allQuestions = allQuestions.concat(questionsWithChapter);
            }
            return res.json({ questions: allQuestions });
        }
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
    // Plain update, NO upsert. The counter doc already exists in your DB
    // (name: 'questionId', seq: 14369+), so this always matches and increments
    // atomically with zero risk of the upsert-insert race that was causing E11000.
    let counter = await Counter.findOneAndUpdate(
        { name: 'questionId' },
        { $inc: { seq: 1 } },
        { new: true }
    );

    if (counter) {
        return `Q_${String(counter.seq).padStart(5, '0')}`;
    }

    // Fallback ONLY if the counter doc is somehow missing entirely (shouldn't
    // happen now, but this is a one-time bootstrap path, not a per-request one).
    try {
        counter = await Counter.create({ name: 'questionId', seq: 14400 });
    } catch (err) {
        if (err.code === 11000) {
            counter = await Counter.findOneAndUpdate(
                { name: 'questionId' },
                { $inc: { seq: 1 } },
                { new: true }
            );
        } else {
            throw err;
        }
    }

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
    const { class: classId, subject: subjectId, mongoId } = req.body;

    if (!classId || !subjectId || !mongoId) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const papers = await QuestionPaper.find({ class: classId, subject: subjectId });
        let targetPaper = null;
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

        for (const paper of papers) {
            paper.questions = removeById(paper.questions);
            if (deleted) {
                targetPaper = paper;
                break;
            }
        }

        if (!deleted || !targetPaper) return res.status(404).json({ message: 'Question not found' });

        await targetPaper.save();
        return res.json({ questions: targetPaper.questions });
    } catch (err) {
        console.error('Delete error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// PUT to update a specific question
exports.updateQuestion = async (req, res) => {
    const { class: classId, subject: subjectId, mongoId, updatedQuestion } = req.body;

    if (!mongoId) {
        return res.status(400).json({ error: 'Missing question identifier' });
    }

    try {
        const papers = await QuestionPaper.find({ class: classId, subject: subjectId });
        let targetPaper = null;
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
                if (q.subQuestions?.length > 0) {
                    const found = await updateById(q.subQuestions);
                    if (found) return true;
                }
            }
            return false;
        }

        for (const paper of papers) {
            const found = await updateById(paper.questions);
            if (found) {
                targetPaper = paper;
                break;
            }
        }

        if (!updated || !targetPaper) return res.status(404).json({ error: 'Question not found' });

        await targetPaper.save();
        res.json({ questions: targetPaper.questions });
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
        console.log('Saving instruction template. Body:', req.body, 'schoolId:', req.schoolId);
        const { _id, __v, ...cleanBody } = req.body;
        const payload = { ...cleanBody, schoolId: req.schoolId };
        const newTemplate = new InstructionTemplate(payload);
        const saved = await newTemplate.save();
        res.status(201).json(saved);
    } catch (err) {
        console.error('Failed to save instruction template:', err);
        res.status(400).json({ error: 'Failed to save template', details: err.message });
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

// Helper: recursively find a question by mongoId inside a questions array (including subQuestions)
function findQuestionById(arr, mongoId) {
    for (const q of arr) {
        if (q._id.toString() === mongoId) return q;
        if (q.subQuestions?.length > 0) {
            const found = findQuestionById(q.subQuestions, mongoId);
            if (found) return found;
        }
    }
    return null;
}

// Helper: recursively remove a question by mongoId, returns true if removed
function removeQuestionById(arr, mongoId) {
    let removed = false;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i]._id.toString() === mongoId) {
            arr.splice(i, 1);
            return true;
        }
        if (arr[i].subQuestions?.length > 0) {
            removed = removeQuestionById(arr[i].subQuestions, mongoId);
            if (removed) return true;
        }
    }
    return false;
}

// Helper: deep-clone a question doc into a plain object with fresh questionIds
async function cloneQuestionDeep(question) {
    const plain = question.toObject ? question.toObject() : { ...question };
    delete plain._id;

    plain.questionId = await getNextQuestionId();

    if (plain.subQuestions && plain.subQuestions.length > 0) {
        const clonedSubs = [];
        for (const subQ of plain.subQuestions) {
            clonedSubs.push(await cloneQuestionDeep(subQ)); // sequential, not Promise.all
        }
        plain.subQuestions = clonedSubs;
    }

    return plain;
}

// POST clone a question into a (possibly different) class/subject/chapter
exports.cloneQuestion = async (req, res) => {
    const {
        class: sourceClassId, subject: sourceSubjectId, chapter: sourceChapterId,
        mongoId,
        targetClass, targetSubject, targetChapter
    } = req.body;

    if (!sourceClassId || !sourceSubjectId || !mongoId) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const sourceFilter = { class: sourceClassId, subject: sourceSubjectId, chapter: sourceChapterId || null };
        const sourcePaper = await QuestionPaper.findOne(sourceFilter);
        if (!sourcePaper) return res.status(404).json({ message: 'Source question paper not found' });

        const original = findQuestionById(sourcePaper.questions, mongoId);
        if (!original) return res.status(404).json({ message: 'Question not found' });

        const cloned = await cloneQuestionDeep(original);

        // Default target = same location as source, unless explicitly provided
        const destFilter = {
            class: targetClass || sourceClassId,
            subject: targetSubject || sourceSubjectId,
            chapter: targetChapter || sourceChapterId || null,
        };

        let destPaper = await QuestionPaper.findOne(destFilter);
        if (!destPaper) {
            destPaper = new QuestionPaper({ ...destFilter, questions: [cloned] });
        } else {
            destPaper.questions.push(cloned);
        }

        await destPaper.save();
        res.status(201).json({ questions: destPaper.questions });
    } catch (err) {
        console.error('Clone error:', err);
        res.status(500).json({ message: 'Failed to clone question.' });
    }
};

// POST transfer a question from one class/subject/chapter to another
exports.transferQuestion = async (req, res) => {
    const {
        class: sourceClassId, subject: sourceSubjectId, chapter: sourceChapterId,
        mongoId,
        targetClass, targetSubject, targetChapter
    } = req.body;

    if (!sourceClassId || !sourceSubjectId || !mongoId || !targetClass || !targetSubject) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const sourceFilter = { class: sourceClassId, subject: sourceSubjectId, chapter: sourceChapterId || null };
        const sourcePaper = await QuestionPaper.findOne(sourceFilter);
        if (!sourcePaper) return res.status(404).json({ message: 'Source question paper not found' });

        const original = findQuestionById(sourcePaper.questions, mongoId);
        if (!original) return res.status(404).json({ message: 'Question not found' });

        const moved = original.toObject ? original.toObject() : { ...original };

        const removed = removeQuestionById(sourcePaper.questions, mongoId);
        if (!removed) return res.status(404).json({ message: 'Question not found during removal' });

        await sourcePaper.save();

        const destFilter = {
            class: targetClass,
            subject: targetSubject,
            chapter: targetChapter || null,
        };

        let destPaper = await QuestionPaper.findOne(destFilter);
        if (!destPaper) {
            destPaper = new QuestionPaper({ ...destFilter, questions: [moved] });
        } else {
            destPaper.questions.push(moved);
        }

        await destPaper.save();
        res.status(200).json({ questions: destPaper.questions });
    } catch (err) {
        console.error('Transfer error:', err);
        res.status(500).json({ message: 'Failed to transfer question.' });
    }
};
