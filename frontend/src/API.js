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
                    const key = df.fieldId?.key || df.fieldId?.fieldKey;
                    const name = df.fieldId?.label || df.fieldId?.fieldName;
                    if (name) {
                        legacyStudent.additionalInfo.push({ key: name, value: df.value });
                    }
                    if (key) {
                        const lowerKey = key.toLowerCase();
                        if (lowerKey === 'admissionno' || lowerKey === 'admissionnumber') {
                            legacyStudent.AdmissionNo = df.value;
                            legacyStudent.admissionNo = df.value;
                        } else if (lowerKey === 'freestudent' || lowerKey === 'freestud') {
                            legacyStudent.FreeStud = df.value;
                            legacyStudent.freeStudent = df.value;
                        } else if (lowerKey === 'caste') {
                            legacyStudent.Caste = df.value;
                            legacyStudent.caste = df.value;
                        } else if (lowerKey === 'castehindi') {
                            legacyStudent.CasteHindi = df.value;
                            legacyStudent.casteHindi = df.value;
                        } else if (lowerKey === 'gender') {
                            legacyStudent.gender = df.value;
                        } else if (lowerKey === 'dateofbirth' || lowerKey === 'dob') {
                            legacyStudent.dob = df.value;
                        }
                        legacyStudent[lowerKey] = df.value;
                    }
                });
            }
            return legacyStudent;
        });
    }

    // 2. Map payments / getFees list response: academicYear Object -> Name String and components -> flat properties
    if (url.includes('/getFees') || url.includes('/payments')) {
        const data = response.data;
        const mapPaymentItem = (item) => {
            const mappedItem = { ...item };
            if (item.academicYears && Array.isArray(item.academicYears)) {
                mappedItem.academicYears = item.academicYears.map(ay => ({
                    ...ay,
                    academicYear: ay.academicYear?.name || ay.academicYear?.year || ay.academicYear?.toString() || "",
                    payments: (ay.payments || []).map(p => {
                        const flatPayment = { ...p };
                        if (p.components && Array.isArray(p.components)) {
                            p.components.forEach(comp => {
                                const key = comp.fieldId?.key || comp.fieldId?.fieldKey;
                                if (key) {
                                    flatPayment[key.toLowerCase()] = comp.amount;
                                }
                            });
                        }
                        return flatPayment;
                    })
                }));
            }
            if (item.payments && Array.isArray(item.payments)) {
                mappedItem.payments = item.payments.map(p => {
                    const flatPayment = { ...p };
                    if (p.components && Array.isArray(p.components)) {
                        p.components.forEach(comp => {
                            const key = comp.fieldId?.key || comp.fieldId?.fieldKey;
                            if (key) {
                                flatPayment[key.toLowerCase()] = comp.amount;
                            }
                        });
                    }
                    return flatPayment;
                });
            }
            return mappedItem;
        };

        if (Array.isArray(data)) {
            response.data = data.map(mapPaymentItem);
        } else if (data && typeof data === 'object') {
            response.data = mapPaymentItem(data);
        }
    }

    // 3. Map class fees response: academicYear Object -> Name String and fees -> flat properties
    if (url.includes('/class-fees')) {
        const data = response.data;
        if (Array.isArray(data)) {
            response.data = data.map(item => ({
                ...item,
                academicYear: item.academicYear?.name || item.academicYear?.year || item.academicYear?.toString() || "",
                classes: (item.classes || []).map(c => {
                    const flatClassFee = { ...c };
                    if (c.fees && Array.isArray(c.fees)) {
                        c.fees.forEach(f => {
                            const key = f.fieldId?.key || f.fieldId?.fieldKey;
                            if (key) {
                                flatClassFee[key.toLowerCase()] = f.amount;
                            }
                        });
                    }
                    return flatClassFee;
                })
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

    // 5. Map field registry responses to inject legacy fieldKey, fieldName, and fieldType aliases
    if (url.includes('/api/metadata/fields')) {
        const fields = response.data?.data || [];
        if (Array.isArray(fields)) {
            fields.forEach(f => {
                f.fieldKey = f.key;
                f.fieldName = f.label;
                f.fieldType = f.type;
            });
        } else if (response.data && typeof response.data === 'object') {
            const f = response.data;
            if (f.data) {
                f.data.fieldKey = f.data.key;
                f.data.fieldName = f.data.label;
                f.data.fieldType = f.data.type;
            }
            f.fieldKey = f.key;
            f.fieldName = f.label;
            f.fieldType = f.type;
        }
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
export const getClassSubjects = () => api.get('/classsubjectlinks');
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
export const bulkImportStudents = (payload) => api.post('/dev/bulk-import-students', payload);


// ─── EAV Field Definitions (FieldRegistry) ─────────────────────────
export const getFieldDefinitions = () => api.get('/api/metadata/fields');
export const getFieldDefinition = (id) => api.get(`/api/metadata/fields/${id}`);
export const addFieldDefinition = (payload) => api.post('/api/metadata/fields', payload);
export const updateFieldDefinition = (id, payload) => api.put(`/api/metadata/fields/${id}`, payload);
export const deleteFieldDefinition = (id) => api.delete(`/api/metadata/fields/${id}`);
export const archiveFieldDefinition = (id) => api.patch(`/api/metadata/fields/${id}/archive`);
export const activateFieldDefinition = (id) => api.patch(`/api/metadata/fields/${id}/activate`);

// Legacy aliases for EAV
export const getPersonalInformationList = () => api.get('/api/metadata/fields');
export const addPersonalInformation = (payload) => api.post('/api/metadata/fields', payload);
export const deletePersonalInfo = (id) => api.delete(`/api/metadata/fields/${id}`);

// ─── Entity Registry ─────────────────────────────────────────────────────────
export const getEntities = () => api.get('/api/metadata/entities');
export const getEntity = (id) => api.get(`/api/metadata/entities/${id}`);
export const createEntity = (payload) => api.post('/api/metadata/entities', payload);
export const updateEntity = (id, payload) => api.put(`/api/metadata/entities/${id}`, payload);
export const archiveEntity = (id) => api.patch(`/api/metadata/entities/${id}/archive`);
export const activateEntity = (id) => api.patch(`/api/metadata/entities/${id}/activate`);
export const deleteEntity = (id) => api.delete(`/api/metadata/entities/${id}`);

export const lookup = (field, search = "") => api.get("/api/metadata/lookup", { params: { field, search } });

// ─── Templates ───────────────────────────────────────────────────────────────
export const getTemplates = () => api.get('/api/metadata/templates');
export const getTemplate = (id) => api.get(`/api/metadata/templates/${id}`);
export const getTemplateForm = (id) => api.get(`/api/metadata/templates/${id}/form`);
export const createTemplate = (payload) => api.post('/api/metadata/templates', payload);
export const updateTemplate = (id, payload) => api.put(`/api/metadata/templates/${id}`, payload);
export const publishTemplate = (id) => api.patch(`/api/metadata/templates/${id}/publish`);
export const archiveTemplate = (id) => api.patch(`/api/metadata/templates/${id}/archive`);
export const restoreTemplate = (id) => api.patch(`/api/metadata/templates/${id}/restore`);
export const deleteTemplate = (id) => api.delete(`/api/metadata/templates/${id}`);
export const submitTemplateForm = (templateId, payload) => api.post('/api/metadata/templates/submit', { templateId, payload });

// ─── Payments & Fees ──────────────────────────────────────────────────────────
export const getFees = () => api.get('/getFees');
export const getFeesByStudent = (studentId, academicYear) =>
    api.get(`/getFees?studentId=${studentId}&academicYear=${academicYear}`);
export const saveFees = (payload) => api.post('/saveFees', payload);
export const getClassFees = () => api.get('/class-fees');
export const saveClassFees = (payload) => api.post('/class-fees', payload);
export const copyClassFees = (payload) => api.post('/copy-class-fees', payload);
export const bulkImportFees = (payload) => api.post('/dev/bulk-import-fees', payload);
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
export const saveQuestionTemplate = (payload) => api.post('/save-template', payload);
export const deleteQuestionTemplate = (id) => api.delete(`/delete-template/${id}`);

// ─── Assessment Engine API ───────────────────────────────────────────────────
export const getAssessmentConfigs = (academicYearId, classId) => api.get('/api/assessments/config', { params: { academicYearId, classId } });
export const saveAssessmentConfig = (payload) => api.post('/api/assessments/config', payload);
export const deleteAssessmentConfig = (id) => api.delete(`/api/assessments/config/${id}`);

export const copyPreviousYearPlan = (payload) => api.post('/api/assessments/config/copy-previous', payload);

export const getMarksRegister = (assessmentConfigurationId, subjectId) => api.get('/api/assessments/marks/register', { params: { assessmentConfigurationId, subjectId } });
export const bulkSaveMarks = (payload) => api.post('/api/assessments/marks/bulk-save', payload);

export const getSubjectAnalyticsReport = (params) => api.get('/api/assessments/analytics/subject', { params });

// ─── Assessment Analytics Module API ──────────────────────────────────────────
export const getAnalyticsDashboard = (params) => api.get('/api/assessment-analytics/dashboard', { params });
export const getStudentAnalytics = (studentId, params) => api.get(`/api/assessment-analytics/student/${studentId}`, { params });
export const getSubjectAnalytics = (params) => api.get('/api/assessment-analytics/subject', { params });
export const getClassAnalytics = (params) => api.get('/api/assessment-analytics/class', { params });
export const getAssessmentAnalytics = (params) => api.get('/api/assessment-analytics/assessment', { params });

// ─── HR & Finance Modules ────────────────────────────────────────────────────
export const getEmployees = () => api.get('/api/hr/employees');
export const saveEmployee = (templateId, payload) => api.post('/api/hr/employees', { templateId, payload });
export const getEmployeeAttendance = (date) => api.get('/api/hr/attendance', { params: { date } });
export const saveEmployeeAttendance = (records) => api.post('/api/hr/attendance', { records });
export const getSalaryStructures = () => api.get('/api/payroll/salary-structures');
export const saveSalaryStructure = (templateId, payload) => api.post('/api/payroll/salary-structures', { templateId, payload });
export const getExpenses = () => api.get('/api/finance/expenses');
export const saveExpense = (templateId, payload) => api.post('/api/finance/expenses', { templateId, payload });

// ─── Default export (raw axios instance for one-off calls) ───────────────────
export default api;

