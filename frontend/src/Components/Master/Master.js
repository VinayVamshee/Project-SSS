/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, {
    getMasters, updateMaster, getAcademicYears, addAcademicYear as apiAddAcademicYear, deleteAcademicYear as apiDeleteAcademicYear,
    getClasses, addClass, deleteClass as deleteClassAPI,
    getSubjects, addSubject, deleteSubject, updateSubject,
    getClassSubjects, linkClassSubject,
    getChaptersByClassAndSubject,
    getClassFees, getTemplates, getTemplateForm, submitTemplateForm
} from '../../API';
import './Master.css';
import AcademicManagementHub from '../AcademicManagement/AcademicManagementHub';
import Notification from '../Shared/Notification';
import LoadingIndicator from '../Shared/LoadingIndicator';
import ConfirmModal from '../Shared/ConfirmModal';
import DynamicForm from '../Shared/DynamicForm';

export default function Master() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile');
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'primary' });

    const showMessage = useCallback((msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 5000);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userType = localStorage.getItem("userType");
        const isDev = localStorage.getItem("isDev") === "true";

        if (!token) {
            navigate("/login");
            return;
        }

        if (userType !== "admin" && !isDev) {
            navigate("/");
        }
    }, [navigate]);

    const [form, setForm] = useState({
        imageUrl: '',
        name: '',
        address: '',
        phoneNo: '',
        email: '',
        theme: {
            themeName: 'light'
        }
    });

    const [latestId, setLatestId] = useState(null);

    // Profile & Branding Loading
    useEffect(() => {
        getMasters()
            .then(res => {
                const data = res.data;
                if (data) {
                    const activeTheme = data.theme?.themeName || 'light';
                    setForm({
                        imageUrl: data.logoUrl || data.imageUrl || '',
                        name: data.name || '',
                        address: data.address || '',
                        phoneNo: data.phoneNo || '',
                        email: data.email || '',
                        theme: { themeName: activeTheme }
                    });
                    setLatestId(data._id);
                }
            })
            .catch(() => setLatestId(null));
    }, []);

    // Cleanup preview theme on unmount if not saved
    useEffect(() => {
        return () => {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
        };
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('theme.')) {
            const themeKey = name.split('.')[1];
            setForm(prev => ({
                ...prev,
                theme: {
                    ...prev.theme,
                    [themeKey]: value
                }
            }));

            // Set the theme instantly on the root document element so the user sees the preview change live!
            if (themeKey === 'themeName') {
                document.documentElement.setAttribute('data-theme', value);
            }
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const updateLatestMaster = () => {
        if (!latestId) return showMessage('⚠️ No school record to update.');

        const payload = { ...form, logoUrl: form.imageUrl };
        updateMaster(latestId, payload)
            .then(() => {
                showMessage('✅ Settings saved successfully!');
                localStorage.setItem('schoolLogo', form.imageUrl);
                localStorage.setItem('schoolName', form.name);
                localStorage.setItem('theme', form.theme.themeName);
                window.location.reload();
            })
            .catch(err => showMessage('Error saving settings: ' + err.message));
    };

    // Sessions Setup States
    const [academicYear, setAcademicYear] = useState('');
    const [academicYears, setAcademicYears] = useState([]);

    const fetchAcademicYears = useCallback(() => {
        getAcademicYears()
            .then(res => setAcademicYears(res.data.data))
            .catch(() => showMessage("❌ Failed to load academic years."));
    }, [showMessage]);

    useEffect(() => {
        fetchAcademicYears();
    }, [fetchAcademicYears]);

    const addAcademicYear = () => {
        if (!academicYear) return showMessage("Please enter an academic year.");
        apiAddAcademicYear({ year: academicYear })
            .then(() => {
                setAcademicYear('');
                fetchAcademicYears();
                showMessage("✅ Academic Year Added Successfully!");
            })
            .catch(() => showMessage("❌ Failed to add academic year"));
    };

    const deleteAcademicYear = (id) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Academic Year',
            message: 'Are you sure you want to delete this academic year? This action cannot be undone.',
            type: 'danger',
            onConfirm: () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                apiDeleteAcademicYear(id)
                    .then(() => {
                        fetchAcademicYears();
                        showMessage("🗑️ Deleted");
                    })
                    .catch((err) => {
                        const errMsg = err.response?.data?.message || "Failed to delete";
                        showMessage(`❌ ${errMsg}`);
                    });
            }
        });
    };

    // Academics Setup states
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [classSubjectsData, setClassSubjectsData] = useState([]);
    const [selectedClassLink, setSelectedClassLink] = useState('');
    const [newSelectedSubjects, setNewSelectedSubjects] = useState([]);

    // Chapters Setup States
    const [selectedClassChapter, setSelectedClassChapter] = useState('');
    const [selectedSubjectChapter, setSelectedSubjectChapter] = useState('');
    const [linkedSubjectsForChapter, setLinkedSubjectsForChapter] = useState([]);
    const [chapterList, setChapterList] = useState([]);
    const [newChapterName, setNewChapterName] = useState('');
    const [editChapterId, setEditChapterId] = useState(null);
    const [editChapterName, setEditChapterName] = useState('');

    // Exams Setup States
    const [selectedClassExam, setSelectedClassExam] = useState('');

    // Assessment Configuration Redesign States
    const [selectedYearExam, setSelectedYearExam] = useState('');
    const [assessments, setAssessments] = useState([]);
    const [selectedAssessment, setSelectedAssessment] = useState(null);
    const [assessmentForm, setAssessmentForm] = useState({
        assessmentName: '',
        weightage: 100,
        status: 'Draft'
    });
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [selectedChapters, setSelectedChapters] = useState({});
    const [subjectChaptersData, setSubjectChaptersData] = useState({});
    const [subjectConfigs, setSubjectConfigs] = useState({}); // { [subjectId]: { maximumMarks, passingMarks, duration, examDate, instructions } }



    const loadAssessmentSetupData = async (classId, yearId) => {
        if (!classId || !yearId) return;
        try {
            const assRes = await api.get('/api/assessments/config', { params: { academicYearId: yearId, classId } });
            setAssessments(assRes.data.data || []);

            const classLink = classSubjectsData.find(link => 
                (link.classId?._id || link.classId || "").toString() === classId.toString()
            );
            if (classLink) {
                const resolved = subjects.filter(s => 
                    classLink.subjectIds.some(id => (id?._id || id || "").toString() === s._id.toString())
                );
                setAvailableSubjects(resolved);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchChaptersForSubject = async (subjectId) => {
        if (subjectChaptersData[subjectId]) return;
        try {
            const res = await api.get(`/chapters/${selectedClassExam}/${subjectId}`);
            setSubjectChaptersData(prev => ({
                ...prev,
                [subjectId]: res.data.chapters || []
            }));
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveAssessmentConfig = async () => {
        try {
            if (!assessmentForm.assessmentName || !assessmentForm.assessmentName.trim()) {
                throw new Error("Assessment Name is required.");
            }
            if (!selectedSubjects || selectedSubjects.length === 0) {
                throw new Error("At least one Subject must be linked to the assessment.");
            }

            // Validate subject configurations
            for (const subId of selectedSubjects) {
                const sub = availableSubjects.find(s => s._id === subId);
                const conf = subjectConfigs[subId] || {};
                
                if (conf.maximumMarks === undefined || conf.maximumMarks === null || conf.maximumMarks === "") {
                    throw new Error(`Maximum Marks is required for subject: ${sub?.name || 'Subject'}`);
                }
                if (conf.passingMarks === undefined || conf.passingMarks === null || conf.passingMarks === "") {
                    throw new Error(`Passing Marks is required for subject: ${sub?.name || 'Subject'}`);
                }
                if (Number(conf.passingMarks) > Number(conf.maximumMarks)) {
                    throw new Error(`Passing Marks cannot exceed Maximum Marks for subject: ${sub?.name || 'Subject'}`);
                }
                if (!conf.duration) {
                    throw new Error(`Exam Duration is required for subject: ${sub?.name || 'Subject'}`);
                }
            }

            setUploading(true);
            const payloadSubjects = selectedSubjects.map(subId => {
                const conf = subjectConfigs[subId] || { maximumMarks: 100, passingMarks: 35, duration: 180 };
                return {
                    subjectId: subId,
                    selectedChapterIds: selectedChapters[subId] || [],
                    maximumMarks: conf.maximumMarks || 100,
                    passingMarks: conf.passingMarks || 35,
                    examDate: conf.examDate || null,
                    duration: conf.duration || 180
                };
            });

            await api.post('/api/assessments/config', {
                academicYearId: selectedYearExam,
                classId: selectedClassExam,
                assessmentName: assessmentForm.assessmentName,
                weightage: assessmentForm.weightage,
                status: assessmentForm.status,
                subjects: payloadSubjects,
                assessmentConfigurationId: selectedAssessment?._id // pass ID for edit/updates
            });

            showMessage('✅ Assessment configuration saved successfully!');
            setSelectedAssessment(null);
            loadAssessmentSetupData(selectedClassExam, selectedYearExam);
        } catch (err) {
            showMessage('❌ Failed to save assessment config: ' + err.message);
        } finally {
            setUploading(false);
        }
    };



    // Forms States
    const [newClassName, setNewClassName] = useState('');
    const [newSubjectName, setNewSubjectName] = useState('');
    const [editSubjectId, setEditSubjectId] = useState(null);
    const [editSubjectName, setEditSubjectName] = useState('');

    // Fee Structure Setup States
    const [feeTemplateForm, setFeeTemplateForm] = useState(null);
    const [classFeesData, setClassFeesData] = useState([]);
    const [selectedFeeYear, setSelectedFeeYear] = useState('');

    const fetchFeeStructureData = useCallback(async () => {
        try {
            // 1. Fetch template form
            const templatesRes = await getTemplates();
            const allTemplates = templatesRes.data?.data || [];
            const feeTemplate = allTemplates.find(t => t.status === 'active' && t.purpose === 'fee_structure');
            if (feeTemplate) {
                const formRes = await getTemplateForm(feeTemplate._id);
                setFeeTemplateForm(formRes.data?.data);
            }

            // 2. Fetch classes
            const classRes = await getClasses();
            const sortedClasses = (classRes.data.classes || []).sort((a, b) => parseInt(a.class) - parseInt(b.class));
            setClasses(sortedClasses);

            // 3. Fetch class fees
            const classFeesResponse = await getClassFees();
            const allFees = classFeesResponse.data || [];
            const filteredFees = selectedFeeYear
                ? allFees.filter(fee => fee.academicYear?.trim() === selectedFeeYear.trim())
                : allFees;
            setClassFeesData(filteredFees);
        } catch (err) {
            console.error("Failed to load fee structure setup data:", err);
        }
    }, [selectedFeeYear]);

    useEffect(() => {
        if (activeTab === 'fee_structure') {
            fetchFeeStructureData();
        }
    }, [activeTab, fetchFeeStructureData]);

    const fetchAcademicsData = async () => {
        try {
            const classRes = await getClasses();
            const sortedClasses = (classRes.data.classes || []).sort((a, b) => parseInt(a.class) - parseInt(b.class));
            setClasses(sortedClasses);

            const subjRes = await getSubjects();
            setSubjects(subjRes.data.subjects || []);

            const linkRes = await getClassSubjects();
            setClassSubjectsData(linkRes.data.data || []);


        } catch (err) {
            console.error("Failed to load academics setup data:", err);
        }
    };

    useEffect(() => {
        if (activeTab === 'academics') {
            fetchAcademicsData();
        }
    }, [activeTab]);

    const handleAddClassSubmit = async (e) => {
        e.preventDefault();
        if (!newClassName.trim()) return;
        setUploading(true);
        try {
            await addClass({ className: newClassName.trim() });
            setNewClassName('');
            showMessage('✅ Class added successfully!');
            await fetchAcademicsData();
        } catch (err) {
            showMessage('❌ Failed to add class');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteClassSubmit = (classId, name) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Class',
            message: `Are you sure you want to delete class "${name}"? This action cannot be undone.`,
            type: 'danger',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                setUploading(true);
                try {
                    await deleteClassAPI(classId);
                    showMessage('🗑️ Class deleted successfully!');
                    await fetchAcademicsData();
                } catch (err) {
                    showMessage('❌ Failed to delete class');
                } finally {
                    setUploading(false);
                }
            }
        });
    };

    const handleAddSubjectSubmit = async (e) => {
        e.preventDefault();
        if (!newSubjectName.trim()) return;
        setUploading(true);
        try {
            await addSubject({ subjectName: newSubjectName.trim() });
            setNewSubjectName('');
            showMessage('✅ Subject added successfully!');
            await fetchAcademicsData();
        } catch (err) {
            showMessage('❌ Failed to add subject');
        } finally {
            setUploading(false);
        }
    };

    const handleEditSubjectSubmit = async (id) => {
        if (!editSubjectName.trim()) return;
        setUploading(true);
        try {
            await updateSubject(id, { name: editSubjectName.trim() });
            setEditSubjectId(null);
            showMessage('✅ Subject updated successfully!');
            await fetchAcademicsData();
        } catch (err) {
            showMessage('❌ Failed to update subject');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteSubjectSubmit = (id, name) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Subject',
            message: `Are you sure you want to delete subject "${name}"? This action cannot be undone.`,
            type: 'danger',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                setUploading(true);
                try {
                    await deleteSubject(id);
                    showMessage('🗑️ Subject deleted successfully!');
                    await fetchAcademicsData();
                } catch (err) {
                    showMessage('❌ Failed to delete subject');
                } finally {
                    setUploading(false);
                }
            }
        });
    };

    const handleClassLinkSelect = (classId) => {
        setSelectedClassLink(classId);
        const classData = classSubjectsData.find(item => {
            const id = (item.classId?._id || item.classId || "").toString();
            return id === classId.toString();
        });
        if (classData && classData.subjectIds) {
            setNewSelectedSubjects(classData.subjectIds.map(id => (id?._id || id || "").toString()));
        } else {
            setNewSelectedSubjects([]);
        }
    };

    const handleLinkCheckboxChange = (subjectId) => {
        setNewSelectedSubjects(prev =>
            prev.includes(subjectId)
                ? prev.filter(id => id !== subjectId)
                : [...prev, subjectId]
        );
    };

    const handleSaveLinkageSubmit = async (e) => {
        e.preventDefault();
        if (!selectedClassLink) return showMessage("Please select a class");
        setUploading(true);
        try {
            await linkClassSubject({
                classId: selectedClassLink,
                subjectIds: newSelectedSubjects
            });
            showMessage('✅ Subject-class linkages updated!');
            await fetchAcademicsData();
        } catch (err) {
            showMessage('❌ Failed to save subject linkages');
        } finally {
            setUploading(false);
        }
    };

    const handleClassChapterSelect = (classId) => {
        setSelectedClassChapter(classId);
        setSelectedSubjectChapter('');
        setChapterList([]);
        const classData = classSubjectsData.find(item => {
            const id = (item.classId?._id || item.classId || "").toString();
            return id === classId.toString();
        });
        if (classData && classData.subjectIds) {
            const linked = subjects.filter(subj =>
                classData.subjectIds.some(id => (id?._id || id || "").toString() === subj._id.toString())
            );
            setLinkedSubjectsForChapter(linked);
        } else {
            setLinkedSubjectsForChapter([]);
        }
    };

    const handleSubjectChapterSelect = async (subjectId) => {
        setSelectedSubjectChapter(subjectId);
        if (!selectedClassChapter || !subjectId) {
            setChapterList([]);
            return;
        }
        setUploading(true);
        try {
            const res = await getChaptersByClassAndSubject(selectedClassChapter, subjectId);
            setChapterList(res.data.chapters || []);
        } catch (err) {
            setChapterList([]);
        } finally {
            setUploading(false);
        }
    };

    const handleAddChapterSubmit = async (e) => {
        e.preventDefault();
        if (!newChapterName.trim() || !selectedClassChapter || !selectedSubjectChapter) return;
        setUploading(true);
        try {
            await api.post('/chapters', {
                classId: selectedClassChapter,
                subjectId: selectedSubjectChapter,
                chapters: [...chapterList, { name: newChapterName.trim() }]
            });
            setNewChapterName('');
            const res = await getChaptersByClassAndSubject(selectedClassChapter, selectedSubjectChapter);
            setChapterList(res.data.chapters || []);
            showMessage('✅ Chapter added successfully!');
        } catch (err) {
            showMessage('❌ Failed to add chapter');
        } finally {
            setUploading(false);
        }
    };

    const handleEditChapterSubmit = async (chId) => {
        if (!editChapterName.trim()) return;
        setUploading(true);
        try {
            await api.put(`/chapters/${selectedClassChapter}/${selectedSubjectChapter}/${chId}`, {
                newName: editChapterName.trim()
            });
            setEditChapterId(null);
            setEditChapterName('');
            const res = await getChaptersByClassAndSubject(selectedClassChapter, selectedSubjectChapter);
            setChapterList(res.data.chapters || []);
            showMessage('✅ Chapter name updated!');
        } catch (err) {
            showMessage('❌ Failed to update chapter');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteChapterSubmit = (chId, name) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Chapter',
            message: `Are you sure you want to delete chapter "${name}"? This action cannot be undone.`,
            type: 'danger',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                setUploading(true);
                try {
                    await api.delete(`/chapters/${selectedClassChapter}/${selectedSubjectChapter}/${chId}`);
                    const res = await getChaptersByClassAndSubject(selectedClassChapter, selectedSubjectChapter);
                    setChapterList(res.data.chapters || []);
                    showMessage('🗑️ Chapter deleted!');
                } catch (err) {
                    showMessage('❌ Failed to delete chapter');
                } finally {
                    setUploading(false);
                }
            }
        });
    };



    const themes = [
        "light",
        "Dark",
        "Liquid Glass",
        "Crystal Glass",
        "Neo Glass",
        "Aurora Glass",
        "Moonlight Glass",
        "Ocean",
        "Deep Ocean",
        "Earth",
        "Sunset Peach",
        "Mint Cream",
        "Lavender Day",
        "Lemon Zest",
        "Charcoal Cyan",
        "Dracula Midnight",
        "Cherry Red",
        "Electric Blue",
        "Tropical Green",
        "Ultra Violet",
        "Emerald Pro",
        "Royal Indigo",
        "Crimson Wine"
    ];

    const [academicsSubTab, setAcademicsSubTab] = useState('classes');

    return (
        <div className="master-container">
            {/* Navigation Tabs */}
            <ul className="nav nav-tabs mb-4 border-bottom-0">
                <li className="nav-item">
                    <button
                        className={`nav-link premium-nav-link ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <i className="fas fa-id-card me-2"></i>Profile Details
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link premium-nav-link ${activeTab === 'branding' ? 'active' : ''}`}
                        onClick={() => setActiveTab('branding')}
                    >
                        <i className="fas fa-palette me-2"></i>Branding & Themes
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link premium-nav-link ${activeTab === 'sessions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sessions')}
                    >
                        <i className="fas fa-history me-2"></i>Academic Rollover
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link premium-nav-link ${activeTab === 'academics' ? 'active' : ''}`}
                        onClick={() => setActiveTab('academics')}
                    >
                        <i className="fas fa-graduation-cap me-2"></i>Academics Setup
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link premium-nav-link ${activeTab === 'fee_structure' ? 'active' : ''}`}
                        onClick={() => setActiveTab('fee_structure')}
                    >
                        <i className="fas fa-money-check-dollar me-2"></i>Fee Structure Setup
                    </button>
                </li>
            </ul>

            {/* Forms section */}
            {activeTab === 'academics' ? (
                <AcademicManagementHub />
            ) : activeTab === 'fee_structure' ? (
                <div className="fee-structure-setup-flat">
                    <div className="setup-title-group mb-4">
                        <h3 className="fw-bold d-flex align-items-center">
                            <i className="fa-solid fa-money-check-dollar text-success me-2"></i>
                            Class Fee Structure Setup
                        </h3>
                        <p className="text-muted">Define, adjust, and view class-level fee schedules for academic sessions.</p>
                    </div>

                    <div className="setup-content-card mb-4" style={{ padding: '1.5rem' }}>
                        <div className="row align-items-center">
                            <div className="col-md-6">
                                <label className="premium-label fw-bold mb-2">
                                    CHOOSE TARGET SESSION
                                </label>
                                <select 
                                    className="form-select premium-input" 
                                    value={selectedFeeYear} 
                                    onChange={(e) => setSelectedFeeYear(e.target.value)}
                                >
                                    <option value="">-- Select Session Year --</option>
                                    {academicYears.map((year) => (
                                        <option key={year._id} value={year.year}>{year.year}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {selectedFeeYear ? (
                        <div className="row g-4">
                            {/* Left Side: Create / Edit Form */}
                            <div className="col-lg-5">
                                <div className="setup-content-card h-100">
                                    <div className="setup-title-group mb-3 pb-2 border-bottom">
                                        <h4 className="fw-bold"><i className="fa-solid fa-pen-to-square me-2 text-primary"></i>Configure Schedule</h4>
                                    </div>
                                    <div className="p-1">
                                        {feeTemplateForm ? (
                                            <DynamicForm
                                                template={feeTemplateForm}
                                                mode="create"
                                                onSubmit={async (formData) => {
                                                    try {
                                                        const payload = {
                                                            ...formData,
                                                            academicYear: selectedFeeYear
                                                        };
                                                        await submitTemplateForm(feeTemplateForm.template.id || feeTemplateForm.template._id, payload);
                                                        showMessage('✅ Fee structure updated successfully!');
                                                        fetchFeeStructureData();
                                                    } catch (err) {
                                                        console.error("Failed to submit template form", err);
                                                        showMessage("❌ Failed to save: " + (err.response?.data?.message || err.message));
                                                    }
                                                }}
                                                submitLabel="Save Fee Structure"
                                            />
                                        ) : (
                                            <div className="text-center py-4 text-muted">
                                                ⚠️ Fee structure template not configured.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Active Fee List */}
                            <div className="col-lg-7">
                                <div className="setup-content-card h-100">
                                    <div className="setup-title-group mb-3 pb-2 border-bottom">
                                        <h4 className="fw-bold"><i className="fa-solid fa-list me-2 text-success"></i>Current Fee Structures ({selectedFeeYear})</h4>
                                    </div>
                                    <div className="p-1">
                                        {feeTemplateForm ? (() => {
                                            const flatFields = feeTemplateForm.sections ? feeTemplateForm.sections.flatMap(s => s.fields || []) : (feeTemplateForm.fields || []);
                                            return (
                                                <div className="table-responsive">
                                                    <table className="setup-table align-middle">
                                                        <thead>
                                                            <tr>
                                                                <th className="fw-bold">Class</th>
                                                                {flatFields
                                                                    .filter(f => f.key !== 'class_id' && f.key !== 'class' && f.key !== 'academicYear' && f.key !== 'total_fees' && f.key !== 'total_fee')
                                                                    .map(field => (
                                                                        <th key={field.key} className="fw-bold">{field.label}</th>
                                                                    ))}
                                                                <th className="fw-bold text-success">Total Fees</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {classFeesData.length > 0 && classFeesData[0].classes ? (
                                                                classFeesData[0].classes
                                                                    .filter(fee => fee.class_id && fee.class_id._id)
                                                                    .sort((a, b) => {
                                                                        const customOrder = [
                                                                            "Pre-Nursery", "Nursery", "KG-1", "KG-2",
                                                                            "Class-1", "Class-2", "Class-3", "Class-4", "Class-5",
                                                                            "Class-6", "Class-7", "Class-8", "Class-9", "Class-10",
                                                                            "Class-11", "Class-12"
                                                                        ];
                                                                        const nameA = a.class_id.class || "";
                                                                        const nameB = b.class_id.class || "";
                                                                        const indexA = customOrder.indexOf(nameA);
                                                                        const indexB = customOrder.indexOf(nameB);
                                                                        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
                                                                    })
                                                                    .map((fee, idx) => {
                                                                        const className = fee.class_id.class || "Deleted Class";
                                                                        const feeColumns = flatFields.filter(
                                                                            f => f.key !== 'class_id' && f.key !== 'class' && f.key !== 'academicYear' && f.key !== 'total_fees' && f.key !== 'total_fee'
                                                                        );
                                                                        const total = feeColumns.reduce((sum, field) => {
                                                                            return sum + (Number(fee[field.key]) || 0);
                                                                        }, 0);

                                                                        return (
                                                                            <tr key={idx}>
                                                                                <td className="fw-semibold">{className}</td>
                                                                                {feeColumns.map(field => (
                                                                                    <td key={field.key}>₹{(Number(fee[field.key]) || 0).toLocaleString('en-IN')}</td>
                                                                                ))}
                                                                                <td className="fw-bold text-success">₹{total.toLocaleString('en-IN')}</td>
                                                                            </tr>
                                                                        );
                                                                    })
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan={flatFields.filter(f => f.key !== 'class_id' && f.key !== 'class' && f.key !== 'academicYear').length + 2} className="text-center py-4 text-muted">
                                                                        No fee structures configured for this Academic Year.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        })() : (
                                            <div className="text-center py-4 text-muted">
                                                ⚠️ Fee structure template is not configured.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="setup-content-card p-5 text-center">
                            <i className="fa-solid fa-calendar-day fa-3x mb-3 text-muted"></i>
                            <h5 className="fw-bold">No Academic Session Selected</h5>
                            <p className="text-muted mb-0">Please choose an academic rollover session year from the dropdown menu above to display and configure class fee structures.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="row g-4">
                    <div className="col-lg-8">
                        <div className="setup-content-card">
                            <div className="setup-title-group mb-3 pb-2 border-bottom">
                                <h4 className="fw-bold">
                                    <i className="fas fa-edit text-primary me-2"></i>
                                    {activeTab === 'profile' && "Update School Contact Metadata"}
                                    {activeTab === 'branding' && "Modify Theme Preset Settings"}
                                    {activeTab === 'sessions' && "Manage Operational Calendars"}
                                </h4>
                            </div>
                            <div className="p-1">
                                {activeTab === 'profile' && (
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label className="premium-label">School Name</label>
                                            <input type="text" className="form-control premium-input" name="name" value={form.name} onChange={handleChange} required />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="premium-label">Email Address</label>
                                            <input type="email" className="form-control premium-input" name="email" value={form.email} onChange={handleChange} required />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="premium-label">Phone Number</label>
                                            <input type="text" className="form-control premium-input" name="phoneNo" value={form.phoneNo} onChange={handleChange} required />
                                        </div>
                                        <div className="col-12">
                                            <label className="premium-label">Physical Address</label>
                                            <input type="text" className="form-control premium-input" name="address" value={form.address} onChange={handleChange} required />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'branding' && (
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label className="premium-label">Logo URL</label>
                                            <input type="text" className="form-control premium-input" name="imageUrl" value={form.imageUrl} onChange={handleChange} placeholder="https://domain.com/logo.png" />
                                        </div>
                                        <div className="col-12">
                                            <label className="premium-label">Theme Preset Layout</label>
                                            <select className="form-select premium-input" name="theme.themeName" value={form.theme.themeName} onChange={handleChange}>
                                                {themes.map((t) => (
                                                    <option key={t} value={t}>{t.replace('-', ' ').toUpperCase()}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'sessions' && (
                                    <div>
                                        <p className="text-muted mb-4">Select or add new active academic years. These serve as the system boundaries for student marks, promotion, and invoicing tracks.</p>
                                        <div className="d-flex gap-2 mb-4">
                                            <input
                                                type="text"
                                                className="form-control premium-input"
                                                placeholder="e.g. 2025-26"
                                                value={academicYear}
                                                onChange={(e) => setAcademicYear(e.target.value)}
                                            />
                                            <button className="btn btn-success btn-premium" onClick={addAcademicYear} style={{ padding: '0.4rem 0.8rem' }}>
                                                <i className="fas fa-plus me-1"></i>Add Session
                                            </button>
                                        </div>

                                        <div className="row g-3">
                                            {academicYears.length === 0 ? (
                                                <div className="col-12 text-center py-4">
                                                    <p className="text-muted mb-0">No active academic years registered.</p>
                                                </div>
                                            ) : (
                                                academicYears.map((yearObj) => (
                                                    <div className="col-md-6" key={yearObj._id}>
                                                        <div className="border rounded p-3 d-flex justify-content-between align-items-center shadow-sm bg-white">
                                                            <span className="fw-semibold">
                                                                <i className="fas fa-calendar me-2 text-muted"></i>{yearObj.year}
                                                            </span>
                                                            <button className="btn btn-sm btn-outline-danger" onClick={() => deleteAcademicYear(yearObj._id)}>
                                                                <i className="fas fa-trash-alt"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Actions Buttons inside Card Footer */}
                                {activeTab !== 'sessions' && (
                                    <div className="d-flex gap-3 mt-4 pt-3 border-top justify-content-end">
                                        <button type="button" className="btn btn-premium btn-premium-primary" onClick={updateLatestMaster} style={{ padding: '0.4rem 0.8rem' }}>
                                            <i className="fas fa-save me-2"></i>Save Configuration
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Preview Box */}
                    <div className="col-lg-4">
                        <div className="setup-content-card h-100 p-4 d-flex flex-column justify-content-between align-items-center text-center">
                            <div className="w-100">
                                <h4 className="fw-bold mb-3">Live Branding Preview</h4>
                                <p className="text-muted small mb-4">Preview of how the branding matches dynamically with the client dashboard layouts.</p>

                                <div className="brand-preview-box mb-4" style={{ backgroundColor: 'lightgrey', color: 'var(--text-color)', border: '1px solid rgba(0,0,0,0.15)' }}>
                                    {form.imageUrl ? (
                                        <img src={form.imageUrl} alt="School Logo" className="brand-preview-logo" />
                                    ) : (
                                        <div className="d-flex align-items-center justify-content-center bg-secondary text-white rounded-circle mx-auto mb-3" style={{ width: '70px', height: '70px' }}>
                                            <i className="fas fa-school fa-2x"></i>
                                        </div>
                                    )}
                                    <h5 className="fw-bold mb-1 text-truncate">{form.name || 'School Name'}</h5>
                                    <span className="badge bg-success small mb-2 p-2 rounded-pill">
                                        {form.theme.themeName.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            <div className="w-100">
                                <div className="d-grid gap-2">
                                    <button className="btn w-100 text-white" style={{ backgroundColor: 'var(--button-color)', border: 'none' }}>
                                        Primary Action Button
                                    </button>
                                    <div className="p-3 rounded text-center small fw-semibold" style={{ backgroundColor: 'var(--background-color)', border: '1px solid var(--button-color)', color: 'var(--text-color)' }}>
                                        Secondary Accent Palette
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <Notification message={message} />
            <LoadingIndicator message="Processing..." active={uploading} />
            <ConfirmModal
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
