import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import PrintQuestionPaper from './PrintQuestionPaper';

export default function QuestionManager() {
    const printRef = useRef(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: "QuestionPaper",
    });

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
        questionType: '',
        questionMarks: '',
        options: [],
        pairs: [],
    });

    const [userType, setUserType] = useState('');

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
                const [cRes, sRes, csRes] = await Promise.all([
                    axios.get('https://sss-server-eosin.vercel.app/getClasses'),
                    axios.get('https://sss-server-eosin.vercel.app/getSubjects'),
                    axios.get('https://sss-server-eosin.vercel.app/class-subjects'),
                ]);
                setClasses(cRes.data.classes);
                setSubjects(sRes.data.subjects);
                setClassSubjects(csRes.data.data);
            } catch (err) {
                console.error('Error loading data:', err.message);
            }
        };

        load();
    }, [navigate]);

    // Allow full access if QP Editor or Admin
    const canEdit = userType === 'qp-editor' || userType === 'admin';

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

    const onClassChange = (e) => {
        const cls = e.target.value;
        setSelectedClass(cls);
        setSelectedSubject('');
        const c = classes.find((x) => x._id === cls);
        const link = classSubjects.find((x) => x.className === c?.class);
        const linkedSubs = subjects.filter((s) => link?.subjectNames.includes(s.name));
        setFilteredSubjects(linkedSubs);
        setQuestions([]);
    };

    const onSubjectChange = async (e) => {
        const subj = e.target.value;
        setSelectedSubject(subj);
        const r = await axios.get(`https://sss-server-eosin.vercel.app/questions?class=${selectedClass}&subject=${subj}`);
        setQuestions(r.data.questions);
    };

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

    const handleAddQuestion = async () => {
        const res = await axios.post('https://sss-server-eosin.vercel.app/questions', {
            class: selectedClass,
            subject: selectedSubject,
            question: newQuestion
        });
        setQuestions(res.data);
        setNewQuestion({
            questionText: '',
            questionImage: '',
            questionType: '',
            questionMarks: '',
            options: [],
            pairs: [],
        });
    };

    const handleDelete = async idx => {
        const res = await axios.delete('https://sss-server-eosin.vercel.app/questions', {
            data: { class: selectedClass, subject: selectedSubject, index: idx }
        });
        setQuestions(res.data.questions);
    };

    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [newTemplate, setNewTemplate] = useState({
        schoolName: '',
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
            alert('Saved successfully ✅');
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Failed to save. Please try again.');
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

    const [selectedSchoolName, setSelectedSchoolName] = useState('');
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
        .filter(q =>
            q.questionText.toLowerCase().includes(searchText.toLowerCase()) &&
            (filterType === '' || q.questionType === filterType) &&
            (filterMarks === '' || q.questionMarks === filterMarks)
        )
        // Sort by marks (asc/desc)
        .sort((a, b) => {
            const marksA = parseFloat(a.questionMarks || 0);
            const marksB = parseFloat(b.questionMarks || 0);
            return sortOrder === 'asc' ? marksA - marksB : marksB - marksA;
        });

    const [previewImageUrl, setPreviewImageUrl] = useState('');

    return (
        <div className="QuestionPaper py-2">
            <div className="d-flex align-items-center">
                {uploading && <span className="badge bg-warning text-dark">Uploading...</span>}
            </div>

            <div className="SearchFilter ">
                <div className="">
                    <select onChange={onClassChange} value={selectedClass} className="form-select shadow-sm" >
                        <option value="">-- Select Class --</option>
                        {classes.map(c => (
                            <option key={c._id} value={c._id}>{c.class}</option>
                        ))}
                    </select>
                </div>

                <div className="">
                    <select onChange={onSubjectChange} value={selectedSubject} className="form-select shadow-sm" disabled={!selectedClass} >
                        <option value="">-- Select Subject --</option>
                        {filteredSubjects.map(s => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                    </select>

                </div>
                <div className=" selectAll">
                    <input type="checkbox" id="selectAllCheckbox" checked={selectedQuestions.length === questions.length}
                        onChange={(e) => {
                            if (e.target.checked) {
                                setSelectedQuestions(questions.map(q => q._id));
                            } else {
                                setSelectedQuestions([]);
                            }
                        }}
                    />
                    <label className="form-check-label" htmlFor="selectAllCheckbox">
                        Select All
                    </label>
                </div>

                <button className="btn" data-bs-toggle="modal" data-bs-target="#addQuestionModal" >
                    <i className="fas fa-plus me-2"></i>Add Question
                </button>

                <button className="btn" type="button" data-bs-toggle="collapse" data-bs-target="#addInstructionCollapse" aria-expanded="false" aria-controls="addInstructionCollapse" disabled={!canEdit} >
                    <i className="fas fa-book me-2"></i>Add Instruction Template
                </button>

                <button className="btn" data-bs-toggle="modal" data-bs-target="#selectInstructionsModal" >
                    <i className="fas fa-sliders-h me-2"></i>Select Instructions & Download
                </button>

                {/* <div className="text-end my-3">
                    <button className="btn btn-success" onClick={handlePrint}>
                        <i className="fas fa-download me-2"></i>Download Question Paper
                    </button>
                </div> */}

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
                <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content rounded-4 shadow">

                        <div className="modal-header">
                            <h5 className="modal-title" id="addQuestionModalLabel">
                                <i className="fas fa-edit me-2 text-primary"></i>New Question
                            </h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                        </div>

                        <div className="modal-body">
                            {/* Question Text + Marks + Image */}
                            <div className="row align-items-center mb-3">
                                {/* Question Text */}
                                <div className="col-md-7">
                                    <input
                                        type="text"
                                        className="form-control shadow-sm"
                                        placeholder="Enter question text"
                                        value={newQuestion.questionText}
                                        onChange={e => setNewQuestion(q => ({ ...q, questionText: e.target.value }))}
                                    />
                                </div>

                                {/* Marks */}
                                <div className="col-md-2">
                                    <input
                                        className="form-control shadow-sm"
                                        placeholder="Marks"
                                        value={newQuestion.questionMarks}
                                        onChange={e => setNewQuestion(q => ({ ...q, questionMarks: e.target.value }))}
                                    />
                                </div>

                                {/* Upload Image */}
                                <div className="col-md-3">
                                    <div className="input-group">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="form-control"
                                            title="Upload Question Image"
                                            onChange={async e => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const url = await uploadToImgBB(file);
                                                    setNewQuestion(q => ({ ...q, questionImage: url }));
                                                }
                                            }}
                                        />
                                    </div>

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
                                                className="btn btn-outline-danger btn-sm"
                                                onClick={() => setNewQuestion(q => ({ ...q, questionImage: '' }))}
                                            >
                                                <i className="fas fa-trash-alt me-1"></i>Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>


                            {/* Question Type Dropdown */}
                            <div className="mb-3">
                                <select
                                    className="form-select w-auto shadow-sm"
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
                                    <option value="">-- Select Question Type --</option>
                                    <option value="MCQ">MCQ</option>
                                    <option value="Descriptive">Descriptive</option>
                                    <option value="Match">Match the Following</option>
                                </select>
                            </div>

                            {/* MCQ Options */}
                            {newQuestion.questionType === 'MCQ' && (
                                <>
                                    <button
                                        className="btn btn-outline-primary btn-sm mb-3"
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
                                                            className="btn btn-outline-danger btn-sm"
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
                                        className="btn btn-outline-primary btn-sm mb-3"
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
                                                                className="btn btn-outline-danger btn-sm"
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
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-success"
                                onClick={handleAddQuestion}
                            >
                                <i className="fas fa-save me-2"></i>Save
                            </button>
                        </div>

                    </div>
                </div>
            </div>

            <div className="collapse" id="addInstructionCollapse">
                <div className="card p-3 mb-4 shadow-sm">
                    <h5 className="mb-3">Instruction Template</h5>

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
            </div>

            <div className="modal fade" id="selectInstructionsModal" tabIndex="-1">
                <div className="modal-dialog modal-lg">
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
                            <button className="btn btn-primary" onClick={handlePrint} disabled={!canEdit}>
                                <i className="fas fa-download me-1"></i>Download
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {questions.length > 0 && (
                <>
                    <h5 className="mb-4 border-bottom pb-2 w-100 text-dark">
                        <i className="fas fa-list me-2 text-primary"></i>
                        All Questions
                        <span className="badge bg-secondary ms-2">{filteredAndSortedQuestions.length}</span>
                    </h5>

                    <div className="row mb-4">
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
                        {filteredAndSortedQuestions.map((q, i) => (
                            <div key={i} className="border rounded p-4 mb-4 bg-white position-relative shadow-sm">
                                {/* Checkbox */}
                                <div className="position-absolute top-0 start-0 m-2">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={selectedQuestions.includes(q._id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedQuestions(prev => [...prev, q._id]);
                                            } else {
                                                setSelectedQuestions(prev => prev.filter(id => id !== q._id));
                                            }
                                        }}
                                    />
                                </div>

                                {/* Delete Button */}
                                <div className="position-absolute top-0 end-0 m-2">
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(i)} disabled={!canEdit}>
                                        <i className="fas fa-trash-alt"></i>
                                    </button>
                                </div>

                                {/* Question Content */}
                                <div className="mb-3">
                                    <h6 className="mb-2"><strong>Q{i + 1}:</strong> {q.questionText}</h6>
                                    <p className="mb-2"><strong>Type:</strong> <span className="badge bg-info">{q.questionType}</span></p>
                                    {q.questionImage && (
                                        <div className="text-end mb-2">
                                            <img
                                                src={q.questionImage}
                                                alt="Question"
                                                className="img-thumbnail"
                                                style={{ width: 80, height: 80, objectFit: 'cover' }}
                                            />
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

                                {/* Descriptive */}
                                {q.questionType === 'Descriptive' && (
                                    <div className="bg-light p-3 rounded border mt-2">
                                        <em>This is a descriptive question. Students are expected to write a detailed answer.</em>
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

                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Preview Collapse Area */}
            <div className="d-none">
                <PrintQuestionPaper
                    ref={printRef}
                    questions={questions}
                    selectedQuestions={selectedQuestions}
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
        </div>
    );
}