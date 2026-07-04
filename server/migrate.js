const mongoose = require('mongoose');
const QuestionPaper = require('./Models/QuestionPaper'); // adjust path

// Recursive function to assign _id
function assignIds(question) {
    if (!question._id) question._id = new mongoose.Types.ObjectId();

    // Options
    if (question.options?.length > 0) {
        for (const opt of question.options) {
            if (!opt._id) opt._id = new mongoose.Types.ObjectId();
        }
    }

    // Pairs
    if (question.pairs?.length > 0) {
        for (const pair of question.pairs) {
            if (!pair._id) pair._id = new mongoose.Types.ObjectId();
        }
    }

    // Sub-questions
    if (question.subQuestions?.length > 0) {
        for (const sub of question.subQuestions) {
            assignIds(sub);
        }
    }
}

async function migrate() {
    try {
        await mongoose.connect(
            'mongodb+srv://Project_SSS:Project_SSS@project-sss.addiw.mongodb.net/test'
        );
        console.log('✅ Connected to MongoDB');

        const papers = await QuestionPaper.find();
        console.log(`Found ${papers.length} question papers.`);

        for (const paper of papers) {
            console.log(`Paper _id: ${paper._id} has ${paper.questions.length} questions.`);

            // Assign _id to each question recursively
            for (const question of paper.questions) {
                assignIds(question);
            }

            // Force Mongoose to detect changes in nested arrays
            paper.markModified('questions');

            // Save paper
            await paper.save();
            console.log(`✅ Updated paper _id: ${paper._id}`);
        }

        console.log('🎉 Migration complete: All questions, sub-questions, options, and pairs now have MongoDB _id.');
        await mongoose.disconnect();
    } catch (err) {
        console.error('Migration failed:', err);
        await mongoose.disconnect();
    }
}

migrate();
