import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import api from '../../API';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import PrintQuestionPaper from '../PrintQuestionPaper/PrintQuestionPaper';
import DownloadQuestionBank from '../DownloadQuestionBank/DownloadQuestionBank';
import TextEditor from '../TextEditor/TextEditor';

import './QuestionPaperV2.css';
import Notification from '../Shared/Notification';
import LoadingIndicator from '../Shared/LoadingIndicator';
import ConfirmModal from '../Shared/ConfirmModal';

const normalizeMarks = (value) => {
    if (value === null || value === undefined) return null;

    const num = Number(String(value).replace(/[^\d.]/g, "").trim());

    return Number.isNaN(num) ? null : num;
};

const buildQuestionMap = (questionsList) => {
    const newMap = {};
    const addToMap = (item) => {
        if (item.questionId) {
            newMap[item.questionId] = item;
        }
        if (item.subQuestions && item.subQuestions.length > 0) {
            item.subQuestions.forEach(addToMap);
        }
    };
    (questionsList || []).forEach(addToMap);
    return newMap;
};

const getQuestionDisplayLabel = (targetQ, questionsList) => {
    for (let i = 0; i < questionsList.length; i++) {
        const parent = questionsList[i];
        if (parent.questionId === targetQ.questionId) {
            return `Q${i + 1}`;
        }
        if (parent.subQuestions && parent.subQuestions.length > 0) {
            const subIdx = parent.subQuestions.findIndex(sub => sub.questionId === targetQ.questionId);
            if (subIdx !== -1) {
                const roman = ['(i)', '(ii)', '(iii)', '(iv)', '(v)', '(vi)', '(vii)', '(viii)', '(ix)', '(x)'];
                const subLabel = roman[subIdx] || `(${subIdx + 1})`;
                return `Q${i + 1} ${subLabel}`;
            }
        }
    }
    return targetQ.questionId || 'Question';
};

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



    const qbPrintRef = useRef(null);
    const triggerQBPrint = useReactToPrint({
        contentRef: qbPrintRef,
        documentTitle: "Question_Bank",
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
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'primary' });
    const [uploading, setUploading] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isViewSelectedDrawerOpen, setIsViewSelectedDrawerOpen] = useState(false);

    // Download QB Modal States
    const [isDownloadQBModalOpen, setIsDownloadQBModalOpen] = useState(false);
    const [qbSelectedClass, setQbSelectedClass] = useState('');
    const [qbSelectedSubject, setQbSelectedSubject] = useState('');
    const [qbFilteredSubjects, setQbFilteredSubjects] = useState([]);
    const [qbChapterList, setQbChapterList] = useState([]);
    const [qbSelectedChapters, setQbSelectedChapters] = useState([]);
    const [qbQuestions, setQbQuestions] = useState([]);
    const [qbSortOrder, setQbSortOrder] = useState('none'); // 'none', 'chapter', 'type'
    const [qbTypeOrder, setQbTypeOrder] = useState(['MCQ', 'Match', 'Descriptive', 'sub-question']);
    const [qbDownloading, setQbDownloading] = useState(false);
    const [questionsLoading, setQuestionsLoading] = useState(false);

    // Random QP Creator States
    const [isQPChoiceModalOpen, setIsQPChoiceModalOpen] = useState(false);
    const [isRandomQPModalOpen, setIsRandomQPModalOpen] = useState(false);
    const [randomClass, setRandomClass] = useState('');
    const [randomSubject, setRandomSubject] = useState('');
    const [randomFilteredSubjects, setRandomFilteredSubjects] = useState([]);
    const [randomChapterList, setRandomChapterList] = useState([]);
    const [randomSelectedChapters, setRandomSelectedChapters] = useState([]);
    const [randomCriteria, setRandomCriteria] = useState([{ id: 1, type: '', marks: '', count: 1 }]);

    const handleRandomClassChange = (cls) => {
        setRandomClass(cls);
        setRandomSubject('');
        setRandomChapterList([]);
        setRandomSelectedChapters([]);

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
            setRandomFilteredSubjects(linkedSubs);
        } else {
            setRandomFilteredSubjects(subjects);
        }
    };

    const handleRandomSubjectChange = (subj) => {
        setRandomSubject(subj);
        setRandomSelectedChapters([]);

        if (randomClass && subj && allChapters.length > 0) {
            const match = allChapters.find((item) => {
                const isClassMatch = item.classId === randomClass || item.classId?._id === randomClass;
                const isSubjectMatch = item.subjectId === subj || item.subjectId?._id === subj;
                return isClassMatch && isSubjectMatch;
            });
            setRandomChapterList(match?.chapters || []);
        } else {
            setRandomChapterList([]);
        }
    };

    const handleRandomChapterToggle = (chapId) => {
        setRandomSelectedChapters(prev => {
            if (prev.includes(chapId)) {
                return prev.filter(id => id !== chapId);
            } else {
                return [...prev, chapId];
            }
        });
    };

    const handleToggleAllRandomChapters = () => {
        if (randomSelectedChapters.length === randomChapterList.length) {
            setRandomSelectedChapters([]);
        } else {
            setRandomSelectedChapters(randomChapterList.map(ch => ch._id));
        }
    };

    const handleAddCriteriaRow = () => {
        setRandomCriteria(prev => [
            ...prev,
            { id: Date.now(), type: '', marks: '', count: 1 }
        ]);
    };

    const handleRemoveCriteriaRow = (id) => {
        if (randomCriteria.length === 1) return;
        setRandomCriteria(prev => prev.filter(row => row.id !== id));
    };

    const handleCriteriaChange = (id, field, value) => {
        setRandomCriteria(prev => prev.map(row => {
            if (row.id === id) {
                return { ...row, [field]: value };
            }
            return row;
        }));
    };

    const calculateTotalRandomMarks = () => {
        return randomCriteria.reduce((sum, row) => {
            const marksVal = parseFloat(row.marks || 0);
            const countVal = parseInt(row.count || 0, 10);
            return sum + (marksVal * countVal);
        }, 0);
    };

    const handleGenerateRandomQP = async () => {
        if (!randomClass || !randomSubject || randomSelectedChapters.length === 0) {
            showMessage("Please fill all required selections.");
            return;
        }

        try {
            const res = await api.get(`/questions?class=${randomClass}&subject=${randomSubject}`);
            const allQuestions = res.data.questions || [];

            const chapterQuestions = allQuestions.filter(q => randomSelectedChapters.includes(q.chapter));
            const selectedIds = [];
            const statusMessages = [];
            let totalRequested = 0;

            for (const row of randomCriteria) {
                if (!row.type || !row.marks || !row.count) continue;
                totalRequested += row.count;

                const eligible = [];
                for (const q of chapterQuestions) {
                    const selfMatch = q.questionType === row.type &&
                        normalizeMarks(q.questionMarks) === normalizeMarks(row.marks);
                    if (selfMatch && !selectedIds.includes(q.questionId)) {
                        eligible.push({ parentId: q.questionId, targetId: q.questionId });
                    }
                    if (q.subQuestions && q.subQuestions.length > 0) {
                        for (const sub of q.subQuestions) {
                            const subMatch = sub.questionType === row.type &&
                                normalizeMarks(sub.questionMarks) === normalizeMarks(row.marks);
                            if (subMatch && !selectedIds.includes(sub.questionId)) {
                                eligible.push({ parentId: q.questionId, targetId: sub.questionId });
                            }
                        }
                    }
                }

                const countToTake = Math.min(row.count, eligible.length);
                const shuffled = [...eligible].sort(() => 0.5 - Math.random());
                for (let i = 0; i < countToTake; i++) {
                    selectedIds.push(shuffled[i].parentId);
                    selectedIds.push(shuffled[i].targetId);
                }

                if (countToTake < row.count) {
                    statusMessages.push(
                        `⚠️ For ${row.type} (${row.marks} Marks): Requested ${row.count}, but only found/selected ${eligible.length} questions.`
                    );
                }
            }

            if (selectedIds.length === 0) {
                showMessage("No matching questions found for any of the criteria.");
                return;
            }

            setSelectedQuestions([...new Set(selectedIds)]);
            setSelectedClass(randomClass);

            const link = classSubjects.find((x) => {
                const linkClassId = (x.classId?._id || x.classId || '').toString();
                return linkClassId === randomClass.toString();
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
                setFilteredSubjects(subjects);
            }

            setSelectedSubject(randomSubject);

            if (allChapters.length > 0) {
                const match = allChapters.find((item) => {
                    const isClassMatch = item.classId === randomClass || item.classId?._id === randomClass;
                    const isSubjectMatch = item.subjectId === randomSubject || item.subjectId?._id === randomSubject;
                    return isClassMatch && isSubjectMatch;
                });
                setChapterList(match?.chapters || []);
            }

            setQuestions(allQuestions);
            setGlobalQuestionMap(buildQuestionMap(allQuestions));

            setIsRandomQPModalOpen(false);

            if (statusMessages.length > 0) {
                setConfirmDialog({
                    isOpen: true,
                    title: "Criteria Mismatch Warnings",
                    message: (
                        <div>
                            <p className="fw-semibold text-danger mb-3">Some criteria could not be fully satisfied:</p>
                            <ul className="text-start mb-0" style={{ paddingLeft: '20px', listStyleType: 'disc' }}>
                                {statusMessages.map((msg, i) => (
                                    <li key={i} className="mb-2 text-slate-700 fw-semibold small">{msg}</li>
                                ))}
                            </ul>
                            <p className="mt-3 mb-0 text-muted small">Generated {selectedIds.length} out of {totalRequested} requested questions.</p>
                        </div>
                    ),
                    type: "warning",
                    onConfirm: () => {
                        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                        setViewMode('builder');
                    }
                });
            } else {
                setViewMode('builder');
                showMessage(`Generated random paper with ${selectedIds.length} pre-selected questions.`);
            }
        } catch (err) {
            console.error("Failed to generate random question paper:", err);
            showMessage("Failed to generate random question paper.");
        }
    };

    const handleQBClassChange = (cls) => {
        setQbSelectedClass(cls);
        setQbSelectedSubject('');
        setQbChapterList([]);
        setQbSelectedChapters([]);

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
            setQbFilteredSubjects(linkedSubs);
        } else {
            setQbFilteredSubjects(subjects);
        }
    };

    const handleQBSubjectChange = (subj) => {
        setQbSelectedSubject(subj);
        setQbSelectedChapters([]);

        if (qbSelectedClass && subj && allChapters.length > 0) {
            const match = allChapters.find((item) => {
                const isClassMatch = item.classId === qbSelectedClass || item.classId?._id === qbSelectedClass;
                const isSubjectMatch = item.subjectId === subj || item.subjectId?._id === subj;
                return isClassMatch && isSubjectMatch;
            });
            setQbChapterList(match?.chapters || []);
        } else {
            setQbChapterList([]);
        }
    };

    const handleQBChapterToggle = (chapId) => {
        setQbSelectedChapters(prev => {
            if (prev.includes(chapId)) {
                return prev.filter(id => id !== chapId);
            } else {
                return [...prev, chapId];
            }
        });
    };

    const handleToggleAllChapters = () => {
        if (qbSelectedChapters.length === qbChapterList.length) {
            setQbSelectedChapters([]);
        } else {
            setQbSelectedChapters(qbChapterList.map(ch => ch._id));
        }
    };

    const handleQBDownloadSubmit = async () => {
        if (!qbSelectedClass || !qbSelectedSubject || qbSelectedChapters.length === 0) return;
        setQbDownloading(true);
        try {
            const res = await api.get(`/questions?class=${qbSelectedClass}&subject=${qbSelectedSubject}`);
            const fetchedQuestions = res.data.questions || [];

            // Filter questions locally by chosen chapters
            const filtered = fetchedQuestions.filter(q => qbSelectedChapters.includes(q.chapter));

            // Apply chosen sorting order
            if (qbSortOrder === 'chapter') {
                filtered.sort((a, b) => {
                    const idxA = qbSelectedChapters.indexOf(a.chapter);
                    const idxB = qbSelectedChapters.indexOf(b.chapter);
                    return idxA - idxB;
                });
            } else if (qbSortOrder === 'type') {
                // Group by custom type order priority
                filtered.sort((a, b) => {
                    const idxA = qbTypeOrder.indexOf(a.questionType || '');
                    const idxB = qbTypeOrder.indexOf(b.questionType || '');
                    const valA = idxA === -1 ? 99 : idxA;
                    const valB = idxB === -1 ? 99 : idxB;
                    return valA - valB;
                });
            }

            setQbQuestions(filtered);

            setTimeout(() => {
                triggerQBPrint();
                setQbDownloading(false);
                setIsDownloadQBModalOpen(false);
            }, 300);
        } catch (err) {
            console.error("Failed to download question bank:", err);
            showMessage("Failed to download question bank");
            setQbDownloading(false);
        }
    };

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
        if (selectedClass && subj) {
            fetchQuestions(selectedClass, subj);
        } else {
            setQuestions([]);
        }
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

    const fetchQuestions = useCallback(async (cls = selectedClass, subj = selectedSubject) => {
        if (cls && subj) {
            setQuestionsLoading(true);
            try {
                const res = await api.get(`/questions?class=${cls}&subject=${subj}`);
                setQuestions(res.data.questions || []);
                setGlobalQuestionMap(buildQuestionMap(res.data.questions));
            } catch (err) {
                console.error("Failed to fetch questions:", err);
                showMessage("Failed to fetch questions");
            } finally {
                setQuestionsLoading(false);
            }
        } else {
            setQuestions([]);
            setGlobalQuestionMap({});
        }
    }, [selectedClass, selectedSubject, showMessage]);

    const onChapterChange = (e) => {
        const chap = e.target.value;
        setSelectedChapter(chap);
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
                const chapterMatch = !selectedChapter || q.chapter === selectedChapter;
                const textMatch = q.questionText?.toLowerCase().includes(searchText.toLowerCase()) ||
                    (q.questionId && q.questionId.toString().includes(searchText));
                const marksMatch = filterMarks === '' || parseFloat(q.questionMarks || 0) === parseFloat(filterMarks || 0);
                const typeMatch = filterType === '' || q.questionType === filterType ||
                    (q.subQuestions && q.subQuestions.some(sub => sub.questionType === filterType));
                return chapterMatch && textMatch && marksMatch && typeMatch;
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
    }, [questions, searchText, filterType, filterMarks, sortOrder, selectedQuestions, selectedChapter]);

    const [imageSizesMap, setImageSizesMap] = useState({});
    const [addAnsLine, setAddAnsLine] = useState([]);

    // ==========================================
    // ADD QUESTION LOGIC
    // ==========================================
    const [questionUploading, setQuestionUploading] = useState(false);
    const initialQuestionState = {
        questionText: '', questionImage: '', questionMarks: '', questionType: '',
        hasSubQuestions: false, options: [], pairs: [], subQuestions: [],
        targetChapter: ''
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
        setNewQuestion({
            ...clone,
            targetChapter: q.chapter || selectedChapter || ''
        });
        setIsAddModalOpen(true);
    };

    const handleAddQuestion = async () => {
        if (!selectedClass || !selectedSubject) {
            showMessage("Please select class and subject first.");
            return;
        }
        const cleanSubQuestions = (subQs) =>
            subQs.filter(sq => sq.questionText?.trim() && sq.questionType?.trim() && sq.questionMarks?.toString().trim())
                .map(sq => ({ ...sq, subQuestions: cleanSubQuestions(sq.subQuestions || []) }));
        
        const targetChapter = newQuestion.targetChapter || selectedChapter;
        const cleanedQuestion = {
            ...newQuestion,
            questionMarks: newQuestion.questionMarks?.toString().trim() ? newQuestion.questionMarks : undefined,
            questionType: newQuestion.questionType?.trim() ? newQuestion.questionType : undefined,
            subQuestions: cleanSubQuestions(newQuestion.subQuestions || []),
        };
        delete cleanedQuestion.targetChapter;

        if (!cleanedQuestion.questionText?.trim() || !cleanedQuestion.questionType || !cleanedQuestion.questionMarks) {
            showMessage("Question is missing required fields (text, type, or marks).");
            return;
        }

        setQuestionUploading(true);
        try {
            await api.post('/questions', {
                class: selectedClass, subject: selectedSubject, chapter: targetChapter || null, question: cleanedQuestion,
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

    const handleDelete = (mongoId) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Question',
            message: 'Are you sure you want to delete this question? This action cannot be undone.',
            type: 'danger',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
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
            }
        });
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
            const detail = error.response?.data?.details || error.response?.data?.error || error.message;
            showMessage(`Failed to save template: ${detail}`);
        }
    };

    const handleDeleteTemplate = (id) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Template',
            message: 'Are you sure you want to delete this template? This action cannot be undone.',
            type: 'danger',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                try {
                    await api.delete(`/delete-template/${id}`);
                    const res = await api.get('/get-all-templates');
                    setTemplates(res.data);
                    showMessage("Template Deleted");
                } catch (error) {
                    console.error("Error deleting template:", error);
                    showMessage("Failed to delete template.");
                }
            }
        });
    };

    // ==========================================
    // RENDER HELPERS
    // ==========================================
    const toRoman = (num) => {
        const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
        return roman[num] || num + 1;
    };

    const selectedParentCount = useMemo(() => {
        return selectedQuestions.filter(id =>
            questions.some(q => q.questionId === id)
        ).length;
    }, [selectedQuestions, questions]);

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

            <Notification message={message} />
            <LoadingIndicator message="Uploading Image..." active={uploading} />
            <LoadingIndicator message="Saving Question..." active={questionUploading} />
            <ConfirmModal
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            />

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
                        <button className="btn" disabled={selectedParentCount === 0} onClick={() => setIsTransferModalOpen(true)}>
                            ✈️ Transfer ({selectedParentCount})
                        </button>
                        <button className="btn" disabled={!hasWriteAccess} onClick={() => setIsTemplateModalOpen(true)}>
                            <i className="fas fa-book me-2"></i>Templates
                        </button>
                        <button className="btn" onClick={() => setIsQPChoiceModalOpen(true)}>
                            📝 Create Question Paper
                        </button>
                        <button className="btn" disabled={!hasWriteAccess} onClick={() => {
                            setQbSelectedClass(selectedClass || '');
                            handleQBClassChange(selectedClass || '');
                            if (selectedSubject) {
                                setQbSelectedSubject(selectedSubject);
                                if (selectedClass && allChapters.length > 0) {
                                    const match = allChapters.find((item) => {
                                        const isClassMatch = item.classId === selectedClass || item.classId?._id === selectedClass;
                                        const isSubjectMatch = item.subjectId === selectedSubject || item.subjectId?._id === selectedSubject;
                                        return isClassMatch && isSubjectMatch;
                                    });
                                    const chaps = match?.chapters || [];
                                    setQbChapterList(chaps);
                                    setQbSelectedChapters(chaps.map(ch => ch._id));
                                }
                            }
                            setIsDownloadQBModalOpen(true);
                        }}>
                            <i className="fa-solid fa-download me-2"></i>Download QB
                        </button>
                    </div>

                    <div className="qpv2-content-area qpv2-animate-fade" style={{ animationDelay: '0.1s' }}>
                        {questionsLoading ? (
                            <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
                                <div className="spinner-border text-primary mb-3" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <div className="fw-semibold">Loading questions...</div>
                            </div>
                        ) : !selectedClass || !selectedSubject ? (
                            <div className="qpv2-empty-state">
                                <i className="fas fa-folder-open qpv2-empty-icon"></i>
                                <div className="qpv2-empty-text">Select a Class and Subject to view questions.</div>
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
                                            Select All ({selectedQuestions.filter(id =>
                                                questions.some(q => q.questionId === id)
                                            ).length}/{questions.length})
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
                                👁️ View Selected ({selectedParentCount})
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
                        {questionsLoading ? (
                            <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
                                <div className="spinner-border text-primary mb-3" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <div className="fw-semibold">Loading questions...</div>
                            </div>
                        ) : questions.length > 0 ? (
                            <div className="qpv2-question-list">
                                {filteredAndSortedQuestions.map((q, i) => renderQuestionBlock(q, i))}
                            </div>
                        ) : (
                            <div className="text-center py-5 text-muted">Select a Class and Subject to list questions.</div>
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
                                                    border: `2px solid ${isSelected ? 'var(--button-color)' : 'var(--border-color, rgba(0,0,0,0.08))'}`,
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem',
                                                    backgroundColor: isSelected ? 'var(--primary-light, rgba(254, 79, 45, 0.04))' : 'var(--card-bg-color, #ffffff)'
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
                            {(() => {
                                const scalableTargets = [];
                                selectedQuestions.forEach((id) => {
                                    const q = globalQuestionMap[id];
                                    if (!q) return;

                                    const qLabel = getQuestionDisplayLabel(q, questions);

                                    // 1. Main image
                                    if (q.questionImage) {
                                        scalableTargets.push({
                                            id: q.questionId,
                                            label: `${qLabel} Image`,
                                            defaultVal: 120,
                                            min: 50,
                                            max: 600,
                                            step: 10,
                                            toDisplay: (val) => val === '600' ? '100%' : `${val}px`,
                                            fromDisplay: (str) => str.endsWith('%') ? 600 : parseInt(str, 10) || 120,
                                            minLabel: '50px',
                                            maxLabel: 'Full'
                                        });
                                    }

                                    // 2. MCQ options images
                                    if (q.questionType === 'MCQ' && q.options?.some(opt => opt.imageUrl)) {
                                        scalableTargets.push({
                                            id: `${q.questionId}-options`,
                                            label: `${qLabel} Option Images`,
                                            defaultVal: 50,
                                            min: 20,
                                            max: 300,
                                            step: 5,
                                            toDisplay: (val) => `${val}px`,
                                            fromDisplay: (str) => parseInt(str, 10) || 50,
                                            minLabel: '20px',
                                            maxLabel: '300px'
                                        });
                                    }

                                    // 3. Match pairs images
                                    if (q.questionType === 'Match' && q.pairs?.some(pair => pair.leftImage || pair.rightImage)) {
                                        scalableTargets.push({
                                            id: `${q.questionId}-pairs`,
                                            label: `${qLabel} Match Images`,
                                            defaultVal: 36,
                                            min: 15,
                                            max: 200,
                                            step: 2,
                                            toDisplay: (val) => `${val}px`,
                                            fromDisplay: (str) => parseInt(str, 10) || 36,
                                            minLabel: '15px',
                                            maxLabel: '200px'
                                        });
                                    }
                                });

                                if (scalableTargets.length === 0) return null;

                                return (
                                    <div className="qpv2-preview-control-section">
                                        <h5>4. Question Images Scaling</h5>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {scalableTargets.map((target) => {
                                                const currentSize = imageSizesMap[target.id] || `${target.defaultVal}px`;
                                                return (
                                                    <div key={target.id} style={{ display: 'flex', flexDirection: 'column', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9', gap: '6px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                                                {target.label} Size
                                                            </span>
                                                            <span className="badge bg-secondary" style={{ fontSize: '0.75rem' }}>
                                                                {currentSize}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{target.minLabel}</span>
                                                            <input
                                                                type="range"
                                                                min={target.min}
                                                                max={target.max}
                                                                step={target.step}
                                                                value={target.fromDisplay(currentSize)}
                                                                onChange={e => {
                                                                    const val = target.toDisplay(e.target.value);
                                                                    setImageSizesMap(prev => ({ ...prev, [target.id]: val }));
                                                                }}
                                                                style={{ flex: 1, accentColor: 'var(--button-color)', cursor: 'pointer' }}
                                                            />
                                                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{target.maxLabel}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Right Side: Live Document Print Preview */}
                        <div className="qpv2-preview-right-document">
                            <div className="qpv2-live-paper-outer">
                                <div className="qpv2-live-paper-card">
                                    <PrintQuestionPaper
                                        questions={questions}
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
            <div className={`qpv2-drawer ${isViewSelectedDrawerOpen ? 'open' : ''}`} style={{ width: '1000px' }}>
                <div className="qpv2-drawer-header">
                    <h4>👁️ Selected Questions ({selectedParentCount})</h4>
                    <button className="qpv2-drawer-close" onClick={() => setIsViewSelectedDrawerOpen(false)}>&times;</button>
                </div>
                <div className="qpv2-drawer-body">
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                        Questions listed below are ordered exactly in the chronological sequence you selected them.
                    </p>
                    <div className="qpv2-question-list">
                        {selectedQuestions
                            .filter(id => questions.some(q => q.questionId === id))
                            .map((qId, idx) => {
                                const questionObj = globalQuestionMap[qId];
                                if (!questionObj) return null;

                                return renderQuestionBlock(questionObj, idx);
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
                <div className="qpv2-drawer-footer d-flex align-items-center justify-content-between gap-3 w-100" style={{ padding: '16px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: '340px' }}>
                        <span className="small fw-bold text-muted text-nowrap" style={{ fontSize: '0.8rem' }}><i className="fa-solid fa-bookmark text-primary me-1"></i>Target Chapter:</span>
                        <select
                            className="form-select form-select-sm shadow-sm"
                            style={{ borderRadius: '6px', fontSize: '0.8rem', padding: '4px 8px' }}
                            value={newQuestion.targetChapter || selectedChapter || ''}
                            onChange={e => setNewQuestion(q => ({ ...q, targetChapter: e.target.value }))}
                        >
                            <option value="">-- Choose Chapter --</option>
                            {chapterList.map(ch => (
                                <option key={ch._id} value={ch._id}>{ch.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="d-flex gap-2">
                        <button className="qpv2-btn-outline" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                        <button className="qpv2-btn-primary" onClick={handleAddQuestion} disabled={questionUploading}>Save Question</button>
                    </div>
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
                                                <button className="qpv2-icon-btn edit" disabled={!hasWriteAccess} onClick={() => { const { _id, __v, ...rest } = t; setNewTemplate(rest); }}><i className="fas fa-edit"></i></button>
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
                <div className="qpv2-drawer-footer d-flex align-items-center justify-content-between gap-3 w-100" style={{ padding: '16px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: '340px' }}>
                        <span className="small fw-bold text-muted text-nowrap" style={{ fontSize: '0.8rem' }}><i className="fa-solid fa-bookmark text-primary me-1"></i>Target Chapter:</span>
                        <select
                            className="form-select form-select-sm shadow-sm"
                            style={{ borderRadius: '6px', fontSize: '0.8rem', padding: '4px 8px' }}
                            value={newQuestion.targetChapter || selectedChapter || ''}
                            onChange={e => setNewQuestion(q => ({ ...q, targetChapter: e.target.value }))}
                        >
                            <option value="">-- Choose Chapter --</option>
                            {chapterList.map(ch => (
                                <option key={ch._id} value={ch._id}>{ch.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="d-flex gap-2">
                        <button className="qpv2-btn-outline" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                        <button className="qpv2-btn-primary" onClick={handleAddQuestion} disabled={questionUploading}>Save Question</button>
                    </div>
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
                                                <button className="qpv2-icon-btn edit" disabled={!hasWriteAccess} onClick={() => { const { _id, __v, ...rest } = t; setNewTemplate(rest); }}><i className="fas fa-edit"></i></button>
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

            {isQPChoiceModalOpen && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '450px' }}>
                        <div className="modal-content shadow-lg border-0" style={{ borderRadius: '12px' }}>
                            <div className="modal-header border-0 p-3 bg-light">
                                <h5 className="fw-bold mb-0 text-dark">Create Question Paper</h5>
                                <button type="button" className="btn-close" onClick={() => setIsQPChoiceModalOpen(false)} />
                            </div>
                            <div className="modal-body p-4 text-center">
                                <p className="text-muted mb-4">Choose how you want to build this question paper:</p>
                                <div className="d-grid gap-3">
                                    <button
                                        className="btn btn-outline-primary py-3 d-flex align-items-center justify-content-center gap-2 fw-bold"
                                        style={{ borderRadius: '8px', borderWidth: '2px' }}
                                        onClick={() => {
                                            setIsQPChoiceModalOpen(false);
                                            setViewMode('builder');
                                        }}
                                    >
                                        <i className="fa-solid fa-hand-pointer fs-5"></i>
                                        Manual Selection
                                    </button>
                                    <button
                                        className="btn text-white py-3 d-flex align-items-center justify-content-center gap-2 fw-bold"
                                        style={{ backgroundColor: 'var(--button-color)', borderRadius: '8px' }}
                                        onClick={() => {
                                            setIsQPChoiceModalOpen(false);
                                            setRandomClass(selectedClass || '');
                                            handleRandomClassChange(selectedClass || '');
                                            if (selectedSubject) {
                                                setRandomSubject(selectedSubject);
                                                if (selectedClass && allChapters.length > 0) {
                                                    const match = allChapters.find((item) => {
                                                        const isClassMatch = item.classId === selectedClass || item.classId?._id === selectedClass;
                                                        const isSubjectMatch = item.subjectId === selectedSubject || item.subjectId?._id === selectedSubject;
                                                        return isClassMatch && isSubjectMatch;
                                                    });
                                                    const chaps = match?.chapters || [];
                                                    setRandomChapterList(chaps);
                                                    setRandomSelectedChapters(chaps.map(ch => ch._id));
                                                }
                                            }
                                            setIsRandomQPModalOpen(true);
                                        }}
                                    >
                                        <i className="fa-solid fa-shuffle fs-5"></i>
                                        Random Selection
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isRandomQPModalOpen && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content shadow-lg border-0" style={{ borderRadius: '12px' }}>
                            <div className="modal-header bg-light border-bottom p-3">
                                <h5 className="fw-bold mb-0 text-dark">
                                    <i className="fa-solid fa-shuffle me-2 text-primary"></i>Random Question Paper Setup
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setIsRandomQPModalOpen(false)} />
                            </div>
                            <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                <div className="row g-3 mb-4">
                                    <div className="col-6">
                                        <label className="form-label fw-bold text-muted small">Class</label>
                                        <select
                                            className="form-select shadow-sm"
                                            value={randomClass}
                                            onChange={(e) => handleRandomClassChange(e.target.value)}
                                        >
                                            <option value="">-- Class --</option>
                                            {classes.map(c => <option key={c._id} value={c._id}>{c.class}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label fw-bold text-muted small">Subject</label>
                                        <select
                                            className="form-select shadow-sm"
                                            value={randomSubject}
                                            onChange={(e) => handleRandomSubjectChange(e.target.value)}
                                            disabled={!randomClass}
                                        >
                                            <option value="">-- Subject --</option>
                                            {randomFilteredSubjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                                        <span className="fw-bold text-slate-800 small">Chapters</span>
                                        {randomChapterList.length > 0 && (
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="toggleAllRandomChapters"
                                                    checked={randomSelectedChapters.length === randomChapterList.length && randomChapterList.length > 0}
                                                    onChange={handleToggleAllRandomChapters}
                                                />
                                                <label className="form-check-label small fw-semibold text-muted" htmlFor="toggleAllRandomChapters">Select All</label>
                                            </div>
                                        )}
                                    </div>

                                    {randomChapterList.length === 0 ? (
                                        <div className="text-center text-muted py-3 small italic bg-light rounded border">
                                            {!randomSubject ? "Select Class and Subject to see chapters." : "No chapters configured for this subject."}
                                        </div>
                                    ) : (
                                        <div className="overflow-auto border rounded p-3 bg-white" style={{ maxHeight: '140px' }}>
                                            <div className="d-flex flex-wrap gap-2">
                                                {randomChapterList.map((ch, idx) => (
                                                    <div className="form-check me-3" key={ch._id || idx} style={{ minWidth: '180px' }}>
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id={`rand-ch-${ch._id}`}
                                                            checked={randomSelectedChapters.includes(ch._id)}
                                                            onChange={() => handleRandomChapterToggle(ch._id)}
                                                        />
                                                        <label className="form-check-label small text-slate-700 fw-semibold" htmlFor={`rand-ch-${ch._id}`}>
                                                            {ch.name}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                                        <span className="fw-bold text-slate-800 small">Questions Selection Criteria</span>
                                        <button className="btn btn-xs btn-outline-primary fw-bold" onClick={handleAddCriteriaRow}>
                                            <i className="fa-solid fa-plus me-1"></i>Add Criteria
                                        </button>
                                    </div>

                                    <div className="d-flex flex-column gap-3 mt-3">
                                        {randomCriteria.map((row, index) => (
                                            <div className="row g-2 align-items-center border-bottom pb-3" key={row.id}>
                                                <div className="col-4">
                                                    <label className="form-label text-muted small mb-1">Question Type</label>
                                                    <select
                                                        className="form-select form-select-sm"
                                                        value={row.type}
                                                        onChange={(e) => handleCriteriaChange(row.id, 'type', e.target.value)}
                                                    >
                                                        <option value="">-- Type --</option>
                                                        <option value="MCQ">MCQ</option>
                                                        <option value="Descriptive">Descriptive</option>
                                                        <option value="Match">Match</option>
                                                    </select>
                                                </div>
                                                <div className="col-3">
                                                    <label className="form-label text-muted small mb-1">Marks Each</label>
                                                    <input
                                                        type="number"
                                                        className="form-control form-control-sm"
                                                        placeholder="Marks"
                                                        value={row.marks}
                                                        onChange={(e) => handleCriteriaChange(row.id, 'marks', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-3">
                                                    <label className="form-label text-muted small mb-1">No. of Questions</label>
                                                    <input
                                                        type="number"
                                                        className="form-control form-control-sm"
                                                        placeholder="Qty"
                                                        value={row.count}
                                                        min="1"
                                                        onChange={(e) => handleCriteriaChange(row.id, 'count', parseInt(e.target.value, 10) || '')}
                                                    />
                                                </div>
                                                <div className="col-2 text-end" style={{ paddingTop: '20px' }}>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        disabled={randomCriteria.length === 1}
                                                        onClick={() => handleRemoveCriteriaRow(row.id)}
                                                    >
                                                        <i className="fa-solid fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center mt-3 bg-light p-3 rounded border">
                                        <span className="fw-bold text-dark">Total Marks Calculated:</span>
                                        <span className="fs-5 fw-extrabold text-primary">{calculateTotalRandomMarks()} Marks</span>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer bg-light border-top p-3 d-flex justify-content-end gap-2">
                                <button className="btn btn-sm btn-outline-secondary px-3" onClick={() => setIsRandomQPModalOpen(false)}>Cancel</button>
                                <button
                                    className="btn btn-sm text-white fw-bold px-4"
                                    style={{ backgroundColor: 'var(--button-color)' }}
                                    disabled={!randomClass || !randomSubject || randomSelectedChapters.length === 0}
                                    onClick={handleGenerateRandomQP}
                                >
                                    <i className="fa-solid fa-gears me-2"></i>Generate Random Paper
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isDownloadQBModalOpen && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-md modal-dialog-centered">
                        <div className="modal-content shadow-lg border-0" style={{ borderRadius: '12px' }}>
                            <div className="modal-header bg-light border-bottom p-3">
                                <h5 className="fw-bold mb-0 text-dark">
                                    <i className="fa-solid fa-download me-2 text-primary"></i>Download Question Bank
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setIsDownloadQBModalOpen(false)} />
                            </div>
                            <div className="modal-body p-4">
                                <div className="row g-3 mb-4">
                                    <div className="col-6">
                                        <label className="form-label fw-bold text-muted small">Select Class</label>
                                        <select
                                            className="form-select shadow-sm"
                                            value={qbSelectedClass}
                                            onChange={(e) => handleQBClassChange(e.target.value)}
                                        >
                                            <option value="">-- Class --</option>
                                            {classes.map(c => <option key={c._id} value={c._id}>{c.class}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label fw-bold text-muted small">Select Subject</label>
                                        <select
                                            className="form-select shadow-sm"
                                            value={qbSelectedSubject}
                                            onChange={(e) => handleQBSubjectChange(e.target.value)}
                                            disabled={!qbSelectedClass}
                                        >
                                            <option value="">-- Subject --</option>
                                            {qbFilteredSubjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label fw-bold text-muted small">Question Order / Sort Type</label>
                                    <select
                                        className="form-select shadow-sm"
                                        value={qbSortOrder}
                                        onChange={(e) => setQbSortOrder(e.target.value)}
                                    >
                                        <option value="none">Default Order (As added)</option>
                                        <option value="chapter">Chapter-wise</option>
                                        <option value="type">Type-wise (First MCQ, then Subjective)</option>
                                    </select>
                                </div>

                                {qbSortOrder === 'type' && (
                                    <div className="mb-3 p-3 bg-light rounded border">
                                        <label className="form-label fw-bold text-muted small d-block mb-2">
                                            <i className="fa-solid fa-arrow-down-up-lock me-1"></i>Set Question Type Priority (Top to Bottom)
                                        </label>
                                        <div className="d-flex flex-column gap-2">
                                            {qbTypeOrder.map((type, idx) => (
                                                <div key={type} className="d-flex align-items-center justify-content-between bg-white px-3 py-2 rounded border shadow-sm">
                                                    <span className="small fw-bold text-dark">{type === 'sub-question' ? 'Sub-Questions' : type === 'Match' ? 'Match the Following' : type}</span>
                                                    <div className="d-flex gap-1">
                                                        <button
                                                            type="button"
                                                            className="btn btn-xs btn-outline-secondary py-0 px-2 border"
                                                            disabled={idx === 0}
                                                            onClick={() => {
                                                                const newOrder = [...qbTypeOrder];
                                                                const temp = newOrder[idx - 1];
                                                                newOrder[idx - 1] = newOrder[idx];
                                                                newOrder[idx] = temp;
                                                                setQbTypeOrder(newOrder);
                                                            }}
                                                        >
                                                            <i className="fa-solid fa-arrow-up fa-xs"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-xs btn-outline-secondary py-0 px-2 border"
                                                            disabled={idx === qbTypeOrder.length - 1}
                                                            onClick={() => {
                                                                const newOrder = [...qbTypeOrder];
                                                                const temp = newOrder[idx + 1];
                                                                newOrder[idx + 1] = newOrder[idx];
                                                                newOrder[idx] = temp;
                                                                setQbTypeOrder(newOrder);
                                                            }}
                                                        >
                                                            <i className="fa-solid fa-arrow-down fa-xs"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                                        <span className="fw-bold text-slate-800 small">Select Chapters</span>
                                        {qbChapterList.length > 0 && (
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="toggleAllChapters"
                                                    checked={qbSelectedChapters.length === qbChapterList.length && qbChapterList.length > 0}
                                                    onChange={handleToggleAllChapters}
                                                />
                                                <label className="form-check-label small fw-semibold text-muted" htmlFor="toggleAllChapters">Select All</label>
                                            </div>
                                        )}
                                    </div>

                                    {qbChapterList.length === 0 ? (
                                        <div className="text-center text-muted py-4 small italic bg-light rounded border">
                                            {!qbSelectedSubject ? "Select Class and Subject to see chapters." : "No chapters configured for this subject."}
                                        </div>
                                    ) : (
                                        <div className="overflow-auto border rounded p-3 bg-white" style={{ maxHeight: '200px' }}>
                                            <div className="d-flex flex-column gap-2">
                                                {qbChapterList.map((ch, idx) => (
                                                    <div className="form-check" key={ch._id || idx}>
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id={`qb-ch-${ch._id}`}
                                                            checked={qbSelectedChapters.includes(ch._id)}
                                                            onChange={() => handleQBChapterToggle(ch._id)}
                                                        />
                                                        <label className="form-check-label small text-slate-700 fw-semibold" htmlFor={`qb-ch-${ch._id}`}>
                                                            {ch.name}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer bg-light border-top p-3 d-flex justify-content-end gap-2">
                                <button className="btn btn-sm btn-outline-secondary px-3" onClick={() => setIsDownloadQBModalOpen(false)}>Cancel</button>
                                <button
                                    className="btn btn-sm text-white fw-bold px-4"
                                    style={{ backgroundColor: 'var(--button-color)' }}
                                    disabled={!qbSelectedClass || !qbSelectedSubject || qbSelectedChapters.length === 0 || qbDownloading}
                                    onClick={handleQBDownloadSubmit}
                                >
                                    {qbDownloading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                                            Downloading...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-download me-2"></i>Download QB
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'none' }}>
                <PrintQuestionPaper
                    ref={printRef}
                    questions={questions}
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
                <div ref={qbPrintRef}>
                    <DownloadQuestionBank
                        questions={qbQuestions}
                        selectedClass={classes.find(c => c._id === qbSelectedClass)?.class}
                        selectedSubject={subjects.find(s => s._id === qbSelectedSubject)?.name}
                        selectedChapter={qbChapterList
                            .filter(ch => qbSelectedChapters.includes(ch._id))
                            .map(ch => ch.name)
                            .join(", ")}
                    />
                </div>
            </div>

        </div>
    );
}
