import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import api from '../../API';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import PrintQuestionPaper from '../PrintQuestionPaper/PrintQuestionPaper';
import DownloadQuestionBank from '../DownloadQuestionBank/DownloadQuestionBank';
import TextEditor from '../TextEditor/TextEditor';

import './QuestionPaperV2.css';

export default function QuestionPaperV2() {
    const navigate = useNavigate();

    // ==========================================
    // REFS & PRINTING
    // ==========================================
    const printRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: "QuestionPaper",
    });

    const printRefFiltered = useRef(null);
    const handleDownloadFiltered = useReactToPrint({
        contentRef: printRefFiltered,
        documentTitle: "Filtered_Question_Bank",
    });

    // ==========================================
    // AUTH & PERMISSIONS
    // ==========================================
    const [userType, setUserType] = useState('');
    useEffect(() => {
        const token = localStorage.getItem('token');
        const ut = localStorage.getItem('userType');
        if (!token || !ut) {
            navigate('/login');
        } else {
            setUserType(ut);
        }
    }, [navigate]);

    const isDev = localStorage.getItem('isDev') === 'true';
    const canEdit = isDev || userType === "admin";
    const canQpEdit = userType === "qp-editor";
    const hasWriteAccess = isDev || canEdit || canQpEdit;
    const canDelete = isDev || userType === "admin";
    const canDownload = isDev || userType === "admin" || userType === "qp-editor";

    // ==========================================
    // GLOBAL UI STATE (Toast, Loaders, Modals)
    // ==========================================
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'builder' | 'preview'
    const [message, setMessage] = useState("");
    const [uploading, setUploading] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isViewSelectedDrawerOpen, setIsViewSelectedDrawerOpen] = useState(false);

    const showMessage = useCallback((msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(""), 5000);
    }, []);

    const uploadToImgBB = async (file) => {
        const formData = new FormData();
        formData.append('key', '8451f34223c6e62555eec9187d855f8f');
        formData.append('image', file);
        setUploading(true);
        try {
            const res = await fetch('https://api.imgbb.com/1/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success && (data.data?.display_url || data.data?.url)) {
                return data.data.display_url || data.data.url;
            } else {
                throw new Error(data.error?.message || "Upload failed");
            }
        } catch (err) {
            console.error('Image upload failed', err);
            showMessage('Image upload failed: ' + err.message);
            throw err;
        } finally {
            setUploading(false);
        }
    };

    // ==========================================
    // DATA STATE (Classes, Subjects, Chapters)
    // ==========================================
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [classSubjects, setClassSubjects] = useState([]);
    const [allChapters, setAllChapters] = useState([]);

    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedChapter, setSelectedChapter] = useState('');

    const [filteredSubjects, setFilteredSubjects] = useState([]);
    const [chapterList, setChapterList] = useState([]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const cRes = await api.get('/getClasses').catch(err => ({ data: { classes: [] } }));
                const sRes = await api.get('/getSubjects').catch(err => ({ data: { subjects: [] } }));
                const csRes = await api.get('/classsubjectlinks').catch(err => ({ data: { data: [] } }));
                const chRes = await api.get('/chapters').catch(err => ({ data: { data: [] } }));

                setClasses(cRes.data.classes || []);
                setSubjects(sRes.data.subjects || []);
                setClassSubjects(csRes.data?.data || []);
                setAllChapters(chRes.data?.data || []);
            } catch (err) {
                console.error('Error loading initial data:', err.message);
                showMessage('Error loading configuration data.');
            }
        };
        loadInitialData();
    }, [showMessage]);

    const onClassChange = (e) => {
        const cls = e.target.value;
        setSelectedClass(cls);
        setSelectedSubject('');
        setSelectedChapter('');
        setQuestions([]);

        const link = classSubjects.find((x) => {
            const linkClassId = (x.classId?._id || x.classId || '').toString();
            return linkClassId === cls.toString();
        });
        if (link && link.subjectIds && link.subjectIds.length > 0) {
            const linkedSubs = subjects.filter((s) => {
                return link.subjectIds.some(id => {
                    const subId = (id?._id || id || '').toString();
                    const sId = (s._id || '').toString();
                    return subId === sId;
                });
            });
            setFilteredSubjects(linkedSubs);
        } else {
            // Graceful fallback: show all subjects of the school if no links link is found
            setFilteredSubjects(subjects);
        }
    };

    const onSubjectChange = (e) => {
        const subj = e.target.value;
        setSelectedSubject(subj);
        setSelectedChapter('');
        setQuestions([]);
    };

    useEffect(() => {
        if (selectedClass && selectedSubject && allChapters.length > 0) {
            const match = allChapters.find((item) => {
                const isClassMatch = item.classId === selectedClass || item.classId?._id === selectedClass;
                const isSubjectMatch = item.subjectId === selectedSubject || item.subjectId?._id === selectedSubject;
                return isClassMatch && isSubjectMatch;
            });
            setChapterList(match?.chapters || []);
        } else {
            setChapterList([]);
        }
    }, [selectedClass, selectedSubject, allChapters]);

    // ==========================================
    // QUESTIONS STATE & FETCHING
    // ==========================================
    const [questions, setQuestions] = useState([]);
    const [globalQuestionMap, setGlobalQuestionMap] = useState({});

    const fetchQuestions = useCallback(async (cls = selectedClass, subj = selectedSubject, chap = selectedChapter) => {
        if (cls && subj && chap) {
            try {
                const res = await api.get(`/questions?class=${cls}&subject=${subj}&chapter=${chap}`);
                setQuestions(res.data.questions || []);
                const newMap = {};
                (res.data.questions || []).forEach(q => { newMap[q.questionId] = q; });
                setGlobalQuestionMap(newMap);
            } catch (err) {
                console.error("Failed to fetch questions:", err);
                showMessage("Failed to fetch questions");
            }
        } else {
            setQuestions([]);
            setGlobalQuestionMap({});
        }
    }, [selectedClass, selectedSubject, selectedChapter, showMessage]);

    const onChapterChange = (e) => {
        const chap = e.target.value;
        setSelectedChapter(chap);
        fetchQuestions(selectedClass, selectedSubject, chap);
    };

    // ==========================================
    // FILTERS & SORTING
    // ==========================================
    const [searchText, setSearchText] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterMarks, setFilterMarks] = useState('');
    const [sortOrder, setSortOrder] = useState('qId');

    // ==========================================
    // QP CREATION SELECTION STATE
    // ==========================================
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const questionPaperSections = [];

    const getAllQuestionIds = useCallback((questionsList) => {
        const ids = [];
        const collectIds = (list) => {
            list.forEach(q => {
                if (q.questionId) ids.push(q.questionId);
                if (q.subQuestions?.length > 0) collectIds(q.subQuestions);
            });
        };
        collectIds(questionsList);
        return ids;
    }, []);

    const filteredAndSortedQuestions = useMemo(() => {
        return [...questions]
            .sort((a, b) => {
                const aSelected = selectedQuestions.includes(a.questionId);
                const bSelected = selectedQuestions.includes(b.questionId);
                if (aSelected !== bSelected) return bSelected - aSelected;
                return 0;
            })
            .filter(q => {
                const textMatch = q.questionText?.toLowerCase().includes(searchText.toLowerCase()) ||
                    (q.questionId && q.questionId.toString().includes(searchText));
                const marksMatch = filterMarks === '' || String(q.questionMarks) === String(filterMarks);
                const typeMatch = filterType === '' || q.questionType === filterType ||
                    (q.subQuestions && q.subQuestions.some(sub => sub.questionType === filterType));
                return textMatch && marksMatch && typeMatch;
            })
            .sort((a, b) => {
                if (sortOrder === 'asc' || sortOrder === 'desc') {
                    const marksA = parseFloat(a.questionMarks || 0);
                    const marksB = parseFloat(b.questionMarks || 0);
                    return sortOrder === 'asc' ? marksA - marksB : marksB - marksA;
                } else if (sortOrder === 'qId') {
                    const idA = parseInt(a.questionId?.replace(/\D/g, '') || 0, 10);
                    const idB = parseInt(b.questionId?.replace(/\D/g, '') || 0, 10);
                    return idA - idB;
                }
                return 0;
            });
    }, [questions, searchText, filterType, filterMarks, sortOrder, selectedQuestions]);

    const [imageSizesMap, setImageSizesMap] = useState({});
    const [addAnsLine, setAddAnsLine] = useState([]);

    // ==========================================
    // ADD QUESTION LOGIC
    // ==========================================
    const [questionUploading, setQuestionUploading] = useState(false);
    const initialQuestionState = {
        questionText: '', questionImage: '', questionMarks: '', questionType: '',
        hasSubQuestions: false, options: [], pairs: [], subQuestions: []
    };
    const [newQuestion, setNewQuestion] = useState(initialQuestionState);

    const handleClone = (q) => {
        const clone = JSON.parse(JSON.stringify(q));
        const stripIds = (item) => {
            delete item._id;
            delete item.questionId;
            if (item.subQuestions && item.subQuestions.length > 0) {
                item.subQuestions.forEach(stripIds);
            }
        };
        stripIds(clone);
        setNewQuestion(clone);
        setIsAddModalOpen(true);
    };

    const handleAddQuestion = async () => {
        if (!selectedClass || !selectedSubject || !selectedChapter) {
            showMessage("Please select class, subject, and chapter first.");
            return;
        }
        const cleanSubQuestions = (subQs) =>
            subQs.filter(sq => sq.questionText?.trim() && sq.questionType?.trim() && sq.questionMarks?.toString().trim())
                .map(sq => ({ ...sq, subQuestions: cleanSubQuestions(sq.subQuestions || []) }));
        const cleanedQuestion = {
            ...newQuestion,
            questionMarks: newQuestion.questionMarks?.toString().trim() ? newQuestion.questionMarks : undefined,
            questionType: newQuestion.questionType?.trim() ? newQuestion.questionType : undefined,
            subQuestions: cleanSubQuestions(newQuestion.subQuestions || []),
        };
        if (!cleanedQuestion.questionText?.trim() || !cleanedQuestion.questionType || !cleanedQuestion.questionMarks) {
            showMessage("Question is missing required fields (text, type, or marks).");
            return;
        }

        setQuestionUploading(true);
        try {
            await api.post('/questions', {
                class: selectedClass, subject: selectedSubject, chapter: selectedChapter || null, question: cleanedQuestion,
            });
            fetchQuestions();
            showMessage("Question Added Successfully");
            setNewQuestion(initialQuestionState);
            setIsAddModalOpen(false);
        } catch (err) {
            console.error(err);
            showMessage("Failed to add question");
        } finally {
            setQuestionUploading(false);
        }
    };

    // ==========================================
    // EDIT QUESTION LOGIC
    // ==========================================
    const [editQuestionData, setEditQuestionData] = useState(null);

    const openEditModal = (q) => {
        setEditQuestionData(JSON.parse(JSON.stringify(q)));
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async () => {
        if (!editQuestionData?._id) {
            showMessage("Question ID not found.");
            return;
        }
        setQuestionUploading(true);
        try {
            await api.put(`/questions`, {
                class: selectedClass, subject: selectedSubject, chapter: selectedChapter || null,
                mongoId: editQuestionData._id, updatedQuestion: editQuestionData
            });
            fetchQuestions();
            showMessage('Question Updated Successfully');
            setIsEditModalOpen(false);
            setEditQuestionData(null);
        } catch (err) {
            console.error(err);
            showMessage("Failed to update question.");
        } finally {
            setQuestionUploading(false);
        }
    };

    const handleDelete = async (mongoId) => {
        if (!window.confirm('Are you sure you want to delete this question?')) return;
        try {
            await api.delete('/questions', {
                data: { class: selectedClass, subject: selectedSubject, chapter: selectedChapter, mongoId },
            });
            fetchQuestions();
            showMessage('✅ Question deleted successfully.');
        } catch (error) {
            console.error('❌ Error deleting question:', error);
            showMessage('❌ Failed to delete the question.');
        }
    };

    // ==========================================
    // TRANSFER QUESTIONS LOGIC
    // ==========================================
    const [transferDestClass, setTransferDestClass] = useState('');
    const [transferDestSubject, setTransferDestSubject] = useState('');
    const [transferDestChapter, setTransferDestChapter] = useState('');
    const [transferFilteredSubjects, setTransferFilteredSubjects] = useState([]);
    const [transferChapterList, setTransferChapterList] = useState([]);

    const onTransferClassChange = (e) => {
        const cls = e.target.value;
        setTransferDestClass(cls);
        setTransferDestSubject('');
        setTransferDestChapter('');

        const link = classSubjects.find((x) => {
            const linkClassId = (x.classId?._id || x.classId || '').toString();
            return linkClassId === cls.toString();
        });

        if (link && link.subjectIds && link.subjectIds.length > 0) {
            const linkedSubs = subjects.filter((s) => {
                return link.subjectIds.some(id => {
                    const subId = (id?._id || id || '').toString();
                    const sId = (s._id || '').toString();
                    return subId === sId;
                });
            });
            setTransferFilteredSubjects(linkedSubs);
        } else {
            // Fallback to all subjects, same as the main dropdown
            setTransferFilteredSubjects(subjects);
        }
    };

    const onTransferSubjectChange = (e) => {
        const subj = e.target.value;
        setTransferDestSubject(subj);
        setTransferDestChapter('');
    };

    useEffect(() => {
        if (transferDestClass && transferDestSubject && allChapters.length > 0) {
            const match = allChapters.find((item) => {
                const isClassMatch = item.classId === transferDestClass || item.classId?._id === transferDestClass;
                const isSubjectMatch = item.subjectId === transferDestSubject || item.subjectId?._id === transferDestSubject;
                return isClassMatch && isSubjectMatch;
            });
            setTransferChapterList(match?.chapters || []);
        } else {
            setTransferChapterList([]);
        }
    }, [transferDestClass, transferDestSubject, allChapters]);

    const handleTransferQuestions = async () => {
        if (!transferDestClass || !transferDestSubject || !transferDestChapter) {
            showMessage("Please select target Class, Subject, and Chapter.");
            return;
        }

        const topLevelIdsToTransfer = selectedQuestions.filter(id =>
            questions.some(q => q.questionId === id)
        );

        if (topLevelIdsToTransfer.length === 0) {
            showMessage("No top-level questions are selected for transfer.");
            return;
        }

        setQuestionUploading(true);
        let successCount = 0;
        try {
            for (const qId of topLevelIdsToTransfer) {
                const questionObj = globalQuestionMap[qId];
                if (!questionObj) continue;

                // Strip mongo ID
                const cleanObj = JSON.parse(JSON.stringify(questionObj));
                const stripIds = (item) => {
                    delete item._id;
                    if (item.subQuestions && item.subQuestions.length > 0) {
                        item.subQuestions.forEach(stripIds);
                    }
                };
                stripIds(cleanObj);

                // Add to new destination
                await api.post('/questions', {
                    class: transferDestClass,
                    subject: transferDestSubject,
                    chapter: transferDestChapter || null,
                    question: cleanObj
                });

                // Delete from current location
                await api.delete('/questions', {
                    data: {
                        class: selectedClass,
                        subject: selectedSubject,
                        chapter: selectedChapter,
                        mongoId: questionObj._id
                    }
                });
                successCount++;
            }
            showMessage(`Successfully transferred ${successCount} questions!`);
            setSelectedQuestions([]);
            setIsTransferModalOpen(false);
            fetchQuestions();
        } catch (err) {
            console.error("Transfer failed:", err);
            showMessage("Error transferring questions. Please check configuration.");
        } finally {
            setQuestionUploading(false);
        }
    };

    // ==========================================
    // TEMPLATES & EXAM INFO STATE
    // ==========================================
    const [templates, setTemplates] = useState([]);
    const initialTemplateState = { schoolName: '', logo: '', address: '', examTitle: '', instructions: [''] };
    const [newTemplate, setNewTemplate] = useState(initialTemplateState);

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

    useEffect(() => {
        api.get('/get-all-templates').then(res => setTemplates(res.data)).catch(console.error);
    }, []);

    const saveTemplate = async () => {
        try {
            await api.post('/save-template', newTemplate);
            const res = await api.get('/get-all-templates');
            setTemplates(res.data);
            setNewTemplate(initialTemplateState);
            showMessage('Saved successfully ✅');
            setIsTemplateModalOpen(false);
        } catch (error) {
            console.error('Error saving template:', error);
            showMessage('Failed to save template.');
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (!window.confirm("Are you sure you want to delete this template?")) return;
        try {
            await api.delete(`/delete-template/${id}`);
            const res = await api.get('/get-all-templates');
            setTemplates(res.data);
            showMessage("Template Deleted");
        } catch (error) {
            console.error("Error deleting template:", error);
            showMessage("Failed to delete template.");
        }
    };

    // ==========================================
    // RENDER HELPERS
    // ==========================================
    const toRoman = (num) => {
        const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
        return roman[num] || num + 1;
    };

    const renderQuestionBlock = (q, i, level = 0) => (
        <div key={q._id || i} className={`qpv2-question-card ${level > 0 ? 'qpv2-question-card-sub' : ''}`}>

            {/* Header Actions */}
            <div className="qpv2-question-header">
                <div className="qpv2-question-meta">
                    <span className="qpv2-badge qpv2-badge-marks">{q.questionMarks} marks</span>
                    <span className="qpv2-badge qpv2-badge-type">{q.questionType}</span>
                    <span className="qpv2-badge qpv2-badge-id">ID: {q.questionId}</span>
                </div>
                <div className="qpv2-question-actions">
                    <button className="qpv2-icon-btn edit" disabled={!hasWriteAccess} onClick={() => openEditModal(q)} title="Edit">
                        <i className="fas fa-edit"></i>
                    </button>
                    <button className="qpv2-icon-btn clone" disabled={!hasWriteAccess} onClick={() => handleClone(q)} title="Clone">
                        <i className="fas fa-copy"></i>
                    </button>
                    <button className="qpv2-icon-btn delete" disabled={!canDelete} onClick={() => handleDelete(q._id)} title="Delete">
                        <i className="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>

            {/* Title / Content & Checkbox (For all levels including sub-questions) */}
            <div className="qpv2-question-title">
                {q.questionId && (
                    <input
                        type="checkbox"
                        className="qpv2-question-checkbox"
                        checked={selectedQuestions.includes(q.questionId)}
                        onChange={(e) => {
                            const isChecked = e.target.checked;
                            const allSubIds = q.subQuestions?.map(sub => sub.questionId) || [];
                            const toAdd = [q.questionId, ...allSubIds];

                            if (isChecked) {
                                setSelectedQuestions(prev => [...new Set([...prev, ...toAdd])]);
                            } else {
                                setSelectedQuestions(prev => prev.filter(id => !toAdd.includes(id)));
                            }
                        }}
                    />
                )}
                <strong style={{ whiteSpace: 'nowrap', paddingTop: '2px' }}>
                    {level === 0 ? `Q${i + 1}.` : `${toRoman(i)}.`}
                </strong>
                <div style={{ flex: 1 }}>
                    <div className="question-content" style={{ display: 'inline-block' }} dangerouslySetInnerHTML={{ __html: q.questionText }} />
                </div>
            </div>

            {/* Toggle Answer Lines */}
            <div className="qpv2-d-flex qpv2-align-center qpv2-gap-2" style={{ marginLeft: '22px', marginTop: '6px' }}>
                <label className="qpv2-switch-wrapper">
                    <div className="qpv2-switch">
                        <input
                            type="checkbox"
                            checked={addAnsLine.some(a => a.QuestionId === q.questionId)}
                            onChange={(e) => {
                                const isChecked = e.target.checked;
                                setAddAnsLine(prev => {
                                    if (isChecked) {
                                        if (!prev.some(a => a.QuestionId === q.questionId)) return [...prev, { QuestionId: q.questionId, lines: 3 }];
                                        return prev;
                                    } else {
                                        return prev.filter(a => a.QuestionId !== q.questionId);
                                    }
                                });
                            }}
                        />
                        <span className="qpv2-slider"></span>
                    </div>
                    <span className="qpv2-switch-label">Add Answer Lines</span>
                </label>
                {addAnsLine.some(a => a.QuestionId === q.questionId) && (
                    <input
                        type="number" min="1"
                        className="qpv2-form-control" style={{ width: '60px', padding: '2px 6px', fontSize: '0.8rem' }}
                        value={addAnsLine.find(a => a.QuestionId === q.questionId)?.lines || 1}
                        onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 1;
                            setAddAnsLine(prev => prev.map(a => a.QuestionId === q.questionId ? { ...a, lines: val } : a));
                        }}
                    />
                )}
            </div>

            {/* Question Image */}
            {q.questionImage && (
                <div className="qpv2-question-img-container" style={{ marginLeft: '22px', marginTop: '6px' }}>
                    <img
                        src={q.questionImage}
                        alt="Question"
                        className="qpv2-question-img thumbnail"
                        style={{ width: '80px', height: 'auto', maxHeight: '120px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #e1e5eb' }}
                        onClick={() => setPreviewImageUrl(q.questionImage)}
                    />
                </div>
            )}

            {/* MCQ Options */}
            {q.questionType === 'MCQ' && q.options && (
                <div className="qpv2-options-grid">
                    {q.options.map((opt, idx) => (
                        <div key={idx} className="qpv2-option-item">
                            <span className="qpv2-option-label">({String.fromCharCode(65 + idx)})</span>
                            <div className="qpv2-d-flex qpv2-align-center" style={{ gap: '6px', flex: 1 }}>
                                <span>{opt.text}</span>
                                {opt.imageUrl && (
                                    <img
                                        src={opt.imageUrl}
                                        alt={`Option ${idx + 1}`}
                                        className="qpv2-question-img thumbnail" style={{ width: 30, height: 30, borderRadius: '4px' }}
                                        onClick={() => setPreviewImageUrl(opt.imageUrl)}
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Match the Following */}
            {q.questionType === 'Match' && q.pairs && (
                <div className="qpv2-match-grid">
                    <div>
                        <div className="qpv2-match-col-title">Column A</div>
                        {q.pairs.map((pair, idx) => (
                            <div key={idx} className="qpv2-d-flex qpv2-align-center qpv2-gap-2" style={{ marginBottom: '4px', fontSize: '0.85rem' }}>
                                <span>{pair.leftText}</span>
                                {pair.leftImage && <img src={pair.leftImage} alt="Left" className="qpv2-question-img thumbnail" style={{ width: 30, height: 30 }} onClick={() => setPreviewImageUrl(pair.leftImage)} />}
                            </div>
                        ))}
                    </div>
                    <div>
                        <div className="qpv2-match-col-title">Column B</div>
                        {q.pairs.map((pair, idx) => (
                            <div key={idx} className="qpv2-d-flex qpv2-align-center qpv2-gap-2" style={{ marginBottom: '4px', fontSize: '0.85rem' }}>
                                <span>{pair.rightText}</span>
                                {pair.rightImage && <img src={pair.rightImage} alt="Right" className="qpv2-question-img thumbnail" style={{ width: 30, height: 30 }} onClick={() => setPreviewImageUrl(pair.rightImage)} />}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recursive Sub-Questions */}
            {q.subQuestions?.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                    {q.subQuestions.map((subQ, subIndex) => renderQuestionBlock(subQ, subIndex, level + 1))}
                </div>
            )}
        </div>
    );

    const renderQuestionForm = (data, setter, isEdit = false) => {
        const updateField = (field, val) => setter(q => ({ ...q, [field]: val }));
        const updateOption = (idx, field, val) => setter(q => {
            const opts = [...q.options]; opts[idx][field] = val; return { ...q, options: opts };
        });
        const addOption = () => setter(q => ({ ...q, options: [...(q.options || []), { text: '', imageUrl: '' }] }));

        const updatePair = (idx, side, field, val) => setter(q => {
            const pairs = [...q.pairs]; pairs[idx][`${side}${field}`] = val; return { ...q, pairs };
        });
        const addPair = () => setter(q => ({ ...q, pairs: [...(q.pairs || []), { leftText: '', leftImage: '', rightText: '', rightImage: '' }] }));

        const updateSubQuestion = (idx, field, val) => setter(q => {
            const subs = [...q.subQuestions]; subs[idx][field] = val; return { ...q, subQuestions: subs };
        });

        return (
            <div className="qpv2-form-wrapper">
                <div className="qpv2-form-grid">
                    <div className="qpv2-form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="qpv2-form-label">Question Text</label>
                        <div className="qpv2-editor-container">
                            <TextEditor value={data.questionText || ''} onChange={(v) => updateField('questionText', v)} />
                        </div>
                    </div>
                    <div className="qpv2-form-group">
                        <label className="qpv2-form-label">Marks</label>
                        <input type="number" className="qpv2-form-control" value={data.questionMarks || ''} onChange={e => updateField('questionMarks', e.target.value)} />
                    </div>
                    <div className="qpv2-form-group">
                        <label className="qpv2-form-label">Question Type</label>
                        <select className="qpv2-form-control" value={data.questionType || ''} onChange={e => updateField('questionType', e.target.value)}>
                            <option value="">-- Select Type --</option>
                            <option value="MCQ">MCQ</option>
                            <option value="Descriptive">Descriptive</option>
                            <option value="Match">Match the Following</option>
                            <option value="sub-question">Sub-Questions</option>
                        </select>
                    </div>
                    <div className="qpv2-form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="qpv2-form-label">Upload Image</label>
                        <input type="file" accept="image/*" className="qpv2-form-control" onChange={async e => {
                            if (e.target.files[0]) updateField('questionImage', await uploadToImgBB(e.target.files[0]));
                        }} />
                        {data.questionImage && (
                            <div style={{ marginTop: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', background: '#f8fafc' }}>
                                <img src={data.questionImage} alt="Uploaded preview" style={{ maxHeight: '240px', maxWidth: '100%', borderRadius: '4px', objectFit: 'contain' }} />
                                <button type="button" className="qpv2-btn-danger qpv2-btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => updateField('questionImage', '')}>Remove Image</button>
                            </div>
                        )}
                    </div>
                </div>

                {data.questionType === 'MCQ' && (
                    <div style={{ marginTop: '12px', padding: '12px', background: '#f9fbfc', borderRadius: '6px', border: '1px solid #e1e5eb' }}>
                        <div className="qpv2-d-flex qpv2-justify-between qpv2-align-center" style={{ marginBottom: '10px' }}>
                            <h5 style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Options</h5>
                            <button className="qpv2-btn-secondary" onClick={addOption}><i className="fas fa-plus"></i> Add Option</button>
                        </div>
                        <div className="qpv2-form-grid">
                            {(data.options || []).map((opt, i) => (
                                <div key={i} className="qpv2-form-group" style={{ background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #e1e5eb' }}>
                                    <label className="qpv2-form-label">Option {String.fromCharCode(65 + i)}</label>
                                    <input className="qpv2-form-control" style={{ marginBottom: '4px' }} value={opt.text} onChange={e => updateOption(i, 'text', e.target.value)} placeholder="Text" />
                                    <input type="file" className="qpv2-form-control" onChange={async e => {
                                        if (e.target.files[0]) updateOption(i, 'imageUrl', await uploadToImgBB(e.target.files[0]));
                                    }} />
                                    {opt.imageUrl && (
                                        <div style={{ marginTop: '6px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', background: '#f8fafc' }}>
                                            <img src={opt.imageUrl} alt="Option preview" style={{ maxHeight: '150px', maxWidth: '100%', borderRadius: '4px', objectFit: 'contain' }} />
                                            <button type="button" className="qpv2-btn-danger qpv2-btn-sm" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => updateOption(i, 'imageUrl', '')}>Remove</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {data.questionType === 'Match' && (
                    <div style={{ marginTop: '12px', padding: '12px', background: '#f9fbfc', borderRadius: '6px', border: '1px solid #e1e5eb' }}>
                        <div className="qpv2-d-flex qpv2-justify-between qpv2-align-center" style={{ marginBottom: '10px' }}>
                            <h5 style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Match Pairs</h5>
                            <button className="qpv2-btn-secondary" onClick={addPair}><i className="fas fa-plus"></i> Add Pair</button>
                        </div>
                        {(data.pairs || []).map((p, i) => (
                            <div key={i} className="qpv2-form-grid" style={{ background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #e1e5eb', marginBottom: '8px' }}>
                                {['left', 'right'].map(side => (
                                    <div className="qpv2-form-group" key={side}>
                                        <label className="qpv2-form-label">{side === 'left' ? 'Column A' : 'Column B'} Text</label>
                                        <input className="qpv2-form-control" value={p[`${side}Text`]} onChange={e => updatePair(i, side, 'Text', e.target.value)} />
                                        <label className="qpv2-form-label" style={{ marginTop: '4px' }}>Image (Optional)</label>
                                        <input type="file" className="qpv2-form-control" onChange={async e => {
                                            if (e.target.files[0]) updatePair(i, side, 'Image', await uploadToImgBB(e.target.files[0]));
                                        }} />
                                        {p[`${side}Image`] && (
                                            <div style={{ marginTop: '6px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', background: '#f8fafc' }}>
                                                <img src={p[`${side}Image`]} alt="Pair preview" style={{ maxHeight: '150px', maxWidth: '100%', borderRadius: '4px', objectFit: 'contain' }} />
                                                <button type="button" className="qpv2-btn-danger qpv2-btn-sm" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => updatePair(i, side, 'Image', '')}>Remove</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {data.questionType === 'sub-question' && (
                    <div style={{ marginTop: '12px', padding: '12px', background: '#f9fbfc', borderRadius: '6px', border: '1px solid #e1e5eb' }}>
                        <div className="qpv2-d-flex qpv2-justify-between qpv2-align-center" style={{ marginBottom: '10px' }}>
                            <h5 style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Sub-Questions</h5>
                            <button className="qpv2-btn-secondary" onClick={() => setter(q => ({ ...q, subQuestions: [...(q.subQuestions || []), { questionText: '', questionMarks: '', questionType: '', options: [], pairs: [] }] }))}><i className="fas fa-plus"></i> Add Sub-Question</button>
                        </div>
                        {(data.subQuestions || []).map((subQ, index) => (
                            <div key={index} style={{ background: 'white', padding: '10px', borderRadius: '6px', border: '1px solid #e1e5eb', marginBottom: '8px' }}>
                                <div className="qpv2-form-grid">
                                    <div className="qpv2-form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="qpv2-form-label">Sub-question {index + 1} Text</label>
                                        <input className="qpv2-form-control" value={subQ.questionText} onChange={e => updateSubQuestion(index, 'questionText', e.target.value)} />
                                    </div>
                                    <div className="qpv2-form-group">
                                        <label className="qpv2-form-label">Marks</label>
                                        <input className="qpv2-form-control" value={subQ.questionMarks} onChange={e => updateSubQuestion(index, 'questionMarks', e.target.value)} />
                                    </div>
                                    <div className="qpv2-form-group">
                                        <label className="qpv2-form-label">Type</label>
                                        <select className="qpv2-form-control" value={subQ.questionType} onChange={e => updateSubQuestion(index, 'questionType', e.target.value)}>
                                            <option value="">Select Type</option>
                                            <option value="MCQ">MCQ</option>
                                            <option value="Descriptive">Descriptive</option>
                                            <option value="Match">Match</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="QuestionPaperV2">

            {message && (
                <div className="qpv2-toast-container">
                    <div className="qpv2-toast">
                        <i className="fas fa-info-circle text-info"></i> {message}
                    </div>
                </div>
            )}
            {uploading && (
                <div className="qpv2-toast-container" style={{ bottom: '80px' }}>
                    <div className="qpv2-toast">
                        <i className="fas fa-spinner fa-spin text-warning"></i> Uploading Image...
                    </div>
                </div>
            )}
            {questionUploading && (
                <div className="qpv2-toast-container" style={{ bottom: '80px' }}>
                    <div className="qpv2-toast">
                        <i className="fas fa-spinner fa-spin text-primary"></i> Saving Question...
                    </div>
                </div>
            )}

            {viewMode === 'list' && (
                <>
                    <div className="SearchFilter">
                        {/* Class Dropdown */}
                        <div>
                            <select className="form-select shadow-sm" value={selectedClass} onChange={onClassChange}>
                                <option value="">-- Select Class --</option>
                                {classes.map(c => <option key={c._id} value={c._id}>{c.class}</option>)}
                            </select>
                        </div>

                        {/* Subject Dropdown */}
                        <div>
                            <select className="form-select shadow-sm" value={selectedSubject} onChange={onSubjectChange} disabled={!selectedClass}>
                                <option value="">-- Select Subject --</option>
                                {filteredSubjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>

                        {/* Chapter Dropdown */}
                        <div>
                            <select className="form-select shadow-sm" value={selectedChapter} onChange={onChapterChange} disabled={!selectedSubject}>
                                <option value="">-- Select Chapter --</option>
                                {chapterList.map((ch, idx) => <option key={idx} value={ch._id}>{ch.name}</option>)}
                            </select>
                        </div>

                        {/* Action Buttons */}
                        <button className="btn" disabled={!hasWriteAccess} onClick={() => setIsAddModalOpen(true)}>
                            <i className="fas fa-plus me-2"></i>Add Question
                        </button>
                        <button className="btn" disabled={selectedQuestions.length === 0} onClick={() => setIsTransferModalOpen(true)}>
                            ✈️ Transfer ({selectedQuestions.length})
                        </button>
                        <button className="btn" disabled={!hasWriteAccess} onClick={() => setIsTemplateModalOpen(true)}>
                            <i className="fas fa-book me-2"></i>Templates
                        </button>
                        <button className="btn" onClick={() => setViewMode('builder')}>
                            📝 Create Question Paper
                        </button>
                        <button className="btn" disabled={!hasWriteAccess} onClick={() => handleDownloadFiltered()}>
                            <i className="fa-solid fa-download me-2"></i>Download QB
                        </button>
                    </div>

                    <div className="qpv2-content-area qpv2-animate-fade" style={{ animationDelay: '0.1s' }}>
                        {!selectedClass || !selectedSubject || !selectedChapter ? (
                            <div className="qpv2-empty-state">
                                <i className="fas fa-folder-open qpv2-empty-icon"></i>
                                <div className="qpv2-empty-text">Select a Class, Subject, and Chapter to view questions.</div>
                            </div>
                        ) : (
                            <>
                                <div className="qpv2-d-flex qpv2-gap-3 qpv2-align-center" style={{ marginBottom: '14px', flexWrap: 'wrap' }}>
                                    <input type="text" className="qpv2-input" style={{ flex: 1, minWidth: '200px' }} placeholder="Search question text or ID..." value={searchText} onChange={e => setSearchText(e.target.value)} />
                                    <select className="qpv2-select" style={{ width: '130px', minWidth: 'unset' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                                        <option value="">All Types</option>
                                        <option value="MCQ">MCQ</option>
                                        <option value="Descriptive">Descriptive</option>
                                        <option value="Match">Match</option>
                                        <option value="sub-question">Sub-Questions</option>
                                    </select>
                                    <input type="number" className="qpv2-input" style={{ width: '90px', minWidth: 'unset' }} placeholder="Marks" value={filterMarks} onChange={e => setFilterMarks(e.target.value)} />
                                    <select className="qpv2-select" style={{ width: '140px', minWidth: 'unset' }} value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                                        <option value="qId">Sort: ID (Asc)</option>
                                        <option value="desc">Sort: High to Low</option>
                                        <option value="asc">Sort: Low to High</option>
                                    </select>

                                    <label className="qpv2-switch-wrapper" style={{ marginLeft: 'auto' }}>
                                        <div className="qpv2-switch">
                                            <input
                                                type="checkbox"
                                                checked={selectedQuestions.length > 0 && selectedQuestions.length === getAllQuestionIds(questions).length}
                                                onChange={(e) => {
                                                    setSelectedQuestions(e.target.checked ? getAllQuestionIds(questions) : []);
                                                }}
                                            />
                                            <span className="qpv2-slider"></span>
                                        </div>
                                        <span className="qpv2-switch-label" style={{ fontWeight: 600 }}>
                                            Select All ({selectedQuestions.length}/{getAllQuestionIds(questions).length})
                                        </span>
                                    </label>
                                </div>
                                {filteredAndSortedQuestions.length === 0 ? (
                                    <div className="qpv2-empty-state" style={{ padding: '20px' }}>
                                        <i className="fas fa-search qpv2-empty-icon" style={{ fontSize: '1.5rem' }}></i>
                                        <div className="qpv2-empty-text">No questions found matching your criteria.</div>
                                    </div>
                                ) : (
                                    <div className="qpv2-question-list">
                                        {filteredAndSortedQuestions.map((q, i) => renderQuestionBlock(q, i))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}

            {viewMode === 'builder' && (
                <div className="qpv2-builder-page qpv2-animate-fade">
                    <div className="qpv2-page-header">
                        <div className="qpv2-action-group">
                            <button className="qpv2-btn-outline" onClick={() => setViewMode('list')}>
                                <i className="fas fa-arrow-left me-1"></i> Exit Builder
                            </button>
                            <button className="qpv2-btn-secondary" onClick={() => setIsViewSelectedDrawerOpen(true)}>
                                👁️ View Selected ({selectedQuestions.length})
                            </button>
                        </div>
                    </div>

                    <div className="qpv2-builder-filters" style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '10px' }}>
                        <select className="form-select shadow-sm" value={selectedClass} onChange={onClassChange} style={{ flex: 1 }}>
                            <option value="">-- Class --</option>
                            {classes.map(c => <option key={c._id} value={c._id}>{c.class}</option>)}
                        </select>
                        <select className="form-select shadow-sm" value={selectedSubject} onChange={onSubjectChange} disabled={!selectedClass} style={{ flex: 1 }}>
                            <option value="">-- Subject --</option>
                            {filteredSubjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                        <select className="form-select shadow-sm" value={selectedChapter} onChange={onChapterChange} disabled={!selectedSubject} style={{ flex: 1 }}>
                            <option value="">-- Chapter --</option>
                            {chapterList.map((ch, idx) => <option key={idx} value={ch._id}>{ch.name}</option>)}
                        </select>
                    </div>

                    <div className="qpv2-content-area" style={{ flex: 1, minHeight: '60vh' }}>
                        {questions.length > 0 ? (
                            <div className="qpv2-question-list">
                                {filteredAndSortedQuestions.map((q, i) => renderQuestionBlock(q, i))}
                            </div>
                        ) : (
                            <div className="text-center py-5 text-muted">Select a Class, Subject, and Chapter to list questions.</div>
                        )}
                    </div>

                    <div className="qpv2-builder-footer mt-4 d-flex justify-content-end gap-3" style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '16px' }}>
                        <button className="qpv2-btn-outline" onClick={() => setViewMode('list')}>Cancel</button>
                        <button className="qpv2-btn-primary" onClick={() => setViewMode('preview')}>
                            Select Instructions & Live Preview <i className="fas fa-arrow-right ms-1"></i>
                        </button>
                    </div>
                </div>
            )}

            {viewMode === 'preview' && (
                <div className="qpv2-preview-page qpv2-animate-fade">
                    <div className="qpv2-preview-split-container">
                        {/* Left Side: Setup Parameters */}
                        <div className="qpv2-preview-left-controls">
                            {/* Templates Selector Section FIRST */}
                            <div className="qpv2-preview-control-section">
                                <h5>1. Heading Templates</h5>
                                <div className="qpv2-form-group">
                                    <label className="qpv2-form-label">Select a School Template Preset</label>
                                    <div className="qpv2-d-flex" style={{ gap: '8px', flexWrap: 'wrap' }}>
                                        {templates.map(t => {
                                            const isSelected = selectedSchoolName === t.schoolName && selectedAddress === t.address && selectedExamTitle === t.examTitle;
                                            return (
                                                <div key={t._id} onClick={() => {
                                                    setSelectedSchoolName(t.schoolName || '');
                                                    setSelectedAddress(t.address || '');
                                                    setSelectedExamTitle(t.examTitle || '');
                                                    if (t.logo) setSelectedLogo(t.logo);
                                                }} style={{
                                                    flex: '1 1 120px',
                                                    padding: '8px 10px',
                                                    border: `2px solid ${isSelected ? 'var(--button-color)' : 'rgba(0,0,0,0.08)'}`,
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem',
                                                    backgroundColor: isSelected ? 'rgba(254, 79, 45, 0.04)' : '#ffffff'
                                                }}>
                                                    <strong>{t.schoolName}</strong>
                                                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>{t.examTitle}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Heading Input Fields Section SECOND */}
                            <div className="qpv2-preview-control-section">
                                <h5>2. Heading Details & Parameters</h5>
                                <div className="qpv2-form-group">
                                    <label className="qpv2-form-label">School Logo</label>
                                    <input type="file" accept="image/*" className="form-control" onChange={async e => {
                                        if (e.target.files[0]) {
                                            const url = await uploadToImgBB(e.target.files[0]);
                                            setSelectedLogo(url);
                                        }
                                    }} style={{ borderRadius: '8px' }} />
                                    {selectedLogo && (
                                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <img src={selectedLogo} alt="Logo" style={{ height: '40px', objectFit: 'contain' }} />
                                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setSelectedLogo('')}>Remove</button>
                                        </div>
                                    )}
                                </div>
                                <div className="qpv2-form-group">
                                    <label className="qpv2-form-label">School Name</label>
                                    <input className="form-control" value={selectedSchoolName} onChange={e => setSelectedSchoolName(e.target.value)} style={{ borderRadius: '8px' }} />
                                </div>
                                <div className="qpv2-form-group">
                                    <label className="qpv2-form-label">Address</label>
                                    <input className="form-control" value={selectedAddress} onChange={e => setSelectedAddress(e.target.value)} style={{ borderRadius: '8px' }} />
                                </div>
                                <div className="qpv2-form-group">
                                    <label className="qpv2-form-label">Exam Title</label>
                                    <input className="form-control" value={selectedExamTitle} onChange={e => setSelectedExamTitle(e.target.value)} style={{ borderRadius: '8px' }} />
                                </div>
                                <div className="row g-2">
                                    <div className="col-4">
                                        <label className="qpv2-form-label">Date</label>
                                        <input type="date" className="form-control" value={examDate} onChange={e => setExamDate(e.target.value)} style={{ borderRadius: '8px' }} />
                                    </div>
                                    <div className="col-4">
                                        <label className="qpv2-form-label">Duration</label>
                                        <input type="text" className="form-control" placeholder="e.g. 3 Hours" value={examTime} onChange={e => setExamTime(e.target.value)} style={{ borderRadius: '8px' }} />
                                    </div>
                                    <div className="col-4">
                                        <label className="qpv2-form-label">Max Marks</label>
                                        <input type="number" className="form-control" value={maxMarks} onChange={e => setMaxMarks(e.target.value)} style={{ borderRadius: '8px' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Instructions Setup Section THIRD */}
                            <div className="qpv2-preview-control-section">
                                <h5>3. Instructions Checklist</h5>
                                <div className="qpv2-form-group">
                                    <div className="qpv2-instructions-checklist" style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '10px' }}>
                                        {Array.from(new Set(templates.flatMap(t => t.instructions).filter(i => i.trim() !== ''))).map((instruction, i) => {
                                            const checked = selectedInstructions.includes(instruction);
                                            return (
                                                <div key={i} className={`qpv2-instruction-item ${checked ? 'checked' : ''}`} onClick={() => {
                                                    toggleInstruction(instruction);
                                                }}>
                                                    <span style={{ fontSize: '0.85rem', color: '#1e293b' }}>{instruction}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Question Images Scale Section FOURTH */}
                            {selectedQuestions.some(id => globalQuestionMap[id]?.questionImage) && (
                                <div className="qpv2-preview-control-section">
                                    <h5>4. Question Images Scaling</h5>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {selectedQuestions.filter(id => globalQuestionMap[id]?.questionImage).map((id) => {
                                            const currentSize = imageSizesMap[id] || '120px';
                                            const actualQIndex = selectedQuestions.indexOf(id);
                                            return (
                                                <div key={id} style={{ display: 'flex', flexDirection: 'column', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9', gap: '6px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                                            Q{actualQIndex + 1} Image Size
                                                        </span>
                                                        <span className="badge bg-secondary" style={{ fontSize: '0.75rem' }}>
                                                            {currentSize}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>50px</span>
                                                        <input
                                                            type="range"
                                                            min="50"
                                                            max="600"
                                                            step="10"
                                                            value={currentSize.endsWith('%') ? 600 : parseInt(currentSize, 10) || 120}
                                                            onChange={e => {
                                                                const val = e.target.value === '600' ? '100%' : `${e.target.value}px`;
                                                                setImageSizesMap(prev => ({ ...prev, [id]: val }));
                                                            }}
                                                            style={{ flex: 1, accentColor: 'var(--button-color)', cursor: 'pointer' }}
                                                        />
                                                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Full</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Side: Live Document Print Preview */}
                        <div className="qpv2-preview-right-document">
                            <div className="qpv2-live-paper-outer">
                                <div className="qpv2-live-paper-card">
                                    <PrintQuestionPaper
                                        sections={questionPaperSections}
                                        questionMap={globalQuestionMap}
                                        selectedQuestions={selectedQuestions}
                                        imageSizesMap={imageSizesMap}
                                        addAnsLine={addAnsLine}
                                        schoolLogo={selectedLogo}
                                        schoolName={selectedSchoolName}
                                        address={selectedAddress}
                                        examTitle={selectedExamTitle}
                                        examDate={examDate}
                                        examTime={examTime}
                                        maxMarks={maxMarks}
                                        instructions={selectedInstructions}
                                        selectedClass={classes.find(c => c._id === selectedClass)?.class || ''}
                                        selectedSubject={subjects.find(s => s._id === selectedSubject)?.name || ''}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Right Sticky Footer */}
                    <div className="qpv2-builder-footer mt-4 d-flex justify-content-end gap-3" style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '16px' }}>
                        <button className="qpv2-btn-outline" onClick={() => setViewMode('builder')}>
                            <i className="fas fa-arrow-left me-1"></i> Back to Builder
                        </button>
                        <button className="qpv2-btn-primary" onClick={handlePrint} disabled={!canDownload}>
                            <i className="fas fa-download me-1"></i> Download PDF
                        </button>
                    </div>
                </div>
            )}

            {/* Slide-over Drawers Backdrop Overlay */}
            <div className={`qpv2-drawer-overlay ${(isTransferModalOpen || isAddModalOpen || isEditModalOpen || isViewSelectedDrawerOpen) ? 'show' : ''}`} onClick={() => {
                setIsTransferModalOpen(false);
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                setIsViewSelectedDrawerOpen(false);
            }}></div>

            {/* View Selected Questions Drawer */}
            <div className={`qpv2-drawer ${isViewSelectedDrawerOpen ? 'open' : ''}`} style={{ width: '650px' }}>
                <div className="qpv2-drawer-header">
                    <h4>👁️ Selected Questions ({selectedQuestions.length})</h4>
                    <button className="qpv2-drawer-close" onClick={() => setIsViewSelectedDrawerOpen(false)}>&times;</button>
                </div>
                <div className="qpv2-drawer-body">
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                        Questions listed below are ordered exactly in the chronological sequence you selected them.
                    </p>
                    <div className="qpv2-question-list">
                        {selectedQuestions.map((qId, idx) => {
                            const questionObj = globalQuestionMap[qId];
                            if (!questionObj) return null;
                            return (
                                <div key={qId} className="qpv2-question-card" style={{ marginBottom: '12px', padding: '14px', backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.08)' }}>
                                    <div className="qpv2-question-header" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
                                        <div className="qpv2-question-meta">
                                            <span className="qpv2-badge qpv2-badge-marks">{questionObj.questionMarks}M</span>
                                            <span className="qpv2-badge qpv2-badge-type">{questionObj.questionType}</span>
                                            <span className="qpv2-badge qpv2-badge-id">ID: {questionObj.questionId}</span>
                                        </div>
                                        <button className="btn-close" style={{ fontSize: '10px' }} onClick={() => {
                                            setSelectedQuestions(prev => prev.filter(id => id !== qId));
                                        }}></button>
                                    </div>
                                    <div className="qpv2-question-title">
                                        <strong style={{ marginRight: '6px' }}>Q{idx + 1}.</strong>
                                        <div style={{ flex: 1 }} dangerouslySetInnerHTML={{ __html: questionObj.questionText }} />
                                    </div>
                                    {questionObj.questionImage && (
                                        <div style={{ marginTop: '8px', paddingLeft: '28px' }}>
                                            <img src={questionObj.questionImage} alt="Question" style={{ maxHeight: '100px', objectFit: 'contain', borderRadius: '4px' }} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {selectedQuestions.length === 0 && (
                            <div className="text-center py-5 text-muted">No questions selected yet. Check questions from the list!</div>
                        )}
                    </div>
                </div>
                <div className="qpv2-drawer-footer">
                    <button className="qpv2-btn-primary" onClick={() => setIsViewSelectedDrawerOpen(false)}>Close View</button>
                </div>
            </div>

            {/* Transfer Questions Drawer */}
            <div className={`qpv2-drawer ${isTransferModalOpen ? 'open' : ''}`} style={{ width: '480px' }}>
                <div className="qpv2-drawer-header">
                    <h4>✈️ Transfer Selected Questions</h4>
                    <button className="qpv2-drawer-close" onClick={() => setIsTransferModalOpen(false)}>&times;</button>
                </div>
                <div className="qpv2-drawer-body">
                    <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '16px' }}>
                        Moving <strong>{selectedQuestions.length}</strong> selected questions to a new location.
                    </p>
                    <div className="qpv2-form-wrapper">
                        <div className="qpv2-form-group">
                            <label className="qpv2-form-label">Destination Class</label>
                            <select className="qpv2-form-control" value={transferDestClass} onChange={onTransferClassChange}>
                                <option value="">-- Select Class --</option>
                                {classes.map(c => <option key={c._id} value={c._id}>{c.class}</option>)}
                            </select>
                        </div>
                        <div className="qpv2-form-group">
                            <label className="qpv2-form-label">Destination Subject</label>
                            <select className="qpv2-form-control" value={transferDestSubject} onChange={onTransferSubjectChange} disabled={!transferDestClass}>
                                <option value="">-- Select Subject --</option>
                                {transferFilteredSubjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="qpv2-form-group">
                            <label className="qpv2-form-label">Destination Chapter</label>
                            <select className="qpv2-form-control" value={transferDestChapter} onChange={e => setTransferDestChapter(e.target.value)} disabled={!transferDestSubject}>
                                <option value="">-- Select Chapter --</option>
                                {transferChapterList.map((ch, idx) => <option key={idx} value={ch._id}>{ch.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="qpv2-drawer-footer">
                    <button className="qpv2-btn-outline" onClick={() => setIsTransferModalOpen(false)}>Cancel</button>
                    <button className="qpv2-btn-primary" onClick={handleTransferQuestions} disabled={questionUploading}>
                        Confirm Transfer
                    </button>
                </div>
            </div>

            {/* Add New Question Drawer */}
            <div className={`qpv2-drawer ${isAddModalOpen ? 'open' : ''}`}>
                <div className="qpv2-drawer-header">
                    <h4><i className="fas fa-plus-circle text-primary"></i> Add New Question</h4>
                    <button className="qpv2-drawer-close" onClick={() => setIsAddModalOpen(false)}>&times;</button>
                </div>
                <div className="qpv2-drawer-body">
                    {renderQuestionForm(newQuestion, setNewQuestion, false)}
                </div>
                <div className="qpv2-drawer-footer">
                    <button className="qpv2-btn-outline" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                    <button className="qpv2-btn-primary" onClick={handleAddQuestion} disabled={questionUploading}>Save Question</button>
                </div>
            </div>

            {/* Edit Question Drawer */}
            <div className={`qpv2-drawer ${(isEditModalOpen && editQuestionData) ? 'open' : ''}`}>
                <div className="qpv2-drawer-header">
                    <h4><i className="fas fa-edit text-primary"></i> Edit Question</h4>
                    <button className="qpv2-drawer-close" onClick={() => setIsEditModalOpen(false)}>&times;</button>
                </div>
                <div className="qpv2-drawer-body">
                    {editQuestionData && renderQuestionForm(editQuestionData, setEditQuestionData, true)}
                </div>
                <div className="qpv2-drawer-footer">
                    <button className="qpv2-btn-outline" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                    <button className="qpv2-btn-primary" onClick={handleEditSubmit} disabled={questionUploading}>Update Question</button>
                </div>
            </div>

            {isTemplateModalOpen && (
                <div className="qpv2-modal-overlay" onClick={() => setIsTemplateModalOpen(false)}>
                    <div className="qpv2-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px' }}>
                        <div className="qpv2-modal-header">
                            <h4>Instruction Templates Editor</h4>
                            <button className="qpv2-modal-close" onClick={() => setIsTemplateModalOpen(false)}>&times;</button>
                        </div>
                        <div className="qpv2-modal-body">
                            <div className="qpv2-form-grid" style={{ marginBottom: '16px' }}>
                                <div className="qpv2-form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="qpv2-form-label">School Logo</label>
                                    <input type="file" accept="image/*" className="form-control" onChange={async e => {
                                        if (e.target.files[0]) {
                                            const url = await uploadToImgBB(e.target.files[0]);
                                            setNewTemplate(t => ({ ...t, logo: url }));
                                        }
                                    }} style={{ borderRadius: '8px' }} />
                                    {newTemplate.logo && (
                                        <div style={{ marginTop: '6px' }}>
                                            <img src={newTemplate.logo} alt="Logo" style={{ height: '40px', objectFit: 'contain' }} />
                                            <button className="qpv2-btn-danger qpv2-btn-sm" style={{ marginLeft: '10px' }} onClick={() => setNewTemplate(t => ({ ...t, logo: '' }))}>Remove</button>
                                        </div>
                                    )}
                                </div>
                                <div className="qpv2-form-group">
                                    <label className="qpv2-form-label">School Name</label>
                                    <input className="form-control" value={newTemplate.schoolName} onChange={e => setNewTemplate({ ...newTemplate, schoolName: e.target.value })} style={{ borderRadius: '8px' }} />
                                </div>
                                <div className="qpv2-form-group">
                                    <label className="qpv2-form-label">Address</label>
                                    <input className="form-control" value={newTemplate.address || ''} onChange={e => setNewTemplate({ ...newTemplate, address: e.target.value })} style={{ borderRadius: '8px' }} />
                                </div>
                                <div className="qpv2-form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="qpv2-form-label">Exam Title</label>
                                    <input className="form-control" value={newTemplate.examTitle} onChange={e => setNewTemplate({ ...newTemplate, examTitle: e.target.value })} style={{ borderRadius: '8px' }} />
                                </div>
                            </div>
                            <div className="qpv2-d-flex qpv2-justify-between" style={{ marginBottom: '10px' }}>
                                <h5 style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Instructions</h5>
                                <button className="qpv2-btn-secondary" onClick={() => setNewTemplate({ ...newTemplate, instructions: [...newTemplate.instructions, ''] })}>Add Instruction</button>
                            </div>
                            {newTemplate.instructions.map((inst, idx) => (
                                <div key={idx} className="qpv2-d-flex qpv2-gap-2" style={{ marginBottom: '6px' }}>
                                    <input className="form-control" style={{ flex: 1, borderRadius: '8px' }} value={inst} onChange={e => {
                                        const insts = [...newTemplate.instructions]; insts[idx] = e.target.value; setNewTemplate({ ...newTemplate, instructions: insts });
                                    }} placeholder={`Instruction ${idx + 1}`} />
                                    <button className="qpv2-btn-danger" onClick={() => {
                                        setNewTemplate(t => ({ ...t, instructions: t.instructions.filter((_, i) => i !== idx) }));
                                    }}>&times;</button>
                                </div>
                            ))}
                            <button className="qpv2-btn-primary mt-2" onClick={saveTemplate}>Save Template</button>

                            <hr style={{ margin: '20px 0', borderColor: '#e1e5eb' }} />
                            <h5 style={{ fontWeight: 600, marginBottom: '10px', fontSize: '0.9rem' }}>Existing Templates</h5>
                            <div className="qpv2-d-flex" style={{ flexWrap: 'wrap', gap: '10px' }}>
                                {templates.map(t => (
                                    <div key={t._id} style={{ border: '1px solid #e1e5eb', borderRadius: '6px', padding: '10px', background: '#f9fbfc', flex: '1 1 220px' }}>
                                        <div className="qpv2-d-flex qpv2-justify-between qpv2-align-center">
                                            <div>
                                                <strong>{t.schoolName}</strong>
                                                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{t.examTitle}</div>
                                            </div>
                                            <div className="qpv2-d-flex qpv2-gap-2">
                                                <button className="qpv2-icon-btn edit" disabled={!hasWriteAccess} onClick={() => setNewTemplate(t)}><i className="fas fa-edit"></i></button>
                                                <button className="qpv2-icon-btn delete" disabled={!canDelete} onClick={() => handleDeleteTemplate(t._id)}><i className="fas fa-trash"></i></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Questions Drawer */}
            <div className={`qpv2-drawer ${isTransferModalOpen ? 'open' : ''}`} style={{ width: '480px' }}>
                <div className="qpv2-drawer-header">
                    <h4>✈️ Transfer Selected Questions</h4>
                    <button className="qpv2-drawer-close" onClick={() => setIsTransferModalOpen(false)}>&times;</button>
                </div>
                <div className="qpv2-drawer-body">
                    <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '16px' }}>
                        Moving <strong>{selectedQuestions.length}</strong> selected questions to a new location.
                    </p>
                    <div className="qpv2-form-wrapper">
                        <div className="qpv2-form-group">
                            <label className="qpv2-form-label">Destination Class</label>
                            <select className="qpv2-form-control" value={transferDestClass} onChange={onTransferClassChange}>
                                <option value="">-- Select Class --</option>
                                {classes.map(c => <option key={c._id} value={c._id}>{c.class}</option>)}
                            </select>
                        </div>
                        <div className="qpv2-form-group">
                            <label className="qpv2-form-label">Destination Subject</label>
                            <select className="qpv2-form-control" value={transferDestSubject} onChange={onTransferSubjectChange} disabled={!transferDestClass}>
                                <option value="">-- Select Subject --</option>
                                {transferFilteredSubjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="qpv2-form-group">
                            <label className="qpv2-form-label">Destination Chapter</label>
                            <select className="qpv2-form-control" value={transferDestChapter} onChange={e => setTransferDestChapter(e.target.value)} disabled={!transferDestSubject}>
                                <option value="">-- Select Chapter --</option>
                                {transferChapterList.map((ch, idx) => <option key={idx} value={ch._id}>{ch.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="qpv2-drawer-footer">
                    <button className="qpv2-btn-outline" onClick={() => setIsTransferModalOpen(false)}>Cancel</button>
                    <button className="qpv2-btn-primary" onClick={handleTransferQuestions} disabled={questionUploading}>
                        Confirm Transfer
                    </button>
                </div>
            </div>

            {/* Add New Question Drawer */}
            <div className={`qpv2-drawer ${isAddModalOpen ? 'open' : ''}`}>
                <div className="qpv2-drawer-header">
                    <h4><i className="fas fa-plus-circle text-primary"></i> Add New Question</h4>
                    <button className="qpv2-drawer-close" onClick={() => setIsAddModalOpen(false)}>&times;</button>
                </div>
                <div className="qpv2-drawer-body">
                    {renderQuestionForm(newQuestion, setNewQuestion, false)}
                </div>
                <div className="qpv2-drawer-footer">
                    <button className="qpv2-btn-outline" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                    <button className="qpv2-btn-primary" onClick={handleAddQuestion} disabled={questionUploading}>Save Question</button>
                </div>
            </div>

            {/* Edit Question Drawer */}
            <div className={`qpv2-drawer ${(isEditModalOpen && editQuestionData) ? 'open' : ''}`}>
                <div className="qpv2-drawer-header">
                    <h4><i className="fas fa-edit text-primary"></i> Edit Question</h4>
                    <button className="qpv2-drawer-close" onClick={() => setIsEditModalOpen(false)}>&times;</button>
                </div>
                <div className="qpv2-drawer-body">
                    {editQuestionData && renderQuestionForm(editQuestionData, setEditQuestionData, true)}
                </div>
                <div className="qpv2-drawer-footer">
                    <button className="qpv2-btn-outline" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                    <button className="qpv2-btn-primary" onClick={handleEditSubmit} disabled={questionUploading}>Update Question</button>
                </div>
            </div>

            {isTemplateModalOpen && (
                <div className="qpv2-modal-overlay" onClick={() => setIsTemplateModalOpen(false)}>
                    <div className="qpv2-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px' }}>
                        <div className="qpv2-modal-header">
                            <h4>Instruction Templates Editor</h4>
                            <button className="qpv2-modal-close" onClick={() => setIsTemplateModalOpen(false)}>&times;</button>
                        </div>
                        <div className="qpv2-modal-body">
                            <div className="qpv2-form-grid" style={{ marginBottom: '16px' }}>
                                <div className="qpv2-form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="qpv2-form-label">School Logo</label>
                                    <input type="file" accept="image/*" className="qpv2-form-control" onChange={async e => {
                                        if (e.target.files[0]) {
                                            const url = await uploadToImgBB(e.target.files[0]);
                                            setNewTemplate(t => ({ ...t, logo: url }));
                                        }
                                    }} />
                                    {newTemplate.logo && (
                                        <div style={{ marginTop: '6px' }}>
                                            <img src={newTemplate.logo} alt="Logo" style={{ height: '40px', objectFit: 'contain' }} />
                                            <button className="qpv2-btn-danger qpv2-btn-sm" style={{ marginLeft: '10px' }} onClick={() => setNewTemplate(t => ({ ...t, logo: '' }))}>Remove</button>
                                        </div>
                                    )}
                                </div>
                                <div className="qpv2-form-group">
                                    <label className="qpv2-form-label">School Name</label>
                                    <input className="qpv2-form-control" value={newTemplate.schoolName} onChange={e => setNewTemplate({ ...newTemplate, schoolName: e.target.value })} />
                                </div>
                                <div className="qpv2-form-group">
                                    <label className="qpv2-form-label">Address</label>
                                    <input className="qpv2-form-control" value={newTemplate.address || ''} onChange={e => setNewTemplate({ ...newTemplate, address: e.target.value })} />
                                </div>
                                <div className="qpv2-form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="qpv2-form-label">Exam Title</label>
                                    <input className="qpv2-form-control" value={newTemplate.examTitle} onChange={e => setNewTemplate({ ...newTemplate, examTitle: e.target.value })} />
                                </div>
                            </div>
                            <div className="qpv2-d-flex qpv2-justify-between" style={{ marginBottom: '10px' }}>
                                <h5 style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Instructions</h5>
                                <button className="qpv2-btn-secondary" onClick={() => setNewTemplate({ ...newTemplate, instructions: [...newTemplate.instructions, ''] })}>Add Instruction</button>
                            </div>
                            {newTemplate.instructions.map((inst, idx) => (
                                <div key={idx} className="qpv2-d-flex qpv2-gap-2" style={{ marginBottom: '6px' }}>
                                    <input className="qpv2-form-control" style={{ flex: 1 }} value={inst} onChange={e => {
                                        const insts = [...newTemplate.instructions]; insts[idx] = e.target.value; setNewTemplate({ ...newTemplate, instructions: insts });
                                    }} placeholder={`Instruction ${idx + 1}`} />
                                    <button className="qpv2-btn-danger" onClick={() => {
                                        setNewTemplate(t => ({ ...t, instructions: t.instructions.filter((_, i) => i !== idx) }));
                                    }}>&times;</button>
                                </div>
                            ))}
                            <button className="qpv2-btn-primary mt-2" onClick={saveTemplate}>Save Template</button>

                            <hr style={{ margin: '20px 0', borderColor: '#e1e5eb' }} />
                            <h5 style={{ fontWeight: 600, marginBottom: '10px', fontSize: '0.9rem' }}>Existing Templates</h5>
                            <div className="qpv2-d-flex" style={{ flexWrap: 'wrap', gap: '10px' }}>
                                {templates.map(t => (
                                    <div key={t._id} style={{ border: '1px solid #e1e5eb', borderRadius: '6px', padding: '10px', background: '#f9fbfc', flex: '1 1 220px' }}>
                                        <div className="qpv2-d-flex qpv2-justify-between qpv2-align-center">
                                            <div>
                                                <strong>{t.schoolName}</strong>
                                                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{t.examTitle}</div>
                                            </div>
                                            <div className="qpv2-d-flex qpv2-gap-2">
                                                <button className="qpv2-icon-btn edit" disabled={!hasWriteAccess} onClick={() => setNewTemplate(t)}><i className="fas fa-edit"></i></button>
                                                <button className="qpv2-icon-btn delete" disabled={!canDelete} onClick={() => handleDeleteTemplate(t._id)}><i className="fas fa-trash"></i></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {previewImageUrl && (
                <div className="qpv2-modal-overlay" style={{ zIndex: 3000, background: 'rgba(0,0,0,0.8)' }} onClick={() => setPreviewImageUrl("")}>
                    <div style={{ position: 'relative' }}>
                        <button className="qpv2-modal-close" style={{ position: 'absolute', top: '-40px', right: 0, color: 'white', fontSize: '2rem' }} onClick={() => setPreviewImageUrl("")}>&times;</button>
                        <img src={previewImageUrl} alt="Preview" style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: '8px', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
                    </div>
                </div>
            )}

            <div style={{ display: 'none' }}>
                <PrintQuestionPaper
                    ref={printRef}
                    sections={questionPaperSections}
                    questionMap={globalQuestionMap}
                    selectedQuestions={selectedQuestions}
                    imageSizesMap={imageSizesMap}
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
                    addAnsLine={addAnsLine}
                />
            </div>

            <div style={{ display: 'none' }}>
                <div ref={printRefFiltered}>
                    <DownloadQuestionBank
                        questions={questions}
                        selectedClass={classes.find(c => c._id === selectedClass)?.class}
                        selectedSubject={subjects.find(s => s._id === selectedSubject)?.name}
                    />
                </div>
            </div>

        </div>
    );
}
