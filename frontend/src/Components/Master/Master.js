import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, {
    getMasters, updateMaster, getAcademicYears, addAcademicYear as apiAddAcademicYear, deleteAcademicYear as apiDeleteAcademicYear,
    getClasses, addClass, deleteClass as deleteClassAPI,
    getSubjects, addSubject, deleteSubject, updateSubject,
    getClassSubjects, linkClassSubject,
    getChaptersByClassAndSubject,
    getExams, addExam
} from '../../API';
import './Master.css';

export default function Master() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile');
    const [uploading, setUploading] = useState(false);

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
        if (!latestId) return alert('⚠️ No school record to update.');

        const payload = { ...form, logoUrl: form.imageUrl };
        updateMaster(latestId, payload)
            .then(() => {
                alert('✅ Settings saved successfully!');
                localStorage.setItem('schoolLogo', form.imageUrl);
                localStorage.setItem('schoolName', form.name);
                localStorage.setItem('theme', form.theme.themeName);
                window.location.reload();
            })
            .catch(err => alert('Error saving settings: ' + err.message));
    };

    // Sessions Setup States
    const [academicYear, setAcademicYear] = useState('');
    const [academicYears, setAcademicYears] = useState([]);

    useEffect(() => {
        fetchAcademicYears();
    }, []);

    const fetchAcademicYears = () => {
        getAcademicYears()
            .then(res => setAcademicYears(res.data.data))
            .catch(() => alert("❌ Failed to load academic years."));
    };

    const addAcademicYear = () => {
        if (!academicYear) return alert("Please enter an academic year.");
        apiAddAcademicYear({ year: academicYear })
            .then(() => {
                setAcademicYear('');
                fetchAcademicYears();
                alert("✅ Academic Year Added Successfully!");
            })
            .catch(() => alert("❌ Failed to add academic year"));
    };

    const deleteAcademicYear = (id) => {
        if (window.confirm("Are you sure you want to delete this academic year?")) {
            apiDeleteAcademicYear(id)
                .then(() => {
                    fetchAcademicYears();
                    alert("🗑️ Deleted");
                })
                .catch(() => alert("❌ Failed to delete"));
        }
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
    const [numExams, setNumExams] = useState(0);
    const [examNames, setExamNames] = useState([]);
    const [examsList, setExamsList] = useState([]);

    // Forms States
    const [newClassName, setNewClassName] = useState('');
    const [newSubjectName, setNewSubjectName] = useState('');
    const [editSubjectId, setEditSubjectId] = useState(null);
    const [editSubjectName, setEditSubjectName] = useState('');

    const fetchAcademicsData = async () => {
        try {
            const classRes = await getClasses();
            const sortedClasses = (classRes.data.classes || []).sort((a, b) => parseInt(a.class) - parseInt(b.class));
            setClasses(sortedClasses);

            const subjRes = await getSubjects();
            setSubjects(subjRes.data.subjects || []);

            const linkRes = await getClassSubjects();
            setClassSubjectsData(linkRes.data.data || []);

            const examRes = await getExams();
            setExamsList(examRes.data.exams || []);
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
            alert('✅ Class added successfully!');
            await fetchAcademicsData();
        } catch (err) {
            alert('❌ Failed to add class');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteClassSubmit = async (classId, name) => {
        if (!window.confirm(`Are you sure you want to delete class "${name}"?`)) return;
        setUploading(true);
        try {
            await deleteClassAPI(classId);
            alert('🗑️ Class deleted successfully!');
            await fetchAcademicsData();
        } catch (err) {
            alert('❌ Failed to delete class');
        } finally {
            setUploading(false);
        }
    };

    const handleAddSubjectSubmit = async (e) => {
        e.preventDefault();
        if (!newSubjectName.trim()) return;
        setUploading(true);
        try {
            await addSubject({ subjectName: newSubjectName.trim() });
            setNewSubjectName('');
            alert('✅ Subject added successfully!');
            await fetchAcademicsData();
        } catch (err) {
            alert('❌ Failed to add subject');
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
            alert('✅ Subject updated successfully!');
            await fetchAcademicsData();
        } catch (err) {
            alert('❌ Failed to update subject');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteSubjectSubmit = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete subject "${name}"?`)) return;
        setUploading(true);
        try {
            await deleteSubject(id);
            alert('🗑️ Subject deleted successfully!');
            await fetchAcademicsData();
        } catch (err) {
            alert('❌ Failed to delete subject');
        } finally {
            setUploading(false);
        }
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
        if (!selectedClassLink) return alert("Please select a class");
        setUploading(true);
        try {
            await linkClassSubject({
                classId: selectedClassLink,
                subjectIds: newSelectedSubjects
            });
            alert('✅ Subject-class linkages updated!');
            await fetchAcademicsData();
        } catch (err) {
            alert('❌ Failed to save subject linkages');
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
            alert('✅ Chapter added successfully!');
        } catch (err) {
            alert('❌ Failed to add chapter');
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
            alert('✅ Chapter name updated!');
        } catch (err) {
            alert('❌ Failed to update chapter');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteChapterSubmit = async (chId, name) => {
        if (!window.confirm(`Are you sure you want to delete chapter "${name}"?`)) return;
        setUploading(true);
        try {
            await api.delete(`/chapters/${selectedClassChapter}/${selectedSubjectChapter}/${chId}`);
            const res = await getChaptersByClassAndSubject(selectedClassChapter, selectedSubjectChapter);
            setChapterList(res.data.chapters || []);
            alert('🗑️ Chapter deleted!');
        } catch (err) {
            alert('❌ Failed to delete chapter');
        } finally {
            setUploading(false);
        }
    };

    const handleClassExamSelect = (classId) => {
        setSelectedClassExam(classId);
        const existingExam = examsList.find(e => e.class === classId);
        if (existingExam) {
            setNumExams(existingExam.numExams);
            setExamNames(existingExam.examNames);
        } else {
            setNumExams(0);
            setExamNames([]);
        }
    };

    const handleNumExamsChange = (e) => {
        const num = parseInt(e.target.value) || 0;
        setNumExams(num);
        setExamNames(prev => [
            ...prev.slice(0, num),
            ...Array(Math.max(0, num - prev.length)).fill('')
        ]);
    };

    const handleExamNameChange = (index, value) => {
        setExamNames(prev => {
            const updated = [...prev];
            updated[index] = value;
            return updated;
        });
    };

    const handleSaveExamsSubmit = async (e) => {
        e.preventDefault();
        if (!selectedClassExam) return alert("Select a class");
        setUploading(true);
        try {
            await addExam({
                classId: selectedClassExam,
                numExams,
                examNames
            });
            alert('✅ Exams saved successfully!');
            await fetchAcademicsData();
        } catch (err) {
            alert('❌ Failed to save exams');
        } finally {
            setUploading(false);
        }
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
            </ul>

            {/* Forms section */}
            {activeTab === 'academics' ? (
                <div className="academics-setup-flat">
                    {/* Sub navigation tabs */}
                    <div className="academics-sub-pills">
                        <button className={`academics-sub-pill ${academicsSubTab === 'classes' ? 'active' : ''}`} onClick={() => setAcademicsSubTab('classes')}>
                            <i className="fas fa-layer-group"></i>Classes
                        </button>
                        <button className={`academics-sub-pill ${academicsSubTab === 'subjects' ? 'active' : ''}`} onClick={() => setAcademicsSubTab('subjects')}>
                            <i className="fas fa-book"></i>Subjects Database
                        </button>
                        <button className={`academics-sub-pill ${academicsSubTab === 'linkage' ? 'active' : ''}`} onClick={() => setAcademicsSubTab('linkage')}>
                            <i className="fas fa-link"></i>Linkage
                        </button>
                        <button className={`academics-sub-pill ${academicsSubTab === 'chapters' ? 'active' : ''}`} onClick={() => setAcademicsSubTab('chapters')}>
                            <i className="fas fa-list-ol"></i>Chapters Syllabus
                        </button>
                        <button className={`academics-sub-pill ${academicsSubTab === 'exams' ? 'active' : ''}`} onClick={() => setAcademicsSubTab('exams')}>
                            <i className="fas fa-pen-alt"></i>Exams Setup
                        </button>
                    </div>

                    {/* SUBTAB: CLASSES */}
                    {academicsSubTab === 'classes' && (
                        <div className="setup-content-card">
                            <div className="setup-title-group">
                                <h4>Manage School Classes</h4>
                                <p>Create new classes or remove existing ones from the system list</p>
                            </div>
                            <form onSubmit={handleAddClassSubmit} className="d-flex gap-2 mb-4 w-50">
                                <input
                                    type="text"
                                    className="form-control premium-input"
                                    placeholder="Class name (e.g. Class-1, Class-2)"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    required
                                />
                                <button type="submit" className="btn btn-premium btn-premium-primary" disabled={uploading}>
                                    <i className="fas fa-plus me-1"></i>Add Class
                                </button>
                            </form>
                            <div className="row g-3">
                                {classes.map(c => (
                                    <div className="col-md-3" key={c._id}>
                                        <div className="setup-class-card">
                                            <span>{c.class}</span>
                                            <button className="btn btn-sm btn-outline-danger border-0" onClick={() => handleDeleteClassSubmit(c._id, c.class)} disabled={uploading}>
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SUBTAB: SUBJECTS DATABASE */}
                    {academicsSubTab === 'subjects' && (
                        <div className="setup-content-card">
                            <div className="setup-title-group">
                                <h4>Syllabus Subjects Database</h4>
                                <p>Manage the master repository of all subjects taught across classes</p>
                            </div>
                            <form onSubmit={handleAddSubjectSubmit} className="d-flex gap-2 mb-4 w-50">
                                <input
                                    type="text"
                                    className="form-control premium-input"
                                    placeholder="Subject name (e.g. Mathematics, Science)"
                                    value={newSubjectName}
                                    onChange={(e) => setNewSubjectName(e.target.value)}
                                    required
                                />
                                <button type="submit" className="btn btn-premium btn-premium-primary" disabled={uploading}>
                                    <i className="fas fa-plus me-1"></i>Add Subject
                                </button>
                            </form>

                            <div className="table-responsive border rounded bg-white">
                                <table className="setup-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '80px' }}>#</th>
                                            <th>Subject Name</th>
                                            <th style={{ width: '180px' }} className="text-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subjects.map((sub, index) => (
                                            <tr key={sub._id}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    {editSubjectId === sub._id ? (
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm w-50"
                                                            value={editSubjectName}
                                                            onChange={(e) => setEditSubjectName(e.target.value)}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        sub.name
                                                    )}
                                                </td>
                                                <td className="text-end">
                                                    {editSubjectId === sub._id ? (
                                                        <div className="d-flex gap-1 justify-content-end">
                                                            <button className="btn btn-sm btn-success" onClick={() => handleEditSubjectSubmit(sub._id)} disabled={uploading}>Save</button>
                                                            <button className="btn btn-sm btn-secondary" onClick={() => setEditSubjectId(null)}>Cancel</button>
                                                        </div>
                                                    ) : (
                                                        <div className="d-flex gap-1 justify-content-end">
                                                            <button className="btn btn-sm btn-outline-primary" onClick={() => { setEditSubjectId(sub._id); setEditSubjectName(sub.name); }}>
                                                                <i className="fas fa-edit"></i>
                                                            </button>
                                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteSubjectSubmit(sub._id, sub.name)} disabled={uploading}>
                                                                <i className="fas fa-trash-alt"></i>
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* SUBTAB: SUBJECT LINKAGE */}
                    {academicsSubTab === 'linkage' && (
                        <div className="setup-content-card">
                            <div className="setup-title-group">
                                <h4>Link Subjects to Class</h4>
                                <p>Map syllabus subjects to specific classes taught at school</p>
                            </div>
                            <div className="mb-4 w-50">
                                <label className="premium-label">Select Target Class</label>
                                <select className="form-select premium-input" value={selectedClassLink} onChange={(e) => handleClassLinkSelect(e.target.value)}>
                                    <option value="">-- Select Class --</option>
                                    {classes.map(c => <option key={c._id} value={c._id}>{c.class}</option>)}
                                </select>
                            </div>

                            {selectedClassLink && (
                                <form onSubmit={handleSaveLinkageSubmit}>
                                    <div className="checklist-card-grid mb-4">
                                        <p className="text-muted small mb-3">Select the active subjects taught in class <strong>{classes.find(c => c._id === selectedClassLink)?.class}</strong>:</p>
                                        <div className="row g-3">
                                            {subjects.map(subj => {
                                                const checked = newSelectedSubjects.includes(subj._id.toString());
                                                return (
                                                    <div className="col-md-4 col-sm-6" key={subj._id}>
                                                        <div className={`checklist-checkbox-item ${checked ? 'checked' : ''}`} onClick={() => handleLinkCheckboxChange(subj._id)}>
                                                            <input
                                                                className="form-check-input me-2"
                                                                type="checkbox"
                                                                checked={checked}
                                                                readOnly
                                                            />
                                                            <span className="fw-medium text-dark">{subj.name}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-premium btn-premium-primary" disabled={uploading}>
                                        {uploading ? 'Saving Linkage...' : 'Save Subject Linkage'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* SUBTAB: CHAPTERS SYLLABUS */}
                    {academicsSubTab === 'chapters' && (
                        <div className="setup-content-card">
                            <div className="setup-title-group">
                                <h4>Manage Course Chapters Syllabus</h4>
                                <p>Define chapter names for class subjects to construct question banks</p>
                            </div>
                            <div className="row g-3 mb-4">
                                <div className="col-md-6">
                                    <label className="premium-label">Class</label>
                                    <select className="form-select premium-input" value={selectedClassChapter} onChange={(e) => handleClassChapterSelect(e.target.value)}>
                                        <option value="">-- Choose Class --</option>
                                        {classes.map(c => <option key={c._id} value={c._id}>{c.class}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="premium-label">Subject</label>
                                    <select className="form-select premium-input" value={selectedSubjectChapter} onChange={(e) => handleSubjectChapterSelect(e.target.value)} disabled={!selectedClassChapter}>
                                        <option value="">-- Choose Subject --</option>
                                        {linkedSubjectsForChapter.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {selectedClassChapter && selectedSubjectChapter && (
                                <div>
                                    <form onSubmit={handleAddChapterSubmit} className="d-flex gap-2 mb-4 w-50">
                                        <input
                                            type="text"
                                            className="form-control premium-input"
                                            placeholder="Enter chapter name..."
                                            value={newChapterName}
                                            onChange={(e) => setNewChapterName(e.target.value)}
                                            required
                                        />
                                        <button type="submit" className="btn btn-premium btn-premium-primary" disabled={uploading}>
                                            <i className="fas fa-plus me-1"></i>Add Chapter
                                        </button>
                                    </form>

                                    <div className="table-responsive border rounded bg-white">
                                        <table className="setup-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '80px' }}>#</th>
                                                    <th>Chapter Name</th>
                                                    <th style={{ width: '180px' }} className="text-end">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {chapterList.length > 0 ? (
                                                    chapterList.map((ch, index) => (
                                                        <tr key={ch._id || index}>
                                                            <td>{index + 1}</td>
                                                            <td>
                                                                {editChapterId === ch._id ? (
                                                                    <input
                                                                        type="text"
                                                                        className="form-control form-control-sm w-50"
                                                                        value={editChapterName}
                                                                        onChange={(e) => setEditChapterName(e.target.value)}
                                                                        autoFocus
                                                                    />
                                                                ) : (
                                                                    ch.name
                                                                )}
                                                            </td>
                                                            <td className="text-end">
                                                                {editChapterId === ch._id ? (
                                                                    <div className="d-flex gap-1 justify-content-end">
                                                                        <button className="btn btn-sm btn-success" onClick={() => handleEditChapterSubmit(ch._id)} disabled={uploading}>Save</button>
                                                                        <button className="btn btn-sm btn-secondary" onClick={() => setEditChapterId(null)}>Cancel</button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="d-flex gap-1 justify-content-end">
                                                                        <button className="btn btn-sm btn-outline-primary" onClick={() => { setEditChapterId(ch._id); setEditChapterName(ch.name); }}>
                                                                            <i className="fas fa-edit"></i>
                                                                        </button>
                                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteChapterSubmit(ch._id, ch.name)} disabled={uploading}>
                                                                            <i className="fas fa-trash-alt"></i>
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="3" className="text-center text-muted py-4">No chapters syllabus registered yet.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {academicsSubTab === 'exams' && (
                        <div className="setup-content-card">
                            <div className="setup-title-group">
                                <h4>Configure Exams Setup</h4>
                                <p>Set up exam periods and names for specific classes</p>
                            </div>
                            <div className="mb-4 w-50">
                                <label className="premium-label">Select Class</label>
                                <select className="form-select premium-input" value={selectedClassExam} onChange={(e) => handleClassExamSelect(e.target.value)}>
                                    <option value="">-- Choose Class --</option>
                                    {classes.map(c => <option key={c._id} value={c._id}>{c.class}</option>)}
                                </select>
                            </div>

                            {selectedClassExam && (
                                <form onSubmit={handleSaveExamsSubmit}>
                                    <div className="mb-4 w-25">
                                        <label className="premium-label">Number of Exams</label>
                                        <input
                                            type="number"
                                            className="form-control premium-input"
                                            value={numExams}
                                            onChange={handleNumExamsChange}
                                            min="0"
                                            required
                                        />
                                    </div>

                                    {numExams > 0 && (
                                        <div className="row g-3 mb-4">
                                            {examNames.map((name, index) => (
                                                <div className="col-md-4" key={index}>
                                                    <label className="premium-label">Exam {index + 1} Name</label>
                                                    <input
                                                        type="text"
                                                        className="form-control premium-input"
                                                        placeholder={`e.g. Quarterly`}
                                                        value={name}
                                                        onChange={(e) => handleExamNameChange(index, e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <button type="submit" className="btn btn-premium btn-premium-primary px-4" disabled={uploading}>
                                        {uploading ? 'Saving exams...' : 'Save Exam Config'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="row g-4">
                    <div className="col-lg-8">
                        <div className="premium-card">
                            <div className="card-header-gradient d-flex align-items-center">
                                <i className="fas fa-edit me-2"></i>
                                {activeTab === 'profile' && "Update School Contact Metadata"}
                                {activeTab === 'branding' && "Modify Theme Preset Settings"}
                                {activeTab === 'sessions' && "Manage Operational Calendars"}
                            </div>

                            <div className="card-body p-4">
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
                        <div className="premium-card h-100 p-4 d-flex flex-column justify-content-between align-items-center text-center bg-white">
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
        </div>
    );
}
