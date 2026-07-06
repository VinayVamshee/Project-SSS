import axios from 'axios';

// ─── Base Configuration ───────────────────────────────────────────────────────
// Change this one constant to switch between local and production environments
const BASE_URL = process.env.REACT_APP_API_URL;

// Pre-configured axios instance — all calls go through here
const api = axios.create({ baseURL: BASE_URL });

// ─── Multi-Tenant Interceptor ─────────────────────────────────────────────────
// Automatically attaches X-Tenant-Slug and Authorization headers on every request.
api.interceptors.request.use((config) => {
    const slug = localStorage.getItem('schoolSlug');
    const token = localStorage.getItem('token');

    if (slug) config.headers['X-Tenant-Slug'] = slug;
    if (token) config.headers['Authorization'] = `Bearer ${token}`;

    return config;
});

// ─── Legacy Response Mapper Interceptor ───────────────────────────────────────
// Translates the new clean EAV/ObjectId database structures back into the flat formats 
// that the legacy frontend pages (Overview, Payments, Results, QuestionPaper) expect.
api.interceptors.response.use((response) => {
    const url = response.config.url || '';

    // 1. Map student list response: enrollments -> academicYears, and EAV -> flat attributes
    if (url.includes('/getStudent')) {
        const students = response.data.students || [];
        response.data.students = students.map(s => {
            const legacyStudent = {
                ...s,
                academicYears: (s.enrollments || []).map(e => ({
                    academicYear: e.academicYear?.name || e.academicYear?.toString() || "",
                    class: e.class,
                    status: e.status
                })),
                additionalInfo: []
            };
            if (s.dynamicFields && Array.isArray(s.dynamicFields)) {
                s.dynamicFields.forEach(df => {
                    const key = df.fieldId?.fieldKey;
                    const name = df.fieldId?.fieldName;
                    if (name) {
                        legacyStudent.additionalInfo.push({ key: name, value: df.value });
                    }
                    if (key) {
                        if (key === 'admissionNo') legacyStudent.AdmissionNo = df.value;
                        else if (key === 'freeStudent') legacyStudent.FreeStud = df.value;
                        else if (key === 'caste') legacyStudent.Caste = df.value;
                        else if (key === 'casteHindi') legacyStudent.CasteHindi = df.value;
                        else legacyStudent[key] = df.value;
                    }
                });
            }
            return legacyStudent;
        });
    }

    // 2. Map payments / getFees list response: academicYear Object -> Name String
    if (url.includes('/getFees') || url.includes('/payments')) {
        const data = response.data;
        if (Array.isArray(data)) {
            response.data = data.map(item => ({
                ...item,
                academicYears: (item.academicYears || []).map(ay => ({
                    ...ay,
                    academicYear: ay.academicYear?.name || ay.academicYear?.year || ay.academicYear?.toString() || ""
                }))
            }));
        }
    }

    // 3. Map class fees response: academicYear Object -> Name String
    if (url.includes('/class-fees')) {
        const data = response.data;
        if (Array.isArray(data)) {
            response.data = data.map(item => ({
                ...item,
                academicYear: item.academicYear?.name || item.academicYear?.year || item.academicYear?.toString() || ""
            }));
        }
    }

    // 4. Map academic years response: name -> year (for legacy dropdown selection compatibility)
    if (url.includes('/GetAcademicYear')) {
        const years = response.data.data || [];
        response.data.data = years.map(y => ({
            ...y,
            year: y.name || y.year || ""
        }));
    }

    return response;
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const login = (credentials) => api.post('/login', credentials);
export const register = (userData) => api.post('/register', userData);
export const devCreateUser = (userData) => api.post('/dev/users', userData);
export const devGetUsers = (schoolId) => api.get('/dev/users', { params: { schoolId } });
export const devUpdateUser = (id, userData) => api.put(`/dev/users/${id}`, userData);

// ─── School / Masters ─────────────────────────────────────────────────────────
export const getMasters = () => api.get('/masters');
export const getMasterById = (id) => api.get(`/masters/${id}`);
export const getAllMasters = () => api.get('/get-all-masters');
export const createMaster = (payload) => api.post('/masters', payload);
export const updateMaster = (id, payload) => api.put(`/masters/${id}`, payload);
export const setMasterInUse = (id) => api.put(`/masters/set-in-use/${id}`);
export const deleteMaster = (id) => api.delete(`/masters/${id}`);

// ─── Academic Years ───────────────────────────────────────────────────────────
export const getAcademicYears = () => api.get('/GetAcademicYear');
export const addAcademicYear = (payload) => api.post('/AddAcademicYear', payload);
export const deleteAcademicYear = (id) => api.delete(`/DeleteAcademicYear/${id}`);

// ─── Classes ──────────────────────────────────────────────────────────────────
export const getClasses = () => api.get('/getClasses');
export const addClass = (payload) => api.post('/AddNewClass', payload);
export const deleteClass = (id) => api.delete(`/deleteClass/${id}`);

// ─── Subjects ─────────────────────────────────────────────────────────────────
export const getSubjects = () => api.get('/getSubjects');
export const addSubject = (payload) => api.post('/AddNewSubject', payload);
export const updateSubject = (id, payload) => api.put(`/updateSubject/${id}`, payload);
export const deleteSubject = (id) => api.delete(`/deleteSubject/${id}`);

// ─── Class-Subject Links ──────────────────────────────────────────────────────
export const getClassSubjects = () => api.get('/class-subjects');
export const linkClassSubject = (payload) => api.post('/ClassSubjectLink', payload);

// ─── Chapters ─────────────────────────────────────────────────────────────────
export const getAllChapters = () => api.get('/chapters');
export const getChaptersByClassAndSubject = (classId, subjectId) =>
    api.get(`/chapters/${classId}/${subjectId}`);
export const addChapter = (payload) => api.post('/chapters', payload);
export const updateChapter = (classId, subjectId, chapterId, payload) =>
    api.put(`/chapters/${classId}/${subjectId}/${chapterId}`, payload);
export const deleteChapter = (classId, subjectId, chapterId) =>
    api.delete(`/chapters/${classId}/${subjectId}/${chapterId}`);

// ─── Exams ────────────────────────────────────────────────────────────────────
export const getExams = () => api.get('/getExams');
export const getExamsByClass = (className) => api.get(`/getExams/${className}`);
export const addExam = (payload) => api.post('/addExams', payload);

// ─── Students ─────────────────────────────────────────────────────────────────
export const getStudents = () => api.get('/getStudent');
export const addStudent = (payload) => api.post('/addStudent', payload);
export const updateStudent = (id, payload) => api.put(`/updateStudent/${id}`, payload);
export const updateAcademicYearStatus = (studentId, payload) =>
    api.put(`/updateAcademicYearStatus/${studentId}`, payload);
export const passStudentsTo = (payload) => api.post('/pass-students-to', payload);
export const dropAcademicYear = (payload) => api.post('/drop-academic-year', payload);

// ─── EAV Field Definitions (PersonalInformationList) ─────────────────────────
export const getFieldDefinitions = () => api.get('/GetFieldDefinitions');
export const addFieldDefinition = (payload) => api.post('/AddFieldDefinition', payload);
export const updateFieldDefinition = (id, payload) => api.put(`/UpdateFieldDefinition/${id}`, payload);
export const deleteFieldDefinition = (id) => api.delete(`/DeleteFieldDefinition/${id}`);
// Legacy aliases
export const getPersonalInformationList = () => api.get('/GetPersonalInformationList');
export const addPersonalInformation = (payload) => api.post('/AddAdditionalPersonalInformation', payload);
export const deletePersonalInfo = (id) => api.delete(`/DeletePersonalInfo/${id}`);

// ─── Payments & Fees ──────────────────────────────────────────────────────────
export const getFees = () => api.get('/getFees');
export const getFeesByStudent = (studentId, academicYear) =>
    api.get(`/getFees?studentId=${studentId}&academicYear=${academicYear}`);
export const saveFees = (payload) => api.post('/saveFees', payload);
export const getClassFees = () => api.get('/class-fees');
export const saveClassFees = (payload) => api.post('/class-fees', payload);
export const copyClassFees = (payload) => api.post('/copy-class-fees', payload);
export const getReceiptBook = () => api.get('/receiptBook');
export const incrementReceipt = () => api.patch('/incrementReceipt');
export const updateReceiptBook = (payload) => api.post('/updateReceiptBook', payload);

// ─── Marks & Results ──────────────────────────────────────────────────────────
export const getMarks = (params) => api.get('/get-marks', { params });
export const submitMarks = (payload) => api.post('/submit-marks', payload);

// ─── Question Paper ───────────────────────────────────────────────────────────
export const getQuestions = () => api.get('/questions');
export const getQuestionsByFilter = (cls, subj, chap) =>
    api.get(`/questions?class=${cls}&subject=${subj}&chapter=${chap}`);
export const addQuestion = (payload) => api.post('/questions', payload);
export const getAllTemplates = () => api.get('/get-all-templates');
export const saveTemplate = (payload) => api.post('/save-template', payload);
export const deleteTemplate = (id) => api.delete(`/delete-template/${id}`);

// ─── Default export (raw axios instance for one-off calls) ───────────────────
export default api;
