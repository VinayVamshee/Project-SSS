import { getClasses, getClassSubjects, getSubjects, getExams, getChaptersByClassAndSubject } from '../../API';
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import './Classes.css';

export default function Classes() {
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        const storedUserType = localStorage.getItem("userType");
        const isDev = localStorage.getItem("isDev") === "true";

        if (!token || (!storedUserType && !isDev)) {
            navigate("/login");
        } else {
            if (storedUserType !== "admin" && !isDev) {
                alert("❌ Access Denied: Classes & Subjects management is restricted to Administrators only.");
                navigate("/");
            }
        }
    }, [navigate]);

    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [classSubjectsData, setClassSubjectsData] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [filteredSubjects, setFilteredSubjects] = useState([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [chapterList, setChapterList] = useState([]);
    const [selectedChapterSubject, setSelectedChapterSubject] = useState(null);
    const [examsData, setExamsData] = useState([]);

    const fetchClassesAndSubjects = async () => {
        try {
            const classResponse = await getClasses();
            const sortedClasses = (classResponse.data.classes || []).sort(
                (a, b) => parseInt(a.class) - parseInt(b.class)
            );
            setClasses(sortedClasses);

            const response = await getClassSubjects();
            setClassSubjectsData(response.data.data || []);

            const subjectResponse = await getSubjects();
            setSubjects(subjectResponse.data.subjects || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    const fetchExamsData = async () => {
        try {
            const response = await getExams();
            const sortedExams = response.data.exams.sort((a, b) => parseInt(a.class) - parseInt(b.class));
            setExamsData(sortedExams || []);
        } catch (error) {
            console.error('Error fetching exams data:', error);
        }
    };

    useEffect(() => {
        fetchClassesAndSubjects();
        fetchExamsData();
    }, []);

    const handleClassClick = (classId) => {
        setSelectedClass(classId);
        setSelectedChapterSubject(null);
        setChapterList([]);
        setIsDrawerOpen(false);

        const classData = classSubjectsData.find(item => {
            const id = (item.classId?._id || item.classId || "").toString();
            return id === classId.toString();
        });

        if (!classData) {
            setFilteredSubjects([]);
            return;
        }

        const resolvedSubjects = subjects.filter(subj =>
            classData.subjectIds.some(id =>
                (id?._id || id || "").toString() === subj._id.toString()
            )
        );
        setFilteredSubjects(resolvedSubjects);
    };

    const handleSubjectClick = async (subject) => {
        setSelectedChapterSubject(subject);
        setIsDrawerOpen(true);
        try {
            const res = await getChaptersByClassAndSubject(selectedClass, subject._id);
            setChapterList(res.data.chapters || []);
        } catch (err) {
            console.error("Error fetching chapters:", err);
            setChapterList([]);
        }
    };

    return (
        <div className="ClassesPage">

            {/* 2-Column Layout */}
            <div className="ClassesGrid">
                {/* Left Sidebar for Class Selection */}
                <div className="SidebarCard">
                    <h4>Classes</h4>
                    <div className="ClassList">
                        {classes.length > 0 ? (
                            classes.map((cls) => (
                                <button
                                    key={cls._id}
                                    className={`ClassListItem ${selectedClass === cls._id ? 'active' : ''}`}
                                    onClick={() => handleClassClick(cls._id)}
                                >
                                    <span>{cls.class}</span>
                                    <i className="fa-solid fa-chevron-right"></i>
                                </button>
                            ))
                        ) : (
                            <p className="text-muted small text-center my-3">No classes registered</p>
                        )}
                    </div>
                </div>

                {/* Right Panel Main Content */}
                <div className="ContentPanel">
                    {selectedClass ? (
                        <>
                            {/* Linked Subjects Card (View Only - Full Width) */}
                            <div className="ClassDetailsCard">
                                <div className="CardHeader">
                                    <h3>Syllabus Subjects</h3>
                                    <span className="CardHeaderBadge">
                                        Class: {classes.find(c => c._id === selectedClass)?.class || "Unknown"}
                                    </span>
                                </div>
                                <div className="CardBody">
                                    <table className="MinimalTable">
                                        <thead>
                                            <tr>
                                                <th style={{ width: "80px" }}>S.No</th>
                                                <th>Subject Name</th>
                                                <th style={{ width: "200px" }} className="text-end">Chapters Syllabus</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSubjects.length > 0 ? (
                                                filteredSubjects.map((subject, index) => (
                                                    <tr key={subject._id}>
                                                        <td>{index + 1}</td>
                                                        <td>
                                                            <strong>{subject.name}</strong>
                                                        </td>
                                                        <td className="text-end">
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-primary btn-sm"
                                                                onClick={() => handleSubjectClick(subject)}
                                                            >
                                                                <i className="fa-solid fa-book-open me-2"></i>Chapters
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="3" className="text-center text-muted py-4">
                                                        No subjects linked to this class.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Configured Exams Card (View Only) */}
                            <div className="ClassDetailsCard">
                                <div className="CardHeader">
                                    <h3>Configured Exams</h3>
                                </div>
                                <div className="CardBody">
                                    {examsData.length > 0 &&
                                        examsData.some(exam => exam.class === selectedClass) ? (
                                        <table className="MinimalTable">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: "80px" }}>S.No</th>
                                                    <th>Exam Name</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {examsData
                                                    .filter((exam) => exam.class === selectedClass)
                                                    .flatMap((exam, index) =>
                                                        exam.examNames.map((examName, idx) => (
                                                            <tr key={`${index}-${idx}`}>
                                                                <td>{idx + 1}</td>
                                                                <td>{examName}</td>
                                                            </tr>
                                                        ))
                                                    )}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="text-center text-muted py-4">
                                            <i className="fa-solid fa-circle-info mb-2 fs-3 text-warning"></i>
                                            <p className="mb-0">No exams configured for this class.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Default onboarding card */
                        <div className="OnboardingCard">
                            <i className="fa-solid fa-graduation-cap"></i>
                            <h4>Academics Syllabus</h4>
                            <p className="mb-0">Choose a class from the list on the left to inspect its syllabus subjects, chapters, and exams.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Slide-over Chapters Drawer Backdrop */}
            <div className={`DrawerOverlay ${isDrawerOpen ? 'show' : ''}`} onClick={() => setIsDrawerOpen(false)}></div>

            {/* Slide-over Chapters Drawer Panel */}
            <div className={`ChapterDrawer ${isDrawerOpen ? 'open' : ''}`}>
                <div className="DrawerHeader">
                    <div>
                        <h4>Chapters Syllabus</h4>
                        <p>{selectedChapterSubject?.name || "Unknown"} (Class {classes.find(c => c._id === selectedClass)?.class || "Unknown"})</p>
                    </div>
                    <button className="DrawerCloseBtn" onClick={() => setIsDrawerOpen(false)}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="DrawerBody">
                    {chapterList.length > 0 ? (
                        chapterList.map((ch, idx) => (
                            <div className="ChapterItemCard" key={ch._id || idx}>
                                <div className="ChapterItemNum">{idx + 1}</div>
                                <div className="ChapterItemText">{ch.name}</div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-muted py-5">
                            <i className="fa-solid fa-folder-open fs-2 mb-2 text-secondary"></i>
                            <p className="small mb-0">No chapters syllabus defined for this subject.</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
