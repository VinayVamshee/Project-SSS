import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import PrintQuestionPaper from './PrintQuestionPaper';
import DownloadQuestionBank from './DownloadQuestionBank';

export default function QuestionManager() {
    const printRef = useRef(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: "QuestionPaper",
    });

    const [message, setMessage] = useState("");
    const showMessage = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(""), 5000);
    };

    const navigate = useNavigate();
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [classSubjects, setClassSubjects] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [filteredSubjects, setFilteredSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [questions, setQuestions] = useState([]);
    const [uploading, setUploading] = useState(false);

    const [newQuestion, setNewQuestion] = useState({
        questionText: '',
        questionImage: '',
        questionMarks: '',
        questionType: 'Heading',
        hasSubQuestions: true,
        subQuestions: [
            {
                questionText: '',
                questionImage: '',
                questionMarks: '',
                questionType: 'MCQ',
                options: [],
                pairs: [],
            }
        ]
    });

    const [userType, setUserType] = useState('');
    const [chapterList, setChapterList] = useState([]);
    const [selectedChapter, setSelectedChapter] = useState("");
    const [allChapters, setAllChapters] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userType = localStorage.getItem('userType');

        if (!token || !userType) {
            navigate('/login');
            return;
        } else {
            setUserType(userType);
        }

        const load = async () => {
            try {
                const [cRes, sRes, csRes, chRes] = await Promise.all([
                    axios.get('https://sss-server-eosin.vercel.app/getClasses'),
                    axios.get('https://sss-server-eosin.vercel.app/getSubjects'),
                    axios.get('https://sss-server-eosin.vercel.app/class-subjects'),
                    axios.get('https://sss-server-eosin.vercel.app/chapters'), // 🔹 Add this route in your backend if not present
                ]);

                setClasses(cRes.data.classes);
                setSubjects(sRes.data.subjects);
                setClassSubjects(csRes.data.data);
                setAllChapters(chRes.data.data || []); // 🔹 Store all chapters

            } catch (err) {
                console.error('Error loading data:', err.message);
            }
        };

        load();
    }, [navigate]);

    const fetchQuestions = async (cls = selectedClass, subj = selectedSubject, chap = selectedChapter) => {
        if (cls && subj && chap) {
            try {
                const res = await axios.get(
                    `https://sss-server-eosin.vercel.app/questions?class=${cls}&subject=${subj}&chapter=${chap}`
                );
                setQuestions(res.data.questions);

                setGlobalQuestionMap(prev => {
                    const newMap = { ...prev };
                    res.data.questions.forEach(q => {
                        newMap[q.questionId] = q;
                    });
                    return newMap;
                });
            } catch (err) {
                console.error("Failed to fetch questions:", err);
            }
        } else {
            setQuestions([]);
        }
    };

    // Allow full access if QP Editor or Admin
    const canEdit = userType === "admin";         // Only Admin can edit everything
    const canQpEdit = userType === "qp-editor";  // Only QP Editor can edit QPs

    const uploadToImgBB = async (file) => {
        const formData = new FormData();
        formData.append('key', '8451f34223c6e62555eec9187d855f8f');
        formData.append('image', file);
        setUploading(true);
        try {
            const res = await axios.post('https://api.imgbb.com/1/upload', formData);
            return res.data.data.display_url;
        } catch (err) {
            console.error('Image upload failed', err);
            throw err;
        } finally {
            setUploading(false);
        }
    };

    const [globalQuestionMap, setGlobalQuestionMap] = useState({});

    const onClassChange = (e) => {
        const cls = e.target.value;
        setSelectedClass(cls);
        setSelectedSubject('');
        setSelectedChapter('');
        setQuestions([]);

        // Find the class-subject link by ObjectId
        const link = classSubjects.find((x) =>
            x.classId === cls || x.classId?._id === cls
        );

        const linkedSubs = subjects.filter((s) =>
            link?.subjectIds?.some(id => id === s._id || id?._id === s._id)
        );

        setFilteredSubjects(linkedSubs);
    };

    const onSubjectChange = (e) => {
        const subj = e.target.value;
        setSelectedSubject(subj);
        setSelectedChapter(''); // ✅ Reset chapter
        setQuestions([]);
    };
    const onChapterChange = async (e) => {
        const chap = e.target.value; // This is now chapter _id
        setSelectedChapter(chap);

        if (selectedClass && selectedSubject && chap) {
            const r = await axios.get(
                `https://sss-server-eosin.vercel.app/questions?class=${selectedClass}&subject=${selectedSubject}&chapter=${chap}`
            );

            setQuestions(r.data.questions);

            setGlobalQuestionMap(prev => {
                const newMap = { ...prev };
                r.data.questions.forEach(q => {
                    newMap[q.questionId] = q;
                });
                return newMap;
            });
        } else {
            setQuestions([]);
        }
    };

    useEffect(() => {
        if (selectedClass && selectedSubject && allChapters.length > 0) {
            const match = allChapters.find((item) => {
                const isClassMatch =
                    item.classId === selectedClass || item.classId?._id === selectedClass;
                const isSubjectMatch =
                    item.subjectId === selectedSubject || item.subjectId?._id === selectedSubject;

                return isClassMatch && isSubjectMatch;
            });
            if (match?.chapters?.length > 0) {
                match.chapters.forEach((chapter, idx) => {
                });
            } else {

            }

            setChapterList(match?.chapters || []);
        } else {
            setChapterList([]);
        }
    }, [selectedClass, selectedSubject, allChapters]);

    const addOption = () => setNewQuestion(q => ({
        ...q, options: [...q.options, { text: '', imageUrl: '' }]
    }));

    const updateOption = (idx, prop, val) => {
        const options = [...newQuestion.options];
        options[idx][prop] = val;
        setNewQuestion(q => ({ ...q, options }));
    };

    const addPair = () => setNewQuestion(q => ({
        ...q, pairs: [...q.pairs, { leftText: '', leftImage: '', rightText: '', rightImage: '' }]
    }));

    const updatePair = (idx, side, prop, val) => {
        const pairs = [...newQuestion.pairs];
        pairs[idx][`${side}${prop}`] = val;
        setNewQuestion(q => ({ ...q, pairs }));
    };

    const [questionUploading, setQuestionUploading] = useState(false);

    const handleAddQuestion = async () => {
        setQuestionUploading(true);
        try {
            const cleanSubQuestions = (subQs) =>
                subQs
                    .filter(sq => sq.questionText?.trim() && sq.questionType?.trim())
                    .map(sq => ({
                        ...sq,
                        subQuestions: cleanSubQuestions(sq.subQuestions || [])
                    }));

            const cleanedQuestion = {
                ...newQuestion,
                subQuestions: cleanSubQuestions(newQuestion.subQuestions || [])
            };

            const res = await axios.post('https://sss-server-eosin.vercel.app/questions', {
                class: selectedClass,
                subject: selectedSubject,
                chapter: selectedChapter || null,
                question: cleanedQuestion
            });

            setQuestions(res.data);
            fetchQuestions();
            showMessage("Question Added Successfully");

            setNewQuestion({
                questionText: '',
                questionImage: '',
                questionType: '',
                questionMarks: '',
                options: [],
                pairs: [],
                subQuestions: [],
            });
        } catch (err) {
            console.error(err);
            showMessage("Failed to add question");
        } finally {
            setQuestionUploading(false);
        }
    };

    const addSubQuestion = () => {
        setNewQuestion((prev) => ({
            ...prev,
            subQuestions: [
                ...prev.subQuestions,
                {
                    questionText: '',
                    questionImage: '',
                    questionType: '',
                    questionMarks: '',
                    options: [],
                    pairs: []
                },
            ],
        }));
    };

    const updateSubQuestion = (index, key, value) => {
        const updated = [...newQuestion.subQuestions];
        updated[index][key] = value;
        setNewQuestion((prev) => ({
            ...prev,
            subQuestions: updated
        }));
    };

    const handleDelete = async (mongoId, questionId) => {
        const confirmDelete = window.confirm('Are you sure you want to delete this question?');
        if (!confirmDelete) return;

        try {
            const res = await axios.delete('https://sss-server-eosin.vercel.app/questions', {
                data: {
                    class: selectedClass,
                    subject: selectedSubject,
                    chapter: selectedChapter,
                    questionId, // fallback
                    mongoId,    // precise match
                },
            });

            setQuestions(res.data.questions);
            fetchQuestions();
            showMessage('✅ Question deleted successfully.');
        } catch (error) {
            console.error('❌ Error deleting question:', error);
            showMessage('❌ Failed to delete the question. Please try again.');
        }
    };


    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [newTemplate, setNewTemplate] = useState({
        schoolName: '',
        logo: '',
        address: '',
        examTitle: '',
        date: '',
        time: '',
        maxMarks: '',
        instructions: ['']
    });

    // Fetch templates
    useEffect(() => {
        axios.get('https://sss-server-eosin.vercel.app/get-all-templates').then(res => setTemplates(res.data));
    }, []);

    const saveTemplate = async () => {
        try {
            await axios.post('https://sss-server-eosin.vercel.app/save-template', newTemplate);
            const res = await axios.get('https://sss-server-eosin.vercel.app/get-all-templates');
            setTemplates(res.data);
            setNewTemplate({
                schoolName: '',
                address: '',
                examTitle: '',
                instructions: ['']
            });
            showMessage('Saved successfully ✅');
        } catch (error) {
            console.error('Error saving template:', error);
            showMessage('Failed to save. Please try again.');
        }
    };

    // Add/remove instruction line
    const addInstruction = () => {
        setNewTemplate(t => ({ ...t, instructions: [...t.instructions, ''] }));
    };

    const updateInstruction = (idx, value) => {
        const newInstructions = [...newTemplate.instructions];
        newInstructions[idx] = value;
        setNewTemplate(t => ({ ...t, instructions: newInstructions }));
    };

    const handleDeleteTemplate = async (id) => {
        if (!window.confirm("Are you sure you want to delete this template?")) return;

        try {
            await axios.delete(`https://sss-server-eosin.vercel.app/delete-template/${id}`);
            const res = await axios.get('https://sss-server-eosin.vercel.app/get-all-templates');
            setTemplates(res.data);
            showMessage("Template Deleted")
        } catch (error) {
            console.error("Error deleting template:", error);
            showMessage("Failed to delete template.");
        }
    };

    const handleEditTemplate = (template) => {
        setNewTemplate({
            schoolName: template.schoolName || '',
            logo: template.logo || '',
            address: template.address || '',
            examTitle: template.examTitle || '',
            date: template.date || '',
            time: template.time || '',
            maxMarks: template.maxMarks || '',
            instructions: Array.isArray(template.instructions) ? [...template.instructions] : ['']
        });
    };

    const [selectedSchoolName, setSelectedSchoolName] = useState('');
    const [selectedLogo, setSelectedLogo] = useState('');
    const [selectedAddress, setSelectedAddress] = useState('');
    const [selectedExamTitle, setSelectedExamTitle] = useState('');
    const [selectedInstructions, setSelectedInstructions] = useState([]);
    const [examDate, setExamDate] = useState('');
    const [examTime, setExamTime] = useState('');
    const [maxMarks, setMaxMarks] = useState('');

    const toggleInstruction = (text) => {
        setSelectedInstructions(prev =>
            prev.includes(text) ? prev.filter(i => i !== text) : [...prev, text]
        );
    };

    const [searchText, setSearchText] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterMarks, setFilterMarks] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');

    const filteredAndSortedQuestions = [...questions]
        // Sort selected questions first
        .sort((a, b) => {
            const aSelected = selectedQuestions.includes(a._id);
            const bSelected = selectedQuestions.includes(b._id);
            return bSelected - aSelected;
        })
        // Apply filters: search, type, marks
        .filter(q => {
            const textMatch = q.questionText.toLowerCase().includes(searchText.toLowerCase()) || (q.questionId && q.questionId.includes(searchText));
            const marksMatch = filterMarks === '' || q.questionMarks === filterMarks;

            const typeMatch =
                filterType === '' || q.questionType === filterType ||
                (q.subQuestions && q.subQuestions.some(sub => sub.questionType === filterType));

            return textMatch && marksMatch && typeMatch;
        })
        // Sort by marks (asc/desc)
        .sort((a, b) => {
            const marksA = parseFloat(a.questionMarks || 0);
            const marksB = parseFloat(b.questionMarks || 0);
            return sortOrder === 'asc' ? marksA - marksB : marksB - marksA;
        });

    const [previewImageUrl, setPreviewImageUrl] = useState('');

    const [editQuestionData, setEditQuestionData] = useState(null);

    const openEditModal = (q, index) => {
        setEditQuestionData(q);
        setEditQuestionIndex(index);
    };

    const [editQuestionIndex, setEditQuestionIndex] = useState(null);

    const handleEditSubmit = async () => {
        if (editQuestionIndex === null || editQuestionIndex === undefined) {
            showMessage("Edit index not set.");
            return;
        }

        try {
            const res = await axios.put(`https://sss-server-eosin.vercel.app/questions`, {
                class: selectedClass,
                subject: selectedSubject,
                chapter: selectedChapter || null,
                index: editQuestionIndex,
                updatedQuestion: editQuestionData,
            });

            setQuestions(res.data.questions);
            fetchQuestions();
            showMessage('Question Updated Successfully')
        } catch (err) {
            console.error(err);
            showMessage("Failed to update question.");
        }
    };

    const renderEditQuestionTypeFields = (editQuestionData, setEditQuestionData) => {
        const updateOption = (i, key, value) => {
            const updated = [...editQuestionData.options];
            updated[i][key] = value;
            setEditQuestionData(q => ({ ...q, options: updated }));
        };

        const updatePair = (i, side, key, value) => {
            const updated = [...editQuestionData.pairs];
            updated[i][`${side}${key}`] = value;
            setEditQuestionData(q => ({ ...q, pairs: updated }));
        };

        return (
            <>
                {/* MCQ Section */}
                {editQuestionData.questionType === 'MCQ' && (
                    <>
                        <button
                            className="btn btn-primary btn-sm mb-3"
                            onClick={() =>
                                setEditQuestionData(q => ({
                                    ...q,
                                    options: [...(q.options || []), { text: '', imageUrl: '' }],
                                }))
                            }
                        >
                            <i className="fas fa-plus me-1"></i>Add Option
                        </button>

                        <div className="row">
                            {editQuestionData.options?.map((opt, i) => (
                                <div className="col-md-3 mb-3" key={i}>
                                    <input
                                        className="form-control mb-1"
                                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                        value={opt.text}
                                        onChange={e => updateOption(i, 'text', e.target.value)}
                                    />
                                    <input
                                        type="file"
                                        className="form-control form-control-sm"
                                        onChange={async e => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const url = await uploadToImgBB(file);
                                                updateOption(i, 'imageUrl', url);
                                            }
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Match Section */}
                {editQuestionData.questionType === 'Match' && (
                    <>
                        <button
                            className="btn btn-primary btn-sm mb-3"
                            onClick={() =>
                                setEditQuestionData(q => ({
                                    ...q,
                                    pairs: [...(q.pairs || []), { leftText: '', leftImage: '', rightText: '', rightImage: '' }],
                                }))
                            }
                        >
                            <i className="fas fa-plus me-1"></i>Add Pair
                        </button>

                        {editQuestionData.pairs?.map((p, i) => (
                            <div className="row mb-3" key={i}>
                                {['left', 'right'].map(side => (
                                    <div className="col-md-6 mb-2" key={side}>
                                        <input
                                            className="form-control mb-1"
                                            placeholder={`${side} text`}
                                            value={p[`${side}Text`]}
                                            onChange={e => updatePair(i, side, 'Text', e.target.value)}
                                        />
                                        <input
                                            type="file"
                                            className="form-control form-control-sm"
                                            onChange={async e => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const url = await uploadToImgBB(file);
                                                    updatePair(i, side, 'Image', url);
                                                }
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </>
                )}

                {/* Sub-Questions Section */}
                {editQuestionData.questionType === 'sub-question' && (
                    <>
                        <h6 className="mt-4 mb-3">Sub-Questions</h6>
                        {editQuestionData.subQuestions?.map((subQ, index) => (
                            <div key={index} className="mb-1 p-3 border rounded-3">
                                <div className="row align-items-center mb-3">
                                    <div className="col-md-7">
                                        <input
                                            type="text"
                                            className="form-control shadow-sm"
                                            placeholder={`Sub-question ${index + 1} text`}
                                            value={subQ.questionText}
                                            onChange={e => {
                                                const updated = [...editQuestionData.subQuestions];
                                                updated[index].questionText = e.target.value;
                                                setEditQuestionData(q => ({ ...q, subQuestions: updated }));
                                            }}
                                        />
                                    </div>
                                    <div className="col-md-2">
                                        <input
                                            className="form-control shadow-sm"
                                            placeholder="Marks"
                                            value={subQ.questionMarks}
                                            onChange={e => {
                                                const updated = [...editQuestionData.subQuestions];
                                                updated[index].questionMarks = e.target.value;
                                                setEditQuestionData(q => ({ ...q, subQuestions: updated }));
                                            }}
                                        />
                                    </div>
                                    <div className="col-md-3">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="form-control"
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const url = await uploadToImgBB(file);
                                                    const updated = [...editQuestionData.subQuestions];

                                                    updated[index] = {
                                                        ...updated[index],
                                                        questionImage: url,
                                                        _id: updated[index]._id,
                                                    };

                                                    setEditQuestionData((q) => ({
                                                        ...q,
                                                        subQuestions: updated,
                                                        _id: q._id,
                                                    }));
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <select
                                    className="form-select w-auto shadow-sm mb-3"
                                    value={subQ.questionType}
                                    onChange={e => {
                                        const updated = [...editQuestionData.subQuestions];
                                        updated[index].questionType = e.target.value;
                                        setEditQuestionData(q => ({ ...q, subQuestions: updated }));
                                    }}
                                >
                                    <option value="">-- Select Question Type --</option>
                                    <option value="MCQ">MCQ</option>
                                    <option value="Descriptive">Descriptive</option>
                                    <option value="Match">Match the Following</option>
                                </select>
                            </div>
                        ))}

                        <button
                            className="btn btn-success btn-sm"
                            onClick={() =>
                                setEditQuestionData(q => ({
                                    ...q,
                                    subQuestions: [...(q.subQuestions || []), {
                                        questionText: '',
                                        questionMarks: '',
                                        questionImage: '',
                                        questionType: '',
                                        options: [],
                                        pairs: []
                                    }]
                                }))
                            }
                        >
                            <i className="fas fa-plus me-1"></i>Add Sub-Question
                        </button>
                    </>
                )}
            </>
        );
    };

    const getAllQuestionIds = (questions) => {
        const ids = [];

        const collectIds = (list) => {
            list.forEach(q => {
                if (q.questionId) ids.push(q.questionId);
                if (q.subQuestions?.length > 0) {
                    collectIds(q.subQuestions);
                }
            });
        };

        collectIds(questions);
        console.log('All Question IDs:', ids);
        return ids;
    };

    // Place this function at the top of your component file

    const toRoman = (num) => {
        const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
        return roman[num] || num + 1;
    };

    const [fullWidthImagesMap, setFullWidthImagesMap] = useState({});

    const renderQuestionBlock = (q, i, level = 0) => (

        <div key={q.questionId || i} className={`border rounded p-1 mb-2 bg-white position-relative shadow-sm ${level > 0 ? 'ms-4' : ''}`}>

            {/* Delete Button */}
            {level === 0 && (
                <div className="position-absolute top-0 end-0 m-2 d-flex gap-2">
                    <span className="ms-auto badge bg-light text-dark" style={{ height: 'fit-content', fontSize: '10px' }}>{q.questionMarks} marks</span>
                    <p className=""><span className="badge bg-info" style={{ fontFamily: 'Times New Roman', fontSize: '14px' }}>{q.questionType}</span></p>
                    <button
                        className="btn btn-sm btn-primary mb-2"
                        data-bs-toggle="modal"
                        data-bs-target="#editQuestionModal"
                        onClick={() => openEditModal(q, i)}
                        disabled={!(canEdit || canQpEdit)}
                    >
                        <i className="fas fa-edit"></i>
                    </button>
                    <button
                        className="btn btn-sm btn-danger mb-2"
                        onClick={() => handleDelete(q._id, q.questionId)}
                        disabled={!canEdit}
                    >
                        <i className="fas fa-trash-alt"></i>
                    </button>
                </div>
            )}

            {/* Question Content */}
            <div className="">
                <h6 className="d-flex align-items-center flex-wrap">
                    <strong className="me-2 d-flex align-items-center">
                        {/* Checkbox for Main Questions only */}
                        {q.questionId && (
                            <input
                                type="checkbox"
                                className="form-check-input me-2 p-3"
                                style={{ boxShadow: 'none' }}
                                checked={selectedQuestions.includes(q.questionId)}
                                onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    const allSubIds = q.subQuestions?.map(sub => sub.questionId) || [];
                                    const toAdd = [q.questionId, ...allSubIds];

                                    if (isChecked) {
                                        // ✅ Always add to global selection
                                        setSelectedQuestions(prev => [...new Set([...prev, ...toAdd])]);

                                        // ✅ If section is active, assign to it
                                        if (
                                            activeSectionIndex !== null &&
                                            questionPaperSections[activeSectionIndex]
                                        ) {
                                            setQuestionPaperSections(prev => {
                                                const updated = [...prev];
                                                const existingIds = updated[activeSectionIndex].questionIds || [];
                                                updated[activeSectionIndex].questionIds = [
                                                    ...new Set([...existingIds, ...toAdd])
                                                ];
                                                return updated;
                                            });
                                        }
                                    } else {
                                        // ❌ Remove from global selection
                                        setSelectedQuestions(prev => prev.filter(id => !toAdd.includes(id)));

                                        // ❌ If section is active, remove from it
                                        if (
                                            activeSectionIndex !== null &&
                                            questionPaperSections[activeSectionIndex]
                                        ) {
                                            setQuestionPaperSections(prev => {
                                                const updated = [...prev];
                                                const existingIds = updated[activeSectionIndex].questionIds || [];
                                                updated[activeSectionIndex].questionIds = existingIds.filter(id => !toAdd.includes(id));
                                                return updated;
                                            });
                                        }
                                    }
                                }}
                            />
                        )}
                        {level === 0 ? `Q${i + 1}.` : `${toRoman(i)}.`}
                    </strong>
                    <span>
                        <span className="text-muted">[ {q.questionId} ]</span> {q.questionText}
                    </span>
                </h6>

                {q.questionImage && (
                    <div className="mt-2 ms-5">
                        <img
                            src={q.questionImage}
                            alt="Question"
                            className="img-thumbnail"
                            style={{
                                width: fullWidthImagesMap[q.questionId] ? "100%" : 100,
                                height: 100,
                                objectFit: "contain",
                            }}
                        />

                        {/* ✅ Toggle Switch for Full Width */}
                        <div className="form-check form-switch mt-2">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                id={`fullWidthImage-${q.questionId}-${i}-${level}`}
                                checked={!!fullWidthImagesMap[q.questionId]}
                                onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    setFullWidthImagesMap((prev) => ({
                                        ...prev,
                                        [q.questionId]: isChecked,
                                    }));
                                }}
                            />
                            <label
                                className="form-check-label"
                                htmlFor={`fullWidthImage-${q.questionId}-${i}-${level}`}
                                style={{ fontSize: '1rem' }}
                            >
                                Display image in full width
                            </label>
                        </div>
                    </div>
                )}

            </div>

            {/* MCQ Options */}
            {q.questionType === 'MCQ' && (
                <div className="row">
                    {q.options.map((opt, idx) => (
                        <div key={idx} className="col-md-6 mb-2">
                            <div className="border rounded p-2 d-flex align-items-center">
                                <span className="me-2 fw-bold">({String.fromCharCode(65 + idx)})</span>
                                <div className="d-flex align-items-center">
                                    <span>{opt.text}</span>
                                    {opt.imageUrl && (
                                        <img
                                            src={opt.imageUrl}
                                            alt={`Option ${idx + 1}`}
                                            className="img-thumbnail ms-2"
                                            style={{ width: 50, height: 50, objectFit: 'cover' }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Match the Following */}
            {q.questionType === 'Match' && (
                <div className="row mt-2">
                    <div className="col-md-6">
                        <div className="fw-bold mb-1">Column A</div>
                        {q.pairs.map((pair, idx) => (
                            <div key={idx} className="d-flex align-items-center mb-1">
                                <span>{pair.leftText}</span>
                                {pair.leftImage && (
                                    <img
                                        src={pair.leftImage}
                                        alt="Left"
                                        className="img-thumbnail ms-2"
                                        style={{ width: 40, height: 40, objectFit: 'cover' }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="col-md-6">
                        <div className="fw-bold mb-1">Column B</div>
                        {q.pairs.map((pair, idx) => (
                            <div key={idx} className="d-flex align-items-center mb-1">
                                <span>{pair.rightText}</span>
                                {pair.rightImage && (
                                    <img
                                        src={pair.rightImage}
                                        alt="Right"
                                        className="img-thumbnail ms-2"
                                        style={{ width: 40, height: 40, objectFit: 'cover' }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 🔁 Sub-Questions Recursively */}
            {q.subQuestions?.length > 0 && (
                <div className="mt-3 border-top pt-3">
                    {q.subQuestions.map((subQ, subIndex) =>
                        renderQuestionBlock(subQ, subIndex, level + 1)
                    )}
                </div>
            )}

        </div>
    );

    const [questionPaperSections, setQuestionPaperSections] = useState([]);
    const [activeSectionIndex, setActiveSectionIndex] = useState(null);

    const printRefFiltered = useRef(null);

    const handleDownloadFiltered = useReactToPrint({
        contentRef: printRefFiltered,
        documentTitle: "Filtered_Question_Bank",
    });

    return (
        <div className="QuestionPaper py-2">
            <div className="d-flex align-items-center">
                {uploading && <span className="badge bg-warning text-dark">Uploading...</span>}
            </div>

            <div className="SearchFilter">
                {/* Class Dropdown */}
                <div>
                    <select onChange={onClassChange} value={selectedClass} className="form-select shadow-sm">
                        <option value="">-- Select Class --</option>
                        {classes.map(c => (
                            <option key={c._id} value={c._id}>{c.class}</option>
                        ))}
                    </select>
                </div>

                {/* Subject Dropdown */}
                <div>
                    <select onChange={onSubjectChange} value={selectedSubject} className="form-select shadow-sm" disabled={!selectedClass}>
                        <option value="">-- Select Subject --</option>
                        {filteredSubjects.map(s => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                {/* Chapter Dropdown */}
                <div>
                    <select
                        onChange={onChapterChange}
                        value={selectedChapter}
                        className="form-select shadow-sm"
                        disabled={!selectedSubject}
                    >
                        <option value="">-- Select Chapter --</option>
                        {chapterList.map((ch, idx) => (
                            <option key={idx} value={ch._id}>{ch.name}</option>
                        ))}
                    </select>
                </div>

                {/* Buttons */}
                <button className="btn" data-bs-toggle="modal" data-bs-target="#addQuestionModal" disabled={!(canEdit || canQpEdit)}>
                    <i className="fas fa-plus me-2"></i>Add Question
                </button>
                <button className="btn" type="button" data-bs-toggle="collapse" data-bs-target="#addInstructionCollapse" aria-expanded="false" aria-controls="addInstructionCollapse" disabled={!(canEdit || canQpEdit)}>
                    <i className="fas fa-book me-2"></i>Add Instruction Template
                </button>
                <button className="btn" data-bs-toggle="modal" data-bs-target="#createQuestionPaperModal" >
                    ➕ Create Question Paper
                </button>
                <button className="btn" onClick={() => handleDownloadFiltered()} disabled={!(canEdit || canQpEdit)}>
                    <i className="fa-solid fa-download me-2"></i>
                    Download Question Bank
                </button>
                {/* <button className="btn" data-bs-toggle="modal" data-bs-target="#selectInstructionsModal">
                    <i className="fas fa-sliders-h me-2"></i>Select Instructions & Download
                </button> */}
            </div>

            {/* Create Question Ppaer */}
            <div
                className="modal fade"
                id="createQuestionPaperModal"
                tabIndex="-1"
                aria-labelledby="createQuestionPaperModalLabel"
                aria-hidden="true"
                data-bs-backdrop="false"
            >
                <div className="modal-dialog modal-fullscreen">
                    <div className="modal-content bg-light">
                        <div className="modal-header bg-white border-bottom shadow-sm">
                            <h5 className="modal-title" id="createQuestionPaperModalLabel">
                                📝 Create Question Paper
                            </h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>

                        <div className="modal-body p-4 question-paper-selection">

                            {/* STEP 1 & 2: Chapter + Section + Toggle */}
                            <div className="row g-3 align-items-end mb-2" style={{ borderBottom: '0.5px solid gray', paddingBottom: '10px' }}>
                                {/* Chapter Dropdown */}
                                <div className=" " style={{ width: 'fit-content' }}>
                                    <label className="form-label">Select Chapter</label>
                                    <select
                                        onChange={onChapterChange}
                                        value={selectedChapter}
                                        className="form-select shadow-sm"
                                        disabled={!selectedSubject}
                                    >
                                        <option value="">-- Select Chapter --</option>
                                        {chapterList.map((ch, idx) => (
                                            <option key={idx} value={ch._id}>{ch.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Section Info */}
                                <div className="" style={{ width: 'fit-content' }}>
                                    <label className="form-label">Select Section to Assign</label>
                                    <select
                                        className="form-select shadow-sm"
                                        value={activeSectionIndex !== null ? activeSectionIndex : ''}
                                        onChange={(e) => setActiveSectionIndex(parseInt(e.target.value))}
                                    >
                                        <option value="">-- No Section Selected --</option>
                                        {questionPaperSections.map((sec, idx) => (
                                            <option key={idx} value={idx}>
                                                {sec.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Add Section Button */}
                                <div className="" style={{ width: 'fit-content' }}>
                                    <label className="form-label d-block invisible">Add Section</label>
                                    <button
                                        className="btn btn-warning w-100"
                                        onClick={() => {
                                            const newSec = {
                                                title: `Section ${String.fromCharCode(65 + questionPaperSections.length)}`,
                                                questionIds: [],
                                            };
                                            setQuestionPaperSections([...questionPaperSections, newSec]);
                                            setActiveSectionIndex(questionPaperSections.length);
                                        }}
                                    >
                                        ➕ Add Section
                                    </button>
                                </div>

                                {/* Select All */}
                                <div className="selectAll px-2 ms-2" style={{ width: 'fit-content' }}>
                                    <input
                                        type="checkbox"
                                        checked={
                                            selectedQuestions.length > 0 &&
                                            selectedQuestions.length === getAllQuestionIds(questions).length
                                        }
                                        onChange={(e) => {
                                            const allIds = getAllQuestionIds(questions);
                                            console.log('Select All Clicked:', e.target.checked);
                                            if (e.target.checked) {
                                                setSelectedQuestions(allIds);
                                            } else {
                                                setSelectedQuestions([]);
                                            }
                                        }}
                                    />

                                    <label className="" htmlFor="selectAllCheckbox">
                                        Select All
                                    </label>
                                </div>
                            </div>

                            {/* STEP 3: Filter + Question List */}
                            {questions.length > 0 && (
                                <div className="border rounded shadow-sm bg-white p-3">
                                    <h6 className="mb-3 border-bottom pb-2 d-flex align-items-center">
                                        <i className="fas fa-list me-2 text-primary"></i>
                                        All Questions
                                        <span className="badge bg-secondary ms-2">{filteredAndSortedQuestions.length}</span>
                                    </h6>

                                    <div className="row mb-3 ">
                                        <div className="col-md-4">
                                            <input
                                                type="text"
                                                className="form-control SearchStudent border"
                                                placeholder="Search question text or ID..."
                                                value={searchText}
                                                onChange={(e) => setSearchText(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-md-1">
                                            <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ width: "100%" }}>
                                                <option value="">All Types</option>
                                                <option value="MCQ">MCQ</option>
                                                <option value="Descriptive">Descriptive</option>
                                                <option value="Match">Match</option>
                                                <option value="sub-question">Sub-Questions</option>
                                            </select>
                                        </div>
                                        <div className="col-md-1">
                                            <input
                                                type="number"
                                                className="form-control SearchStudent border"
                                                placeholder="Filter by Marks"
                                                value={filterMarks}
                                                onChange={(e) => setFilterMarks(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-md-2">
                                            <select className="form-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                                                <option value="desc">Sort: High to Low</option>
                                                <option value="asc">Sort: Low to High</option>
                                            </select>
                                        </div>

                                    </div>

                                    <div className="questions-list">
                                        {filteredAndSortedQuestions.map((q, i) => renderQuestionBlock(q, i))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="modal-footer bg-white border-top shadow-sm d-flex justify-content-between">
                            <button className="btn btn-secondary" data-bs-dismiss="modal">
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                data-bs-toggle="modal"
                                data-bs-target="#selectInstructionsModal"
                            >
                                <i className="fas fa-sliders-h me-2"></i>Select Instructions & Download
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preivew  */}
            {previewImageUrl && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex justify-content-center align-items-center"
                    style={{ zIndex: 2000 }}
                    onClick={() => setPreviewImageUrl('')}
                >
                    <div
                        className="bg-white rounded shadow p-3 position-relative"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            className="btn-close position-absolute top-0 end-0 m-2"
                            onClick={() => setPreviewImageUrl('')}
                        />
                        <img
                            src={previewImageUrl}
                            alt="Preview"
                            className="img-fluid rounded"
                            style={{ maxHeight: '80vh', maxWidth: '90vw', objectFit: 'contain' }}
                        />
                    </div>
                </div>
            )}

            <div className="modal fade" id="addQuestionModal" tabIndex="-1" aria-labelledby="addQuestionModalLabel" aria-hidden="true" >
                <div className="modal-dialog modal-fullscreen modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content rounded-4 shadow">

                        <div className="modal-header">
                            <h5 className="modal-title" id="addQuestionModalLabel">
                                <i className="fas fa-edit me-2 text-primary"></i>New Question
                            </h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                        </div>

                        <div className="modal-body question-paper-selection">
                            {/* Question Text + Marks + Image */}
                            <div className="row align-items-start g-2 mb-3" style={{ borderBottom: '0.5px solid gray', paddingBottom: '10px' }}>
                                {/* Question Text */}
                                <div className="col-md-6">
                                    <textarea
                                        className="form-control shadow-sm"
                                        placeholder="Enter question text"
                                        value={newQuestion.questionText}
                                        title={newQuestion.questionText}
                                        onChange={e => setNewQuestion(q => ({ ...q, questionText: e.target.value }))}
                                        rows={3} // default height
                                        style={{ resize: "vertical", whiteSpace: "pre-wrap" }} // allow wrapping
                                    />
                                </div>

                                {/* Marks */}
                                <div className="col-md-1">
                                    <input
                                        className="form-control shadow-sm"
                                        placeholder="Marks"
                                        value={newQuestion.questionMarks}
                                        onChange={e => setNewQuestion(q => ({ ...q, questionMarks: e.target.value }))}
                                    />
                                </div>

                                {/* Question Type Dropdown */}
                                <div className="col-md-2">
                                    <select
                                        className="form-select shadow-sm"
                                        value={newQuestion.questionType}
                                        onChange={e =>
                                            setNewQuestion(q => ({
                                                ...q,
                                                questionType: e.target.value,
                                                options: [],
                                                pairs: []
                                            }))
                                        }
                                    >
                                        <option value="">-- Select Type --</option>
                                        <option value="MCQ">MCQ</option>
                                        <option value="Descriptive">Descriptive</option>
                                        <option value="Match">Match the Following</option>
                                        <option value="sub-question">Sub-Questions</option>
                                    </select>
                                </div>

                                {/* Upload Image */}
                                <div className="col-md-3">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="form-control shadow-sm"
                                        title="Upload Question Image"
                                        onChange={async e => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const url = await uploadToImgBB(file);
                                                setNewQuestion(q => ({ ...q, questionImage: url }));
                                            }
                                        }}
                                    />

                                    {/* Image Actions */}
                                    {newQuestion.questionImage && (
                                        <div className="mt-2 d-flex gap-2 flex-wrap">
                                            <button
                                                className="btn btn-outline-secondary btn-sm"
                                                onClick={() => setPreviewImageUrl(newQuestion.questionImage)}
                                            >
                                                <i className="fas fa-eye me-1"></i>View
                                            </button>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => setNewQuestion(q => ({ ...q, questionImage: '' }))}
                                            >
                                                <i className="fas fa-trash-alt me-1"></i>Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>


                            {/* MCQ Options */}
                            {newQuestion.questionType === 'MCQ' && (
                                <>
                                    <button
                                        className="btn btn-primary btn-sm mb-3"
                                        style={{ width: 'fit-content' }}
                                        onClick={addOption}
                                    >
                                        <i className="fas fa-plus me-1"></i>Add Option
                                    </button>

                                    <div className="row">
                                        {newQuestion.options.map((opt, i) => (
                                            <div className="col-md-3 mb-3" key={i}>
                                                <input
                                                    className="form-control mb-1"
                                                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                                    value={opt.text}
                                                    onChange={e => updateOption(i, 'text', e.target.value)}
                                                />
                                                <input
                                                    type="file"
                                                    className="form-control form-control-sm"
                                                    onChange={async e => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            const url = await uploadToImgBB(file);
                                                            updateOption(i, 'imageUrl', url);
                                                        }
                                                    }}
                                                />
                                                {opt.imageUrl && (
                                                    <div className="mt-2 d-flex gap-2">
                                                        <button
                                                            className="btn btn-outline-secondary btn-sm"
                                                            onClick={() => setPreviewImageUrl(opt.imageUrl)}
                                                        >
                                                            <i className="fas fa-eye me-1"></i>View
                                                        </button>
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => updateOption(i, 'imageUrl', '')}
                                                        >
                                                            <i className="fas fa-trash-alt me-1"></i>Remove
                                                        </button>
                                                    </div>
                                                )}

                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Match the Following */}
                            {newQuestion.questionType === 'Match' && (
                                <>
                                    <button
                                        className="btn btn-primary btn-sm mb-3"
                                        style={{ width: 'fit-content' }}
                                        onClick={addPair}
                                    >
                                        <i className="fas fa-plus me-1"></i>Add Pair
                                    </button>

                                    {newQuestion.pairs.map((p, i) => (
                                        <div className="row mb-3" key={i}>
                                            {['left', 'right'].map(side => (
                                                <div className="col-md-6 mb-2" key={side}>
                                                    <input
                                                        className="form-control mb-1"
                                                        placeholder={`${side} text`}
                                                        value={p[`${side}Text`]}
                                                        onChange={e => updatePair(i, side, 'Text', e.target.value)}
                                                    />
                                                    <input
                                                        type="file"
                                                        className="form-control form-control-sm"
                                                        onChange={async e => {
                                                            const file = e.target.files[0];
                                                            if (file) {
                                                                const url = await uploadToImgBB(file);
                                                                updatePair(i, side, 'Image', url);
                                                            }
                                                        }}
                                                    />
                                                    {p[`${side}Image`] && (
                                                        <div className="mt-2 d-flex gap-2">
                                                            <button
                                                                className="btn btn-outline-secondary btn-sm"
                                                                onClick={() => setPreviewImageUrl(p[`${side}Image`])}
                                                            >
                                                                <i className="fas fa-eye me-1"></i>View
                                                            </button>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => updatePair(i, side, 'Image', '')}
                                                            >
                                                                <i className="fas fa-trash-alt me-1"></i>Remove
                                                            </button>
                                                        </div>
                                                    )}

                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* Sub-Questions Section for Heading Type */}
                            {newQuestion.questionType === 'sub-question' && (
                                <div className="mt-4 border-top pt-3">
                                    <h6 className="mb-1">Sub-Questions</h6>
                                    {newQuestion.subQuestions.map((subQ, index) => (
                                        <div className="mb-1 py-2 border rounded-3" key={index}>
                                            {/* Sub-Question Text + Marks + Image */}
                                            <div className="row align-items-center mb-1">
                                                <div className="col-md-6">
                                                    <input
                                                        type="text"
                                                        className="form-control shadow-sm"
                                                        placeholder={`Sub-question ${index + 1} text`}
                                                        value={subQ.questionText}
                                                        onChange={e => updateSubQuestion(index, 'questionText', e.target.value)}
                                                    />
                                                </div>

                                                <div className="col-md-1">
                                                    <input
                                                        className="form-control shadow-sm"
                                                        placeholder="Marks"
                                                        value={subQ.questionMarks}
                                                        onChange={e => updateSubQuestion(index, 'questionMarks', e.target.value)}
                                                    />
                                                </div>

                                                {/* Sub-question Type Dropdown */}
                                                <div className="col-md-2">
                                                    <select
                                                        className="form-select w-auto shadow-sm"
                                                        value={subQ.questionType}
                                                        onChange={e => updateSubQuestion(index, 'questionType', e.target.value)}
                                                    >
                                                        <option value="">-- Select Question Type --</option>
                                                        <option value="MCQ">MCQ</option>
                                                        <option value="Descriptive">Descriptive</option>
                                                        <option value="Match">Match the Following</option>
                                                    </select>
                                                </div>

                                                <div className="col-md-3">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="form-control"
                                                        onChange={async e => {
                                                            const file = e.target.files[0];
                                                            if (file) {
                                                                const url = await uploadToImgBB(file);
                                                                updateSubQuestion(index, 'questionImage', url);
                                                            }
                                                        }}
                                                    />
                                                    {subQ.questionImage && (
                                                        <div className="mt-2 d-flex gap-2 flex-wrap">
                                                            <button
                                                                className="btn btn-outline-secondary btn-sm"
                                                                onClick={() => setPreviewImageUrl(subQ.questionImage)}
                                                            >
                                                                <i className="fas fa-eye me-1"></i>View
                                                            </button>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => updateSubQuestion(index, 'questionImage', '')}
                                                            >
                                                                <i className="fas fa-trash-alt me-1"></i>Remove
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Sub-question MCQ */}
                                            {subQ.questionType === 'MCQ' && (
                                                <>
                                                    <button
                                                        className="btn btn-primary btn-sm mb-3"
                                                        onClick={() => {
                                                            const updatedOptions = [...subQ.options, { text: '', imageUrl: '' }];
                                                            updateSubQuestion(index, 'options', updatedOptions);
                                                        }}
                                                    >
                                                        <i className="fas fa-plus me-1"></i>Add Option
                                                    </button>

                                                    <div className="row">
                                                        {subQ.options.map((opt, i) => (
                                                            <div className="col-md-3 mb-3" key={i}>
                                                                <input
                                                                    className="form-control mb-1"
                                                                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                                                    value={opt.text}
                                                                    onChange={e => {
                                                                        const updatedOptions = [...subQ.options];
                                                                        updatedOptions[i].text = e.target.value;
                                                                        updateSubQuestion(index, 'options', updatedOptions);
                                                                    }}
                                                                />
                                                                <input
                                                                    type="file"
                                                                    className="form-control form-control-sm"
                                                                    onChange={async e => {
                                                                        const file = e.target.files[0];
                                                                        if (file) {
                                                                            const url = await uploadToImgBB(file);
                                                                            const updatedOptions = [...subQ.options];
                                                                            updatedOptions[i].imageUrl = url;
                                                                            updateSubQuestion(index, 'options', updatedOptions);
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}

                                            {/* Sub-question Match */}
                                            {subQ.questionType === 'Match' && (
                                                <>
                                                    <button
                                                        className="btn btn-primary btn-sm mb-3"
                                                        onClick={() => {
                                                            const updatedPairs = [...subQ.pairs, {
                                                                leftText: '',
                                                                leftImage: '',
                                                                rightText: '',
                                                                rightImage: ''
                                                            }];
                                                            updateSubQuestion(index, 'pairs', updatedPairs);
                                                        }}
                                                    >
                                                        <i className="fas fa-plus me-1"></i>Add Pair
                                                    </button>

                                                    {subQ.pairs.map((pair, i) => (
                                                        <div className="row mb-3" key={i}>
                                                            {['left', 'right'].map(side => (
                                                                <div className="col-md-6 mb-2" key={side}>
                                                                    <input
                                                                        className="form-control mb-1"
                                                                        placeholder={`${side} text`}
                                                                        value={pair[`${side}Text`]}
                                                                        onChange={e => {
                                                                            const updatedPairs = [...subQ.pairs];
                                                                            updatedPairs[i][`${side}Text`] = e.target.value;
                                                                            updateSubQuestion(index, 'pairs', updatedPairs);
                                                                        }}
                                                                    />
                                                                    <input
                                                                        type="file"
                                                                        className="form-control form-control-sm"
                                                                        onChange={async e => {
                                                                            const file = e.target.files[0];
                                                                            if (file) {
                                                                                const url = await uploadToImgBB(file);
                                                                                const updatedPairs = [...subQ.pairs];
                                                                                updatedPairs[i][`${side}Image`] = url;
                                                                                updateSubQuestion(index, 'pairs', updatedPairs);
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    ))}

                                    <button
                                        className="btn btn-success btn-sm"
                                        onClick={addSubQuestion}
                                    >
                                        <i className="fas fa-plus me-1"></i>Add Sub-Question
                                    </button>
                                </div>
                            )}

                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-success"
                                onClick={handleAddQuestion}
                                disabled={questionUploading}
                            >
                                <i className="fas fa-save me-2"></i> {questionUploading ? 'Saving...' : 'Save'}
                            </button>

                        </div>

                    </div>
                </div>
            </div>

            <div className='QuestionPaper-Page-Content'>
                <div className="collapse" id="addInstructionCollapse">
                    <div className="card p-3 mb-4 shadow-sm">
                        <h5 className="mb-3">Instruction Template</h5>

                        <div>
                            <input
                                type="file"
                                accept="image/*"
                                className="form-control mb-2"
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        try {
                                            const url = await uploadToImgBB(file);
                                            setNewTemplate(t => ({ ...t, logo: url }));
                                        } catch (err) {
                                            showMessage("❌ Logo upload failed.");
                                            console.error(err);
                                        }
                                    }
                                }}
                            />
                            {newTemplate.logo && (
                                <div className="mb-2">
                                    <img
                                        src={newTemplate.logo}
                                        alt="Uploaded Logo"
                                        style={{ height: '60px', objectFit: 'contain' }}
                                    />
                                </div>
                            )}
                        </div>

                        <input
                            className="form-control mb-2"
                            placeholder="School Name"
                            value={newTemplate.schoolName}
                            onChange={e => setNewTemplate(t => ({ ...t, schoolName: e.target.value }))}
                        />

                        <input
                            className="form-control mb-2"
                            placeholder="Address"
                            value={newTemplate.address}
                            onChange={e => setNewTemplate(t => ({ ...t, address: e.target.value }))}
                        />

                        <input
                            className="form-control mb-2"
                            placeholder="Exam Title"
                            value={newTemplate.examTitle}
                            onChange={e => setNewTemplate(t => ({ ...t, examTitle: e.target.value }))}
                        />

                        {newTemplate.instructions.map((inst, i) => (
                            <input
                                key={i}
                                className="form-control mb-2"
                                placeholder={`Instruction ${i + 1}`}
                                value={inst}
                                onChange={e => updateInstruction(i, e.target.value)}
                            />
                        ))}

                        <div className="d-flex justify-content-between">
                            <button className="btn btn-sm btn-outline-secondary" onClick={addInstruction}>
                                <i className="fas fa-plus me-1"></i>Add Instruction
                            </button>
                            <button className="btn btn-sm btn-success" onClick={saveTemplate}>
                                <i className="fas fa-save me-1"></i>Save Template
                            </button>
                        </div>
                    </div>
                    {/* List of Saved Instruction Templates */}
                    {templates.length > 0 && (
                        <div className="mt-4 p-2">
                            <h5 className="mb-4 text-primary">📁 Saved Instruction Templates</h5>
                            <div className="row row-cols-1 row-cols-md-2 g-4">
                                {templates.map((template, idx) => (
                                    <div key={template._id} className="col">
                                        <div className="card shadow-sm rounded-4 p-3 bg-light border-0">
                                            <div className="d-flex justify-content-between align-items-start mb-3">
                                                <div>
                                                    <h6 className="mb-1 text-secondary fw-bold">Template {idx + 1}</h6>
                                                    <small className="text-muted">{template.examTitle}</small>
                                                </div>
                                                <div className="btn-group btn-group-sm">
                                                    <button className="btn btn-outline-primary" onClick={() => handleEditTemplate(template)} disabled={!(canEdit || canQpEdit)}>
                                                        <i className="fas fa-edit me-1"></i>Edit
                                                    </button>
                                                    <button className="btn btn-outline-danger" onClick={() => handleDeleteTemplate(template._id)} disabled={!canEdit}>
                                                        <i className="fas fa-trash-alt me-1"></i>Delete
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="bg-white p-3 rounded-3 shadow-sm">
                                                <p className="mb-2"><strong>🏫 School:</strong> {template.schoolName}</p>
                                                <p className="mb-2"><strong>📍 Address:</strong> {template.address}</p>

                                                {(template.date || template.time || template.maxMarks) && (
                                                    <div className="text-muted small mb-3">
                                                        {template.date && <div><strong>📅 Date:</strong> {template.date}</div>}
                                                        {template.time && <div><strong>⏰ Time:</strong> {template.time}</div>}
                                                        {template.maxMarks && <div><strong>🧮 Max Marks:</strong> {template.maxMarks}</div>}
                                                    </div>
                                                )}

                                                <p className="fw-semibold mb-2">📌 Instructions:</p>
                                                <div className="d-flex flex-column gap-1">
                                                    {template.instructions.map((inst, i) => (
                                                        <div key={i} className="px-3 py-2 bg-light border rounded text-dark">
                                                            {inst}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            <div className="modal fade" id="selectInstructionsModal" tabIndex="-1">
                <div className="modal-dialog modal-xl modal-dialog-scrollable">
                    <div className="modal-content border border-2">
                        <div className="modal-header bg-light border-bottom">
                            <h5 className="modal-title">
                                <i className="fas fa-sliders-h me-2"></i>Select Question Paper Details
                            </h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                        </div>

                        <div className="modal-body">

                            {/* Section 1: School Name, Address, Title */}
                            <div className="border p-3 mb-3 rounded shadow-sm bg-white">
                                <h6 className="mb-3 border-bottom pb-2">Heading Details</h6>
                                <div className="row">
                                    <div className="row">
                                        {templates.map((template, idx) => {
                                            const isSelected =
                                                selectedSchoolName === template.schoolName &&
                                                selectedAddress === template.address &&
                                                selectedExamTitle === template.examTitle;

                                            return (
                                                <div className="col-md-4 mb-3" key={template._id}>
                                                    <div
                                                        className={`card h-100 shadow-sm p-3 cursor-pointer border border-2 ${isSelected ? 'border-primary' : 'border-transparent'
                                                            }`}
                                                        onClick={() => {
                                                            setSelectedSchoolName(template.schoolName);
                                                            setSelectedAddress(template.address);
                                                            setSelectedExamTitle(template.examTitle);
                                                            if (template.logo) setSelectedLogo(template.logo);
                                                        }}
                                                    >
                                                        {template.logo && (
                                                            <img
                                                                src={template.logo}
                                                                alt="Logo"
                                                                style={{ height: '50px', objectFit: 'contain' }}
                                                                className="mb-2"
                                                            />
                                                        )}
                                                        <p className="mb-1"><strong>🏫 {template.schoolName}</strong></p>
                                                        <p className="mb-1 text-muted"><small>📍 {template.address}</small></p>
                                                        <p className="mb-0 text-primary"><small>📝 {template.examTitle}</small></p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="col-md-4 mb-3">
                                        <label className="form-label">Select School Name</label>
                                        <select
                                            className="form-select"
                                            value={selectedSchoolName}
                                            onChange={e => setSelectedSchoolName(e.target.value)}
                                        >
                                            <option value="">-- Select --</option>
                                            {[...new Set(templates.map(t => t.schoolName))].map((name, idx) => (
                                                <option key={idx} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-4 mb-3">
                                        <label className="form-label">Select Address</label>
                                        <select
                                            className="form-select"
                                            value={selectedAddress}
                                            onChange={e => setSelectedAddress(e.target.value)}
                                        >
                                            <option value="">-- Select --</option>
                                            {[...new Set(templates.map(t => t.address))].map((addr, idx) => (
                                                <option key={idx} value={addr}>{addr}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-4 mb-3">
                                        <label className="form-label">Select Exam Title</label>
                                        <select
                                            className="form-select"
                                            value={selectedExamTitle}
                                            onChange={e => setSelectedExamTitle(e.target.value)}
                                        >
                                            <option value="">-- Select --</option>
                                            {[...new Set(templates.map(t => t.examTitle))].map((title, idx) => (
                                                <option key={idx} value={title}>{title}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Instructions */}
                            <div className="border p-3 mb-3 rounded shadow-sm bg-white">
                                <h6 className="mb-3 border-bottom pb-2 d-flex justify-content-between align-items-center">
                                    Select Instructions
                                    <div className="form-check">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id="selectAllInstructions"
                                            onChange={(e) => {
                                                const all = Array.from(
                                                    new Set(templates.flatMap(t => t.instructions).filter(i => i.trim() !== ''))
                                                );
                                                setSelectedInstructions(e.target.checked ? all : []);
                                            }}
                                            checked={
                                                selectedInstructions.length ===
                                                Array.from(new Set(templates.flatMap(t => t.instructions).filter(i => i.trim() !== ''))).length
                                            }
                                        />
                                        <label className="form-check-label" htmlFor="selectAllInstructions">
                                            Select All
                                        </label>
                                    </div>
                                </h6>

                                <div className="row">
                                    {Array.from(
                                        new Set(templates.flatMap(t => t.instructions).filter(i => i.trim() !== ''))
                                    ).map((instruction, i) => (
                                        <div key={i} className="col-md-6 mb-2">
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    checked={selectedInstructions.includes(instruction)}
                                                    onChange={() => toggleInstruction(instruction)}
                                                    id={`inst-${i}`}
                                                />
                                                <label className="form-check-label" htmlFor={`inst-${i}`}>
                                                    {instruction}
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section 3: Manual Entry */}
                            <div className="border p-3 mb-3 rounded shadow-sm bg-white">
                                <h6 className="mb-3 border-bottom pb-2">Exam Details</h6>
                                <div className="row">
                                    <div className="col-md-4 mb-3">
                                        <input
                                            className="form-control"
                                            placeholder="Exam Date"
                                            value={examDate}
                                            onChange={e => setExamDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-md-4 mb-3">
                                        <input
                                            className="form-control"
                                            placeholder="Exam Time"
                                            value={examTime}
                                            onChange={e => setExamTime(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-md-4 mb-3">
                                        <input
                                            className="form-control"
                                            placeholder="Max Marks"
                                            value={maxMarks}
                                            onChange={e => setMaxMarks(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer bg-light border-top">
                            <button className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button className="btn btn-primary" onClick={handlePrint} disabled={!(canEdit || canQpEdit)}>
                                <i className="fas fa-download me-1"></i>Download
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Question Modal */}
            <div
                className="modal fade"
                id="editQuestionModal"
                tabIndex="-1"
                aria-labelledby="editQuestionModalLabel"
                aria-hidden="true"
                data-bs-backdrop="false"
            >
                <div className="modal-dialog modal-fullscreen modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content rounded-4 shadow">
                        <div className="modal-header">
                            <h5 className="modal-title" id="editQuestionModalLabel">
                                <i className="fas fa-edit me-2 text-primary"></i>Edit Question
                            </h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" />
                        </div>

                        <div className="modal-body question-paper-selection">
                            {editQuestionData && (
                                <>
                                    {/* Question Text + Marks + Image */}
                                    <div className="row align-items-center mb-3" style={{ borderBottom: '0.5px solid gray', paddingBottom: '10px' }}>
                                        <div className="col-md-6">
                                            <input
                                                type="text"
                                                className="form-control shadow-sm"
                                                placeholder="Enter question text"
                                                value={editQuestionData.questionText}
                                                onChange={(e) =>
                                                    setEditQuestionData((q) => ({
                                                        ...q,
                                                        questionText: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="col-md-1">
                                            <input
                                                className="form-control shadow-sm"
                                                placeholder="Marks"
                                                value={editQuestionData.questionMarks}
                                                onChange={(e) =>
                                                    setEditQuestionData((q) => ({
                                                        ...q,
                                                        questionMarks: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        {/* Question Type Dropdown */}
                                        <div className="col-md-2">
                                            <select
                                                className="form-select w-auto shadow-sm"
                                                value={editQuestionData.questionType}
                                                onChange={(e) =>
                                                    setEditQuestionData((q) => ({
                                                        ...q,
                                                        questionType: e.target.value,
                                                        options: [],
                                                        pairs: [],
                                                        subQuestions: [],
                                                    }))
                                                }
                                            >
                                                <option value="">-- Select Question Type --</option>
                                                <option value="MCQ">MCQ</option>
                                                <option value="Descriptive">Descriptive</option>
                                                <option value="Match">Match the Following</option>
                                                <option value="sub-question">Sub-Questions</option>
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="form-control"
                                                onChange={async (e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const url = await uploadToImgBB(file);

                                                        // Fallback handling if questionImage field doesn't yet exist
                                                        setEditQuestionData((q) => ({
                                                            ...q,
                                                            questionImage: url || '',
                                                            _id: q._id, // <- preserve this so edit works
                                                        }));
                                                    }
                                                }}
                                            />
                                            {editQuestionData.questionImage && (
                                                <div className="mt-2 d-flex gap-2 flex-wrap">
                                                    <button
                                                        className="btn btn-outline-secondary btn-sm"
                                                        onClick={() => setPreviewImageUrl(editQuestionData.questionImage)}
                                                    >
                                                        <i className="fas fa-eye me-1"></i>View
                                                    </button>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() =>
                                                            setEditQuestionData((q) => ({
                                                                ...q,
                                                                questionImage: '',
                                                            }))
                                                        }
                                                    >
                                                        <i className="fas fa-trash-alt me-1"></i>Remove
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {renderEditQuestionTypeFields(editQuestionData, setEditQuestionData)}

                                </>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" data-bs-dismiss="modal">
                                Cancel
                            </button>
                            <button className="btn btn-success" onClick={handleEditSubmit}>
                                <i className="fas fa-save me-2"></i>Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* {questions.length > 0 && (
                <>
                    <h5 className="border-bottom pb-2 w-100 text-dark">
                        <i className="fas fa-list me-2 text-primary"></i>
                        All Questions
                        <span className="badge bg-secondary ms-2">{filteredAndSortedQuestions.length}</span>
                    </h5>

                    <div className="row">
                        <div className="col-md-4 mb-2">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search question text..."
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3 mb-2">
                            <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                                <option value="">All Types</option>
                                <option value="MCQ">MCQ</option>
                                <option value="Descriptive">Descriptive</option>
                                <option value="Match">Match</option>
                                <option value="sub-question">Sub-Questions</option>
                            </select>
                        </div>
                        <div className="col-md-2 mb-2">
                            <input
                                type="number"
                                className="form-control"
                                placeholder="Filter by Marks"
                                value={filterMarks}
                                onChange={e => setFilterMarks(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3 mb-2">
                            <select className="form-select" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                                <option value="desc">Sort: High to Low</option>
                                <option value="asc">Sort: Low to High</option>
                            </select>
                        </div>
                    </div>

                    <div className="questions-list">
                        {filteredAndSortedQuestions.map((q, i) => {
                            return renderQuestionBlock(q, i);
                        })}
                    </div>

                </>
            )} */}

            {/* Preview Collapse Area */}
            <div className="d-none">
                <PrintQuestionPaper
                    ref={printRef}
                    sections={questionPaperSections}
                    questionMap={globalQuestionMap}
                    selectedQuestions={selectedQuestions}
                    fullWidthImagesMap={fullWidthImagesMap}
                    schoolLogo={selectedLogo}
                    schoolName={selectedSchoolName}
                    address={selectedAddress}
                    examTitle={selectedExamTitle}
                    examDate={examDate}
                    examTime={examTime}
                    maxMarks={maxMarks}
                    instructions={selectedInstructions}
                    selectedClass={classes.find(c => c._id === selectedClass)?.class || ''}
                    selectedSubject={filteredSubjects.find(s => s._id === selectedSubject)?.name || ''}
                />
            </div>

            {/* Hidden printable component */}
            <div className="d-none">
                <DownloadQuestionBank
                    ref={printRefFiltered}
                    questions={filteredAndSortedQuestions}
                    selectedClass={classes.find(c => c._id === selectedClass)?.class || ""}
                    selectedSubject={filteredSubjects.find(s => s._id === selectedSubject)?.name || ""}
                    selectedChapter={chapterList.find(ch => ch._id === selectedChapter)?.name || ""}
                />
            </div>

            {message && (
                <div
                    className="position-fixed fade-in"
                    style={{
                        bottom: "20px",
                        right: "20px",
                        zIndex: 9999,
                        backgroundColor:
                            message.toLowerCase().includes("delete") || message.toLowerCase().includes("error")
                                ? "#f8d7da"
                                : message.toLowerCase().includes("success") || message.toLowerCase().includes("updated")
                                    ? "#d1e7dd"
                                    : message.toLowerCase().includes("please")
                                        ? "#fff3cd"
                                        : "#e2e3e5",
                        color:
                            message.toLowerCase().includes("delete") || message.toLowerCase().includes("error")
                                ? "#842029"
                                : message.toLowerCase().includes("success") || message.toLowerCase().includes("updated")
                                    ? "#0f5132"
                                    : message.toLowerCase().includes("please")
                                        ? "#664d03"
                                        : "#41464b",
                        padding: "12px 18px 18px",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                        fontWeight: "500",
                        maxWidth: "300px",
                        overflow: "hidden",
                    }}
                >
                    {message}

                    <div
                        className="progress-bar-animate mt-2"
                        style={{
                            height: "4px",
                            backgroundColor:
                                message.toLowerCase().includes("delete") || message.toLowerCase().includes("error")
                                    ? "#842029"
                                    : message.toLowerCase().includes("success") || message.toLowerCase().includes("updated")
                                        ? "#0f5132"
                                        : message.toLowerCase().includes("please")
                                            ? "#664d03"
                                            : "#41464b",
                        }}
                    />
                </div>
            )}

        </div>
    );
}