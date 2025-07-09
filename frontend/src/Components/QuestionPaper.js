import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import PrintQuestionPaper from './PrintQuestionPaper';

export default function QuestionManager() {
    const printRef = useRef(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle:  "QuestionPaper",
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
        options: [],
        pairs: [],
    });

    useEffect(() => {
        if (!localStorage.getItem('token')) navigate('/login');
        const load = async () => {
            const [cRes, sRes, csRes] = await Promise.all([
                axios.get('https://sss-server-eosin.vercel.app/getClasses'),
                axios.get('https://sss-server-eosin.vercel.app/getSubjects'),
                axios.get('https://sss-server-eosin.vercel.app/class-subjects'),
            ]);
            setClasses(cRes.data.classes);
            setSubjects(sRes.data.subjects);
            setClassSubjects(csRes.data.data);
        };
        load();
    }, [navigate]);

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
        setNewQuestion({ questionText: '', questionImage: '', questionType: '', options: [], pairs: [] });
    };

    const handleDelete = async idx => {
        const res = await axios.delete('https://sss-server-eosin.vercel.app/questions', {
            data: { class: selectedClass, subject: selectedSubject, index: idx }
        });
        setQuestions(res.data.questions);
    };

    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const orderedQuestions = [...questions].sort((a, b) => {
        const aSelected = selectedQuestions.includes(a._id);
        const bSelected = selectedQuestions.includes(b._id);
        return bSelected - aSelected; // selected ones first
    });


    return (
        <div className="QuestionPaper py-2">
            <div className="d-flex align-items-center">
                {uploading && <span className="badge bg-warning text-dark">Uploading...</span>}
            </div>

            <div className="SearchFilter ">
                <div className="col-md-2 ">
                    <select
                        onChange={onClassChange}
                        value={selectedClass}
                        className="form-select shadow-sm"
                    >
                        <option value="">-- Select Class --</option>
                        {classes.map(c => (
                            <option key={c._id} value={c._id}>{c.class}</option>
                        ))}
                    </select>
                </div>

                <div className="col-md-3">
                    <select
                        onChange={onSubjectChange}
                        value={selectedSubject}
                        className="form-select shadow-sm"
                        disabled={!selectedClass}
                    >
                        <option value="">-- Select Subject --</option>
                        {filteredSubjects.map(s => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                    </select>

                </div>
                <div className=" selectAll">
                    <input
                        type="checkbox"
                        id="selectAllCheckbox"
                        checked={selectedQuestions.length === questions.length}
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

                <button
                    className="btn"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#addQuestionCollapse"
                    aria-expanded="false"
                    aria-controls="addQuestionCollapse"
                >
                    <i className="fas fa-plus-circle me-2"></i>Add Question
                </button>

                <div className="text-end my-3">
                    <button className="btn btn-success" onClick={handlePrint}>
                        <i className="fas fa-download me-2"></i>Download Question Paper
                    </button>
                </div>

            </div>

            {selectedClass && selectedSubject && (
                <div className="collapse" id="addQuestionCollapse">
                    <div className="card p-3 mb-4 shadow">
                        {/* rest of your question form stays unchanged */}
                        <h5 className="mb-3"><i className="fas fa-edit me-2"></i>New Question</h5>

                        <div className="row mb-3">
                            <div className="col-md-9">
                                <textarea
                                    className="form-control shadow-sm"
                                    placeholder="Enter question text"
                                    value={newQuestion.questionText}
                                    onChange={e => setNewQuestion(q => ({ ...q, questionText: e.target.value }))}
                                />
                            </div>
                            <div className="col-md-3">
                                <input type="file" accept="image/*" className="form-control"
                                    onChange={async e => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const url = await uploadToImgBB(file);
                                            setNewQuestion(q => ({ ...q, questionImage: url }));
                                        }
                                    }}
                                />
                                {newQuestion.questionImage && (
                                    <img src={newQuestion.questionImage} alt="Preview" className="img-thumbnail mt-2" />
                                )}
                            </div>
                        </div>

                        <select className="form-select shadow-sm mb-3"
                            value={newQuestion.questionType}
                            onChange={e => setNewQuestion(q => ({ ...q, questionType: e.target.value, options: [], pairs: [] }))}
                        >
                            <option value="">-- Select Question Type --</option>
                            <option value="MCQ">MCQ</option>
                            <option value="Descriptive">Descriptive</option>
                            <option value="Match">Match the Following</option>
                        </select>

                        {/* MCQ Options */}
                        {newQuestion.questionType === 'MCQ' && (
                            <>
                                <button className="btn btn-outline-primary btn-sm mb-3" onClick={addOption}>
                                    <i className="fas fa-plus me-1"></i>Add Option
                                </button>
                                <div className="row">
                                    {newQuestion.options.map((opt, i) => (
                                        <div className="col-md-4 mb-3" key={i}>
                                            <input className="form-control mb-2" placeholder="Option text"
                                                value={opt.text} onChange={e => updateOption(i, 'text', e.target.value)} />
                                            <input type="file" className="form-control"
                                                onChange={async e => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const url = await uploadToImgBB(file);
                                                        updateOption(i, 'imageUrl', url);
                                                    }
                                                }} />
                                            {opt.imageUrl && <img alt="..." src={opt.imageUrl} className="img-thumbnail mt-2" />}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Match the Following */}
                        {newQuestion.questionType === 'Match' && (
                            <>
                                <button className="btn btn-outline-primary btn-sm mb-3" onClick={addPair}>
                                    <i className="fas fa-plus me-1"></i>Add Pair
                                </button>
                                {newQuestion.pairs.map((p, i) => (
                                    <div className="row mb-3" key={i}>
                                        {['left', 'right'].map(side => (
                                            <div className="col-md-6" key={side}>
                                                <input className="form-control mb-2" placeholder={`${side} text`}
                                                    value={p[`${side}Text`]} onChange={e => updatePair(i, side, 'Text', e.target.value)} />
                                                <input type="file" className="form-control"
                                                    onChange={async e => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            const url = await uploadToImgBB(file);
                                                            updatePair(i, side, 'Image', url);
                                                        }
                                                    }} />
                                                {p[`${side}Image`] && <img alt="..." src={p[`${side}Image`]} className="img-thumbnail mt-2" />}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </>
                        )}

                        <button className="btn btn-success" onClick={handleAddQuestion}>
                            <i className="fas fa-save me-2"></i>Save Question
                        </button>
                    </div>
                </div>

            )}

            {/* Preview Collapse Area */}
            <div className="d-none">
                <PrintQuestionPaper
                    ref={printRef}
                    questions={questions}
                    selectedQuestions={selectedQuestions}
                />
            </div>

            {questions.length > 0 && (
                <>
                    <h5 className="mb-1"><i className="fas fa-list me-2"></i>All Questions</h5>

                    {orderedQuestions.map((q, i) => (
                        <div key={i} className="card shadow-sm border-0 position-relative">

                            {/* Select Checkbox */}
                            <div className="form-check position-absolute top-0 start-0 m-2">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
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
                            <button
                                className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2"
                                onClick={() => handleDelete(i)}
                            >
                                <i className="fas fa-trash-alt"></i>
                            </button>

                            <div className="card-body">

                                {/* Question Text & Image */}
                                <div className="row mb-2 ms-2">
                                    <div className="col-md-9">
                                        <p className="mb-1"><strong>Question:</strong> {q.questionText}</p>
                                        <p className="mb-1"><strong>Type:</strong> <span className="badge p-2 bg-info">{q.questionType}</span></p>
                                    </div>
                                    {q.questionImage && (
                                        <div className="col-md-3 text-end">
                                            <img
                                                src={q.questionImage}
                                                alt="Q"
                                                className="img-thumbnail rounded shadow-sm"
                                                style={{ maxHeight: 100, objectFit: 'cover' }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* MCQ Options */}
                                {q.questionType === 'MCQ' && (
                                    <div className="row g-3">
                                        {q.options.map((opt, idx) => (
                                            <div key={idx} className="col-12">
                                                <div className="card border rounded shadow-sm p-2 d-flex flex-row align-items-center">
                                                    <i className="far fa-dot-circle text-primary me-3 fs-5"></i>
                                                    <div className="flex-grow-1 d-flex align-items-center justify-content-between">
                                                        <p className="mb-1">{opt.text}</p>
                                                        {opt.imageUrl && (
                                                            <img
                                                                src={opt.imageUrl}
                                                                alt="Option"
                                                                className="img-thumbnail mt-2"
                                                                style={{ height: 80, maxWidth: '100%', objectFit: 'cover' }}
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
                                    <div className="row g-3">
                                        {q.pairs.map((pair, idx) => (
                                            <div key={idx} className="col-12">
                                                <div className="d-flex justify-content-between align-items-start border rounded shadow-sm p-3 bg-light">
                                                    <div>
                                                        <strong>{pair.leftText}</strong>
                                                        {pair.leftImage && (
                                                            <img
                                                                src={pair.leftImage}
                                                                alt="Left"
                                                                className="img-thumbnail ms-2"
                                                                style={{ height: 60, objectFit: 'cover' }}
                                                            />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <strong>{pair.rightText}</strong>
                                                        {pair.rightImage && (
                                                            <img
                                                                src={pair.rightImage}
                                                                alt="Right"
                                                                className="img-thumbnail ms-2"
                                                                style={{ height: 60, objectFit: 'cover' }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                            </div>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}
