import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal } from "bootstrap";
import * as XLSX from 'xlsx';
import generatePdf from "./DownloadReceipt";

export default function Index() {


  const [searchStudent, setSearchStudent] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  const [message, setMessage] = useState('');

  // UseState for Classes
  const [className, setClassName] = useState('');
  const handleAddNewClass = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/AddNewClass', {
        className,
      });

      setMessage('Class added successfully!');
      setClassName('');
    } catch (error) {
      setMessage('Error adding class. Please try again.');
    }
  };

  // Delete Classes
  const deleteClass = async (classId) => {
    try {
      // Send request to delete class
      await axios.delete(`http://localhost:3001/deleteClass/${classId}`);
      // Remove the deleted class from the state
      setClasses(classes.filter(cls => cls._id !== classId));
    } catch (error) {
      console.error('Error deleting class:', error);
    }
  };


  // UseStae for Subjects
  const [subjectName, setSubjectName] = useState('');
  const handleAddNewSubject = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/AddNewSubject', { subjectName });

      setMessage('Subject added successfully!');
      setSubjectName('');
      fetchClassesAndSubjects();
    } catch (error) {
      setMessage('Error adding subject. Please try again.');
    }
  };

  // UseState for Classes and Subjects link
  const [classSubjectData, setClassSubjectData] = useState({
    selectedClass: '',
    selectedSubjects: []
  });

  // Handle class and subject linking
  const handleClassSubjectLink = async (e) => {
    e.preventDefault();
    const { selectedClass, selectedSubjects } = classSubjectData;

    if (!selectedClass || selectedSubjects.length === 0) {
      setMessage('Please select a class and subjects.');
      return;
    }

    try {
      await axios.post('http://localhost:3001/ClassSubjectLink', {
        className: selectedClass,      // Correct field name expected by backend
        subjectNames: selectedSubjects // This will be an array of selected subjects
      });

      setMessage('Class and subjects linked successfully!');
      setClassSubjectData({ selectedClass: '', selectedSubjects: [] }); // Reset state
    } catch (error) {
      setMessage('Error linking class and subjects. Please try again.');
      console.error(error.response?.data || error);
    }
  };


  // Handle input changes for class and subjects
  const handleChange = (e) => {
    const { name, value, checked } = e.target;

    if (name === "selectedSubjects") {
      if (checked) {
        // Add the selected subject to the array
        setClassSubjectData((prevState) => ({
          ...prevState,
          selectedSubjects: [...prevState.selectedSubjects, value]
        }));
      } else {
        // Remove the deselected subject from the array
        setClassSubjectData((prevState) => ({
          ...prevState,
          selectedSubjects: prevState.selectedSubjects.filter(subject => subject !== value)
        }));
      }
    } else {
      // Update the state for other inputs (like class selection)
      setClassSubjectData((prevState) => ({
        ...prevState,
        [name]: value
      }));
    }
  };

  // Fetching Classes and Subjects
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const fetchClassesAndSubjects = async () => {
    try {
      const classResponse = await axios.get('http://localhost:3001/getClasses');
      const sortedClasses = classResponse.data.classes.sort((a, b) => {
        return parseInt(a.class) - parseInt(b.class); // Sort numerically
      });
      setClasses(sortedClasses); // Set sorted classes
      const subjectResponse = await axios.get('http://localhost:3001/getSubjects');
      setSubjects(subjectResponse.data.subjects);
    } catch (error) {
      console.error('Error fetching classes and subjects:', error);
    }
  };
  useEffect(() => {
    fetchClassesAndSubjects();
  }, []);

  // Delete Subjects
  const handleDeleteSubject = async (subjectId) => {
    try {
      // Call delete API
      await axios.delete(`http://localhost:3001/deleteSubject/${subjectId}`);
      // Remove the deleted subject from state
      setSubjects(subjects.filter(subject => subject._id !== subjectId));
    } catch (error) {
      console.error('Error deleting subject:', error);
    }
  };


  // Add Additional Personal Information
  const [PersonalInformationList_name, setPersonalInformationList_name] = useState('');

  const handleAddAdditionalPersonalInformation = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/AddAdditionalPersonalInformation', { name: PersonalInformationList_name });  // Updated field to match new variable

      setMessage('Personal information added successfully!');
      setPersonalInformationList_name('');
      fetchPersonalInformationList();
    } catch (error) {
      setMessage('Error adding personal information. Please try again.');
    }
  };

  // Fetch personal information list
  const [personalInfoList, setpersonalInfoList] = useState([]);

  const fetchPersonalInformationList = async () => {
    try {
      const response = await axios.get('http://localhost:3001/GetPersonalInformationList');
      setpersonalInfoList(response.data.data || []); // Default to an empty array if no data is returned
    } catch (error) {
      console.error('Error fetching personal information list:', error);
    }
  };

  useEffect(() => {
    fetchPersonalInformationList();
  }, []);

  // Delete Personal Information List Name
  const handleDeletePersonalInfo = async (infoId) => {
    try {
      // Call delete API
      await axios.delete(`http://localhost:3001/DeletePersonalInfo/${infoId}`);
      // Remove the deleted info from state
      setpersonalInfoList(personalInfoList.filter(info => info._id !== infoId));
    } catch (error) {
      console.error('Error deleting personal information:', error);
    }
  };

  // Add Student
  const [student, setStudent] = useState({
    name: '',
    dob: '',
    academicYears: [], // Array to store academic year and class pairs
    additionalInfo: {},
  });

  const handleChangeAcademicYear = (index, field, value) => {
    const updatedAcademicYears = [...student.academicYears];
    updatedAcademicYears[index][field] = value;
    setStudent((prev) => ({ ...prev, academicYears: updatedAcademicYears }));
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();

    const studentData = {
      name: student.name,
      dob: student.dob,
      additionalInfo: Object.keys(student.additionalInfo).map((key) => ({
        key: key,
        value: student.additionalInfo[key],
      })),
      academicYears: student.academicYears, // Send the array of academic years and classes
    };

    try {
      await axios.post('http://localhost:3001/addStudent', studentData);
      setMessage('Student added successfully!');
      setStudent({
        name: '',
        dob: '',
        academicYears: [],
        additionalInfo: {},
      });
    } catch (error) {
      setMessage('Error adding student');
      console.error('Error adding student:', error);
    }
  };


  const handleChangeAdditionalInfo = (field, value) => {
    setStudent((prev) => ({
      ...prev,
      additionalInfo: {
        ...prev.additionalInfo,
        [field]: value,
      },
    }));
  };

  // Fetch the student data when the component mounts
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await axios.get('http://localhost:3001/getStudent');
        setStudents((response.data.students || []).sort((a, b) => a.name.localeCompare(b.name)));        // Store students data
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };

    fetchStudents();
  }, []);

  // Add Exam Data
  const [examData, setExamData] = useState({
    selectedClass: '',
    numExams: 0,
    examNames: [],
  });


  const handleNumExamsChange = (e) => {
    const numExams = e.target.value;
    const examNames = Array(Number(numExams)).fill('');
    setExamData({
      ...examData,
      numExams,
      examNames,
    });
  };

  // Handle exam name changes
  const handleExamNameChange = (index, value) => {
    const updatedExamNames = [...examData.examNames];
    updatedExamNames[index] = value;
    setExamData({
      ...examData,
      examNames: updatedExamNames,
    });
  };


  const handleClassSelection = async (className) => {
    setExamData({ ...examData, selectedClass: className });

    // Fetch existing exam data (optional)
    try {
      const response = await axios.get(`http://localhost:3001/getExams/${className}`);
      setExamData({
        ...examData,
        numExams: response.data.numExams,
        examNames: response.data.examNames,
      });
    } catch (err) {
      setMessage('No exams data found for this class');
    }
  };

  const handleSubmitExam = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3001/addExams', {
        className: examData.selectedClass,
        numExams: examData.numExams,
        examNames: examData.examNames,
      });
      setMessage(response.data);
      fetchExamsData();
    } catch (err) {
      setMessage('Error while saving exam data');
    }
  };

  // Fetching Exams Data
  const [examsData, setExamsData] = useState([]);
  const fetchExamsData = async () => {
    try {
      const response = await axios.get('http://localhost:3001/getExams');
      const sortedExams = response.data.exams.sort((a, b) => {
        return parseInt(a.class) - parseInt(b.class); // Sorting classes in ascending order
      });
      setExamsData(sortedExams || []);
    } catch (error) {
      console.error('Error fetching exams data:', error);
    }
  };
  useEffect(() => {
    fetchExamsData();
  }, []);

  // Fetch Classes and Their Linked Subjects
  const [classSubjectsData, setClassSubjectsData] = useState([]); // State for class subjects

  // Fetch class subjects from backend
  useEffect(() => {
    const fetchClassSubjects = async () => {
      try {
        const response = await axios.get('http://localhost:3001/class-subjects'); // Adjust API endpoint
        if (response.data.success) {
          setClassSubjectsData(response.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching class subjects:', error);
      }
    };

    fetchClassSubjects();
  }, []);

  // For Student Detail Modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [marksView, setMarksView] = useState(null); // New state for Marks View
  const [examsForMarksView, setExamsForMarksView] = useState([]);
  const [subjectsForMarksView, setSubjectsForMarksView] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
  };

  const handleMarksViewClick = (student) => {
    setMarksView(student); // Set student details for marks entry

    // Find the student's class for the selected academic year
    const studentAcademicYear = student.academicYears?.find(yr => yr.academicYear === selectedYear);
    if (!studentAcademicYear) return; // Exit if no matching academic year

    const studentClass = studentAcademicYear.class;

    // Get exams for this class
    const classExams = examsData.find(exam => exam.class === studentClass);
    setExamsForMarksView(classExams || { examNames: [] });

    // Get subjects for this class (Ensure `subject.className` is used)
    const classSubjects = classSubjectsData.find(entry => entry.className === studentClass);
    setSubjectsForMarksView(classSubjects?.subjectNames || []); // Store only subjects array
  };


  // Send Marks accordingly with subject and student
  const handleMarksSubmit = (event) => {
    event.preventDefault();

    const formElements = event.target.elements;
    let marksData = {};

    // Loop through subjects
    subjectsForMarksView.forEach((subject) => { // subject is already a string
      marksData[subject] = {}; // Initialize subject object

      // Loop through exams
      examsForMarksView.examNames.forEach((examName) => {
        const inputName = `marks-${subject}-${examName}`;
        const marks = formElements[inputName]?.value;

        if (marks) {
          marksData[subject][examName] = parseInt(marks, 10);
        }
      });
    });

    // Ensure we have the correct class
    const studentClass = marksView.academicYears.find(year => year.academicYear === selectedYear)?.class;
    if (!studentClass) {
      console.error("Student class not found!");
      return;
    }

    const marksInfo = {
      studentId: marksView._id,
      name: marksView.name,
      class: studentClass,
      academicYear: selectedYear,
      marks: marksData, // Nested marks per subject & exam
    };

    // Send data to the backend
    submitMarksToDatabase(marksInfo);
  };

  const submitMarksToDatabase = (marksInfo) => {
    axios.post('http://localhost:3001/submit-marks', marksInfo)
      .then(response => {
        setMarksView(null); // Close modal
      })
      .catch(error => {
        console.error('Error submitting marks:', error);
      });
  };

  // Get Student Marks
  const [StudentMarks, setStudentMarks] = useState(null);
  useEffect(() => {
    if (!marksView || !selectedYear) {
      return; // Don't fetch if values are missing
    }

    const fetchMarks = async () => {

      try {
        const response = await axios.get(`http://localhost:3001/get-marks`, {
          params: { studentId: marksView._id, academicYear: selectedYear }
        });
        console.log(response.data);

        if (response.data.studentMarks) {
          setStudentMarks(response.data.studentMarks.marks);
        } else {
          setStudentMarks(null); // No marks found
        }
      } catch (err) {
        console.error("Error fetching marks:", err);
      }
    };

    fetchMarks();
  }, [marksView, selectedYear]);


  const CloseStudentDetail = () => {
    setSelectedStudent(null);
  };

  const CloseMarksView = () => {
    setMarksView(null); // Close Marks View modal
  };

  // Initialize the modal when the selectedStudent or marksView changes
  useEffect(() => {
    if (selectedStudent) {
      const modalElement = document.getElementById('StudentDetailModal');
      const modalInstance = new Modal(modalElement);
      modalInstance.show();
    }
  }, [selectedStudent]);

  useEffect(() => {
    if (!selectedStudent) {
      const modalElement = document.getElementById('StudentDetailModal');
      const modalInstance = Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide(); // Ensure modal hides when student is reset
      }
    }
  }, [selectedStudent]);

  useEffect(() => {
    if (marksView) {
      const modalElement = document.getElementById('MarksViewModal');
      const modalInstance = new Modal(modalElement);
      modalInstance.show();
    }
  }, [marksView]);

  useEffect(() => {
    if (!marksView) {
      const modalElement = document.getElementById('MarksViewModal');
      const modalInstance = Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide(); // Hide Marks View modal when reset
      }
    }
  }, [marksView]);


  // State hooks for managing academic year
  const [academicYear, setAcademicYear] = useState('');
  const [academicYears, setAcademicYears] = useState([]);

  // Function to add new academic year
  const handleAddAcademicYear = async (e) => {
    e.preventDefault();
    try {
      // POST request to add new academic year
      await axios.post('http://localhost:3001/AddAcademicYear', { year: academicYear });

      // Set success message and reset the input field
      setMessage('Academic Year added successfully!');
      setAcademicYear('');
      fetchAcademicYears();
    } catch (error) {
      setMessage('Error adding academic year. Please try again.');
    }
  };

  // Fetch academic years
  const fetchAcademicYears = async () => {
    try {
      // GET request to fetch academic years
      const response = await axios.get('http://localhost:3001/GetAcademicYear');
      setAcademicYears(
        (response.data.data || []).sort((a, b) => {

          const yearA = a.year ? a.year.split('-')[0] : '';
          const yearB = b.year ? b.year.split('-')[0] : '';

          return parseInt(yearB || '0') - parseInt(yearA || '0');
        })
      );
    } catch (error) {
      console.error('Error fetching academic years:', error);
    }
  };

  // Delete an academic year
  const handleDeleteAcademicYear = async (yearId) => {
    try {
      // DELETE request to remove the academic year
      await axios.delete(`http://localhost:3001/DeleteAcademicYear/${yearId}`);
      // Remove the deleted year from the state
      setAcademicYears(academicYears.filter(year => year._id !== yearId));
    } catch (error) {
      console.error('Error deleting academic year:', error);
    }
  };

  // Fetch the academic years on component mount
  useEffect(() => {
    fetchAcademicYears();
  }, []);

  // Add Class-Fees
  const [classFees, setClassFees] = useState({
    class_id: '',
    school_fees: '',
    tuition_fees: '',
    admission_fees: ''
  });

  const [feesList, setFeesList] = useState([]);


  //Fees
  const [fees, setFees] = useState({
    totalFees: '',
    discount: 0,
    isNewStudent: false,
    payments: []  // Array of { amount, date }
  });

  const [paymentInput, setPaymentInput] = useState({ amount: '', date: '', paymentMethod: '', paymentBy: '' });

  const [selectedPaymentView, setSelectedPaymentView] = useState(null);
  const [selectedStudentForFees, setSelectedStudentForFees] = useState(null);

  const handleSubmitPayment = async () => {
    if (!selectedStudentForFees || !selectedStudentForFees._id) {
      alert("No student selected for payment.");
      return;
    }

    if (!selectedYear) {
      alert("Please select an academic year.");
      return;
    }

    if (!paymentInput.amount || isNaN(paymentInput.amount)) {
      alert("Enter a valid payment amount.");
      return;
    }

    const paymentData = {
      studentId: selectedStudentForFees._id,
      academicYear: selectedYear,
      totalFees: Number(fees.totalFees),
      discount: Number(fees.discount) || 0, // ✅ Send discount to backend
      isNewStudent: fees.isNewStudent,
      newPayment: {
        amount: Number(paymentInput.amount),
        date: paymentInput.date ? new Date(paymentInput.date) : new Date(),
        paymentMethod: paymentInput.paymentMethod,
        paymentBy: paymentInput.paymentBy
      }
    };

    try {
      const response = await axios.post("http://localhost:3001/saveFees", paymentData);
      if (response.data) {
        // ✅ Fetch updated fees data after saving
        const updatedResponse = await axios.get(
          `http://localhost:3001/getFees?studentId=${selectedStudentForFees._id}&academicYear=${selectedYear}`
        );

        // Extract the relevant fee data from the response
        const { admission_fees, school_fees, tuition_fees, isNewStudent, payments, discount } = updatedResponse.data;

        // Calculate total fees
        const totalFees = isNewStudent ? admission_fees + school_fees + tuition_fees : school_fees + tuition_fees;

        const finalFees = totalFees - discount;

        const reversedPayments = (payments || []).slice().reverse();

        // ✅ Update fees state with the new calculated values
        setFees({
          totalFees: finalFees,
          payments: reversedPayments,
          discount: discount,
          isNewStudent: isNewStudent
        });

        // ✅ Reset input fields after submission
        setPaymentInput({ amount: "", date: "", paymentBy: "", paymentMethod: "" });
      }
    } catch (error) {
      console.error("Error saving fees:", error.response?.data || error.message);
    }
  };

  // Fetch Fees Data when Student or Year changes
  useEffect(() => {
    if (!selectedStudentForFees || !selectedYear) {
      return;
    }

    const fetchFees = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3001/getFees?studentId=${selectedStudentForFees._id}&academicYear=${selectedYear}`
        );

        // Extract the relevant fee data from the response
        const { admission_fees, school_fees, tuition_fees, isNewStudent, payments, discount } = response.data;

        // Calculate total fees
        const totalFees = isNewStudent ? admission_fees + school_fees + tuition_fees : school_fees + tuition_fees;

        const reversedPayments = (payments || []).slice().reverse();

        // Update fees state with the new calculated values
        setFees({
          totalFees: totalFees,
          payments: reversedPayments, // You may want to populate this with actual payment data
          discount: discount,
          isNewStudent: isNewStudent
        });
      } catch (error) {
        console.error("❌ Error fetching fees:", error.response?.data || error.message);
        setFees({ totalFees: "", payments: [], discount: 0 });
      }
    };

    fetchFees();
  }, [selectedStudentForFees, selectedYear]);

  const handlePaymentViewClick = (student) => {
    setSelectedStudentForFees(student); // Store the student for payment
    setSelectedPaymentView(student);  // Open the Fees modal
  };

  const handleDownloadExcel = () => {
    if (!selectedStudentForFees || !selectedYear || !fees) {
      alert("Missing student or academic year data.");
      return;
    }

    // Create header information
    const headerData = [
      ["Student Name:", selectedStudentForFees.name],
      ["Academic Year:", selectedYear],
      [],
      ["S.No", "Payment Date", "Amount Paid (₹)"]
    ];

    // Prepare payment history data
    const paymentHistory = fees.payments.map((payment, index) => [
      index + 1,
      new Date(payment.date).toLocaleDateString('en-GB'),
      payment.amount
    ]);

    // Add total and remaining fees rows
    paymentHistory.push(
      ["", "Total Fees", fees.totalFees],
      ["", "Remaining Fees", fees.totalFees - fees.payments.reduce((sum, payment) => sum + payment.amount, 0)]
    );

    // Combine header and data
    const finalSheetData = [...headerData, ...paymentHistory];

    // Create worksheet and workbook
    const worksheet = XLSX.utils.aoa_to_sheet(finalSheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payment History");

    // Generate and download the Excel file
    const fileName = `${selectedStudentForFees.name}_Fees_${selectedYear}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  useEffect(() => {
    fetchClassFees();
  }, []);
  const fetchClassFees = async () => {
    try {
      const res = await axios.get('http://localhost:3001/class-fees');
      setFeesList(res.data);
    } catch (error) {
      console.error("Error fetching class fees", error);
    }
  };
  const handleSubmitClassFees = async () => {
    try {
      await axios.post('http://localhost:3001/class-fees', classFees);
      fetchClassFees();
    } catch (error) {
      console.error("Error saving class fees", error);
    }
  };

  const [selectedStudents, setSelectedStudents] = useState([]);

  const handleSelectStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const [passToSelectedYear, setPassToSelectedYear] = useState("");
  const [passToSelectedClass, setPassToSelectedClass] = useState("");

  const handlePassStudents = async () => {
    if (!passToSelectedYear || !passToSelectedClass) {
      alert("Please select an academic year and class before proceeding.");
      return;
    }

    if (selectedStudents.length === 0) {
      alert("No students selected to pass.");
      return;
    }

    try {
      const response = await axios.post("http://localhost:3001/pass-students-to", {
        studentIds: selectedStudents,
        newAcademicYear: passToSelectedYear,
        newClass: passToSelectedClass,
      });

      if (response.status === 200) {
        alert("Students updated successfully!");
        setSelectedStudents([]); // Clear selected students
        setPassToSelectedYear(""); // Reset year
        setPassToSelectedClass(""); // Reset class
      } else {
        alert("Failed to update students.");
      }
    } catch (error) {
      console.error("Error passing students:", error);
      alert("An error occurred while updating students.");
    }
  };


  //Select All Students
const [selectAllChecked, setSelectAllChecked] = useState(false);

// Get filtered students
const filteredStudents = students.filter((student) =>
  (
    (selectedYear === "" && selectedClass === "") ||
    student.academicYears.some((year) =>
      (selectedYear === "" || year.academicYear === selectedYear) &&
      (selectedClass === "" || String(year.class) === String(selectedClass))
    )
  ) &&
  (searchStudent === "" || student.name.toLowerCase().includes(searchStudent.toLowerCase()))
);

// Handle individual selection

// Handle "Select All"
const handleSelectAll = () => {
  if (selectAllChecked) {
    // Uncheck all
    setSelectedStudents([]);
  } else {
    // Select only displayed students
    setSelectedStudents(filteredStudents.map((student) => student._id));
  }
  setSelectAllChecked(!selectAllChecked);
};

// Keep "Select All" in sync with individual selections
useEffect(() => {
  if (filteredStudents.length > 0) {
    setSelectAllChecked(filteredStudents.every((student) => selectedStudents.includes(student._id)));
  } else {
    setSelectAllChecked(false);
  }
}, [selectedStudents, filteredStudents]);





  return (
    <div className='index'>
      <div className='controlPanel'>
        <button type="button" className="btn" data-bs-toggle="modal" data-bs-target="#AddStudentModal">Add Student</button>
        <button type="button" className="btn" data-bs-toggle="modal" data-bs-target="#AddNewClassModal">Classes</button>
        <button type="button" className="btn" data-bs-toggle="modal" data-bs-target="#AddNewSubjectModal">Subjects</button>
        <button type="button" className="btn" data-bs-toggle="modal" data-bs-target="#LinkClassSubjectModal">Link Class and Subject</button>
        <button type="button" className="btn" data-bs-toggle="modal" data-bs-target="#AddNewAcademicYearModal">Academic Years</button>
        <button type="button" className="btn" data-bs-toggle="modal" data-bs-target="#AddPersonalInfoModal">Additional Personal Information List</button>
        <button type="button" className="btn" data-bs-toggle="modal" data-bs-target="#AddExamMarksModal">Exam Details</button>
        <button type="button" className="btn" data-bs-toggle="modal" data-bs-target="#ClassFeesModal">Class Fees</button>
      </div>

      <div className='SearchFilter'>

        <div className="yearFilter">
          <select className="form-select form-select-sm" value={selectedYear} onChange={(event) => { setSelectedYear(event.target.value); }} >
            <option value="">Select Academic Year</option>
            <option value="">All</option>
            {academicYears.length > 0 ? (
              academicYears.map((year, index) => (
                <option key={index} value={year.year}>
                  {year.year}
                </option>
              ))
            ) : (
              <option disabled>No Academic Years Available</option>
            )}
          </select>
        </div>

        <div className="classFilter">
          <select className="form-select form-select-sm" value={selectedClass} onChange={(event) => { setSelectedClass(event.target.value); }} >
            <option value="">Select Class</option>
            <option value="">All</option>
            {classes.length > 0 ? (
              classes.map((cls) => (
                <option key={cls._id} value={cls.class}>
                  {cls.class}
                </option>
              ))
            ) : (
              <option disabled>No Classes Available</option>
            )}
          </select>
        </div>

        <input type="text" placeholder="Search Student..." value={searchStudent} onChange={(e) => setSearchStudent(e.target.value)} className="border rounded" />

        <button type="button" class="btn btn-sm border" data-bs-toggle="modal" data-bs-target="#passtoModal">Pass to</button>

      </div>

      <div className='infoBox'>
        {students.length > 0 ? (
          <table className="studentInfo">
            <thead>
              <tr>
                <th> <input type="checkbox" checked={selectAllChecked} onChange={handleSelectAll} /> Select</th>
                <th>Name</th>
                <th>Date of Birth</th>
                <th>Age</th>
                <th>Marks View</th>
                <th>Additional Information</th>
                <th>Fees</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student._id}>
                  <td><input
                    type="checkbox"
                    checked={selectedStudents.includes(student._id)}
                    onChange={() => handleSelectStudent(student._id)}
                  /></td>
                  <td>{student.name}</td>
                  <td>{new Date(student.dob).toLocaleDateString("en-GB")}</td>
                  <td>{student.age}</td>
                  <td><button className="btn btn-outline-success btn-sm" onClick={() => handleMarksViewClick(student)}> View Marks </button></td>
                  <td><button className="btn btn-outline-info btn-sm" onClick={() => handleStudentClick(student)}> View Details </button></td>
                  <td><button className='btn btn-outline-warning btn-sm' onClick={() => handlePaymentViewClick(student)}> Payments </button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No student data available.</p>
        )}



        {/* Fees Modal */}
        {selectedPaymentView && (
          <div className="modal fade show d-block" tabIndex="-1" aria-labelledby="FeesModalLabel" aria-hidden="true">
            <div className="modal-dialog modal-xl">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {selectedYear ? `Fees for ${selectedPaymentView?.name} (${selectedYear})` : "Select an Academic Year"}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setSelectedPaymentView(null)} aria-label="Close"></button>
                </div>

                <div className="modal-body">
                  {selectedYear ? (
                    <>
                      {/* Fetching Class from Student Academic Year Data */}
                      <div className="mb-3">
                        <label className="form-label">Class</label>
                        <input type="text" className="form-control" value={selectedPaymentView?.academicYears.find(y => y.academicYear === selectedYear)?.class || ""} readOnly />
                      </div>

                      <div className="mb-3 form-check">
                        <input type="checkbox" className="form-check-input" id="admissionFeeCheckbox" checked={fees.isNewStudent || false} onChange={(e) => setFees(prev => ({ ...prev, isNewStudent: e.target.checked }))} />
                        <label className="form-check-label" htmlFor="admissionFeeCheckbox">
                          New Student: Admission Fees
                        </label>
                      </div>

                      {/* Auto-Fetched Total Fees */}
                      <div className="mb-3">
                        <label className="form-label">Total Fees</label>
                        <input type="number" className="form-control" value={fees.totalFees} readOnly />
                      </div>

                      {/* One-Time Discount Field */}
                      <div className="mb-3">
                        <label className="form-label">Discount</label>
                        <input type="number" className="form-control" value={fees.discount || ""} onChange={(e) => setFees(prev => ({ ...prev, discount: Number(e.target.value) }))} />
                      </div>

                      {/* Payment Input Fields */}
                      <div className="mb-3">
                        <label className="form-label">Payment Amount</label>
                        <input type="number" className="form-control" value={paymentInput.amount} onChange={(e) => setPaymentInput(prev => ({ ...prev, amount: Number(e.target.value) }))} />
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Payment Date</label>
                        <input type="date" className="form-control" value={paymentInput.date} onChange={(e) => setPaymentInput(prev => ({ ...prev, date: e.target.value }))} />
                      </div>
                      
                      <div className="mb-3">
                        <label className="form-label">Payment By</label>
                        <input type="text" className="form-control" value={paymentInput.paymentBy} onChange={(e) => setPaymentInput(prev => ({ ...prev, paymentBy: e.target.value }))} />
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Payment Method</label>
                        <input type="text" className="form-control" value={paymentInput.paymentMethod} onChange={(e) => setPaymentInput(prev => ({ ...prev, paymentMethod: e.target.value }))} />
                      </div>

                      <button className="btn btn-primary" onClick={handleSubmitPayment}>Submit Payment</button>

                      <hr />
                      {/* Remaining Fees Calculation */}
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <strong>Total Fees: ₹{fees.totalFees - fees.discount}</strong>
                        <strong style={{ color: fees.totalFees - (fees.discount || 0) - fees.payments.reduce((sum, p) => sum + p.amount, 0) > 0 ? "red" : "green" }}>
                          Remaining: ₹{fees.totalFees - (fees.discount || 0) - fees.payments.reduce((sum, p) => sum + p.amount, 0)}
                        </strong>
                      </div>
                      <hr />

                      {/* Payment History Table */}
                      <h6>Payment History</h6>
                      <table className="table table-bordered mt-3">
                        <thead>
                          <tr>
                            <th>S. No</th>
                            <th>Payment From</th>
                            <th>Payment Method</th>
                            <th>Payment Date</th>
                            <th>Amount (₹)</th>
                            <th>Receipt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fees.payments.length > 0 ? (
                            fees.payments.map((payment, index) => (
                              <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{payment.paymentBy}</td>
                                <td>{payment.paymentMethod}</td>
                                <td>{new Date(payment.date).toLocaleDateString('en-GB')}</td>
                                <td>₹{payment.amount}</td>
                                <td><button className="btn btn-sm btn-outline-success" onClick={() => generatePdf(fees, payment, selectedPaymentView, selectedYear)}>Download Receipt</button></td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="text-center">No payments made yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                    </>
                  ) : (
                    <p>Please select an academic year to proceed.</p>
                  )}
                </div>

                <div className="modal-footer">
                  <button className="btn btn-success" onClick={handleDownloadExcel}>Download Excel</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedPaymentView(null)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Marks View Modal */}
        {marksView && (
          <div className="modal fade" id="MarksViewModal" tabIndex="-1" data-bs-backdrop="static" aria-labelledby="MarksViewModalLabel" aria-hidden="true">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="MarksViewModalLabel">{marksView?.name || "Marks View"}</h5>
                  <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div className="modal-body">
                  {marksView ? (
                    <>
                      {subjectsForMarksView.length > 0 ? (
                        <form onSubmit={handleMarksSubmit}>
                          <table className="table table-bordered">
                            <thead>
                              <tr>
                                <th>Subject</th>
                                {examsForMarksView?.examNames?.map((examName, examIndex) => (
                                  <th key={examIndex}>{examName}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {subjectsForMarksView.map((subject, subIndex) => (
                                <tr key={subIndex}>
                                  <td><strong>{subject}</strong></td>
                                  {examsForMarksView?.examNames?.map((examName, examIndex) => (
                                    <td key={examIndex}>
                                      <input type="number" id={`marks-${subject}-${examName}`} className="form-control" placeholder={`Marks for ${examName}`} min="0" />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <button type="submit" className="btn btn-primary mt-3">Submit Marks</button>
                        </form>
                      ) : (
                        <p>No subjects available for this class <br /> <strong>Select Academic Year</strong></p>
                      )}

                    </>
                  ) : (
                    <p>Loading marks...</p>
                  )}
                  <hr />
                  {marksView ? (
                    <>
                      {subjectsForMarksView.length > 0 ? (
                        <>
                          <h5>Stored Marks</h5>
                          <table className="table table-bordered">
                            <thead>
                              <tr>
                                <th>Subject</th>
                                {examsForMarksView?.examNames?.map((examName, examIndex) => (
                                  <th key={examIndex}>{examName}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {subjectsForMarksView.map((subject, subIndex) => (
                                <tr key={subIndex}>
                                  <td><strong>{subject}</strong></td>
                                  {examsForMarksView?.examNames?.map((examName, examIndex) => (
                                    <td key={examIndex}>
                                      {StudentMarks?.[subject]?.[examName] !== undefined
                                        ? StudentMarks[subject][examName]
                                        : '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      ) : (
                        <p>No subjects available for this class <br /> <strong>Select Academic Year</strong></p>
                      )}
                    </>
                  ) : (
                    <p>Loading marks...</p>
                  )}

                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" onClick={CloseMarksView}>Close</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Student Detail Modal */}
        {selectedStudent && (
          <div className="modal fade" id="StudentDetailModal" tabIndex="-1" data-bs-backdrop="static" aria-labelledby="StudentDetailModalLabel" aria-hidden="true">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="StudentDetailModalLabel">{selectedStudent?.name || "Student Details"}</h5>
                  <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div className="modal-body">
                  {selectedStudent ? (
                    <>
                      {selectedStudent.additionalInfo?.length > 0 ? (
                        <ul>
                          {selectedStudent.additionalInfo.map((info, index) => (
                            <li key={index}><strong>{info.key}:</strong> {info.value}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No additional info available</p>
                      )}
                      {selectedStudent.academicYears?.length > 0 ? (
                        <ul>
                          {selectedStudent.academicYears.map((year, index) => (
                            <li key={index}>
                              <strong>Academic Year: {year.academicYear} </strong>
                              <strong>Class: {year.class}</strong>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No academic year and class information available</p>
                      )}
                    </>
                  ) : (
                    <p>Loading student details...</p>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" onClick={CloseStudentDetail}>Close</button>
                </div>
              </div>
            </div>
          </div>

        )}

      </div>


















      {/* Modals */}

      {/* Pass to Modal */}
      <div className="modal fade" id="passtoModal" tabIndex="-1" aria-labelledby="passtoModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Pass Students To</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p><strong>Selected Year:</strong> {selectedYear}</p>
              <p><strong>Selected Class:</strong> {selectedClass}</p>

              <div className="mb-3">
                <label htmlFor="newAcademicYear" className="form-label">Select New Academic Year</label>
                <select id="newAcademicYear" className="form-control" value={passToSelectedYear} onChange={(e) => setPassToSelectedYear(e.target.value)} >
                  <option value="">Select Year</option>
                  {academicYears.map((year, index) => (
                    <option key={index} value={year.year}>{year.year}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label htmlFor="newClass" className="form-label">Select New Class</label>
                <select id="newClass" className="form-control" value={passToSelectedClass} onChange={(e) => setPassToSelectedClass(e.target.value)} >
                  <option value="">Select Class</option>
                  {classes.map((cls, idx) => (
                    <option key={idx} value={cls.class}>{cls.class}</option>
                  ))}
                </select>
              </div>

              {selectedStudents.length > 0 ? (
                <table className="table table-bordered mt-3">
                  <thead className="table-dark">
                    <tr>
                      <th>Name</th>
                      <th>Current Academic Year</th>
                      <th>Current Class</th>
                      <th>Selected Academic Year</th>
                      <th>Selected Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students
                      .filter((student) => selectedStudents.includes(student._id))
                      .map((student) => {
                        // Get the latest academic year and class of the student
                        const latestAcademicRecord = student.academicYears[student.academicYears.length - 1];

                        return (
                          <tr key={student._id}>
                            <td>{student.name}</td>
                            <td>{latestAcademicRecord?.academicYear || "N/A"}</td>
                            <td>{latestAcademicRecord?.class || "N/A"}</td>
                            <td>{selectedYear}</td>
                            <td>{selectedClass}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              ) : (
                <p className="text-danger">No students selected.</p>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" className="btn btn-primary" onClick={handlePassStudents}>
                Pass Students
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* Add Classes Fee Structure */}
      <div className="modal fade" id="ClassFeesModal" tabIndex="-1" aria-labelledby="ClassFeesModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Manage Class Fees</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Select Class</label>
                <select className="form-control" name="class_id" value={classFees.class_id} onChange={(e) => setClassFees({ ...classFees, class_id: e.target.value })} >
                  <option value="">Select a class</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>{cls.class}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">School Fees</label>
                <input type="number" className="form-control" name="school_fees" value={classFees.school_fees} onChange={(e) => setClassFees({ ...classFees, school_fees: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="form-label">Tuition Fees</label>
                <input type="number" className="form-control" name="tuition_fees" value={classFees.tuition_fees} onChange={(e) => setClassFees({ ...classFees, tuition_fees: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="form-label">Admission Fees</label>
                <input type="number" className="form-control" name="admission_fees" value={classFees.admission_fees} onChange={(e) => setClassFees({ ...classFees, admission_fees: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" className="btn btn-primary" onClick={handleSubmitClassFees}>Save Changes</button>
            </div>

            <div className="mx-2">
              <h6>Class Fees List</h6>
              <table className="table table-bordered">
                <thead className="table-dark">
                  <tr>
                    <th>Class</th>
                    <th>Admission Fees (₹)</th>
                    <th>School Fees (₹)</th>
                    <th>Tuition Fees (₹)</th>
                    <th>Total Fees (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {feesList.filter((fee) => fee.class_id).sort((a, b) => Number(a.class_id.class) - Number(b.class_id.class)).map((fee) => (
                    <tr key={fee._id}>
                      <td>{fee.class_id?.class || "Deleted Class"}</td>
                      <td>{fee.admission_fees || 0}</td>
                      <td>{fee.school_fees || 0}</td>
                      <td>{fee.tuition_fees || 0}</td>
                      <td>{(fee.admission_fees || 0) + (fee.school_fees || 0) + (fee.tuition_fees || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Class Modal */}
      <div className="modal fade" id="AddNewClassModal" tabIndex="-1" aria-labelledby="AddNewClassModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5" id="AddNewClassModalLabel">Classes</h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddNewClass}>
                <div className="mb-3">
                  <label htmlFor="className" className="form-label">Add a new class</label>
                  <input type="text" className="form-control" id="className" value={className} onChange={(e) => setClassName(e.target.value)} required />
                </div>
                {message && <p className="text-center">{message}</p>}
                <button type="submit" className="btn btn-success w-100">Save</button>
              </form>
              <hr />
              <div className="list-group">
                {classes.length > 0 ? (
                  classes.map((classItem) => (
                    <div key={classItem._id} className="list-group-item d-flex justify-content-between align-items-center">
                      <span>{classItem.class}</span>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => deleteClass(classItem._id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                ) : (
                  <p>No classes available</p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Subject Modal */}
      <div className="modal fade" id="AddNewSubjectModal" tabIndex="-1" aria-labelledby="AddNewSubjectModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5" id="AddNewSubjectModalLabel">Add New Subject</h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddNewSubject}>
                <div className="mb-3">
                  <label htmlFor="subjectName" className="form-label">Subject Name</label>
                  <input type="text" className="form-control" id="subjectName" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} required />
                </div>
                {message && <p className="text-center">{message}</p>}
                <button type="submit" className="btn btn-success w-100">Save</button>
              </form>
              <hr />
              <ul className="list-group">
                {subjects.map(subject => (
                  <li key={subject._id} className="list-group-item d-flex justify-content-between align-items-center">
                    {subject.name} {/* Display subject name */}
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDeleteSubject(subject._id)}>
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Linking Class and Subject */}
      <div className="modal fade" id="LinkClassSubjectModal" tabIndex="-1" aria-labelledby="LinkClassSubjectModalLabel" aria-hidden="true" >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="LinkClassSubjectModalLabel">Link Class and Subjects</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleClassSubjectLink}>
                <div className="mb-3">
                  <label htmlFor="selectedClass" className="form-label">Select Class</label>
                  <select name="selectedClass" id="selectedClass" className="form-select" value={classSubjectData.selectedClass} onChange={handleChange} required>
                    <option value="">Select a class</option>
                    {classes.map((classItem) => (
                      <option key={classItem._id} value={classItem.class}>
                        {classItem.class}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="selectedSubjects" className="form-label">Select Subjects</label>
                  {subjects.map((subject) => (
                    <div key={subject._id} className="form-check">
                      <input type="checkbox" name="selectedSubjects" value={subject.name} id={`subject-${subject._id}`} checked={classSubjectData.selectedSubjects.includes(subject.name)} onChange={handleChange} className="form-check-input" />
                      <label htmlFor={`subject-${subject._id}`} className="form-check-label">
                        {subject.name}
                      </label>
                    </div>
                  ))}
                </div>

                {message && <p className="text-center">{message}</p>}

                <button type="submit" className="btn btn-success w-100">
                  Link Class and Subjects
                </button>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Adding Personal Information */}
      <div className="modal fade" id="AddPersonalInfoModal" tabIndex="-1" aria-labelledby="AddPersonalInfoModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="AddPersonalInfoModalLabel">Add Personal Information</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddAdditionalPersonalInformation}>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">Name</label>
                  <input type="text" className="form-control" id="name" value={PersonalInformationList_name} onChange={(e) => setPersonalInformationList_name(e.target.value)} required />
                </div>
                {message && <p className="text-center">{message}</p>}
                <button type="submit" className="btn btn-success w-100">Save</button>
              </form>
              <hr />
              <ul className="list-group">
                {personalInfoList.map(info => (
                  <li key={info._id} className="list-group-item d-flex justify-content-between align-items-center">
                    {info.name} {/* Display name */}
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDeletePersonalInfo(info._id)}>
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Adding Student */}
      <div className="modal fade" id="AddStudentModal" tabIndex="-1" aria-labelledby="AddStudentModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5" id="AddStudentModalLabel">Add New Student</h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddStudent}>
                {/* Student Name */}
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">Name</label>
                  <input type="text" className="form-control" id="name" value={student.name} onChange={(e) => setStudent((prev) => ({ ...prev, name: e.target.value }))} required />
                </div>

                {/* Student DOB */}
                <div className="mb-3">
                  <label htmlFor="dob" className="form-label">Date of Birth</label>
                  <input type="date" className="form-control" id="dob" value={student.dob} onChange={(e) => setStudent((prev) => ({ ...prev, dob: e.target.value }))} required />
                </div>

                {/* Add Academic Year and Class */}
                <div className="mb-3">
                  <button type="button" className="btn btn-secondary mb-3" onClick={() => setStudent((prev) => ({ ...prev, academicYears: [...prev.academicYears, { academicYear: '', class: '' }] }))}> Add Academic Year </button>
                  {student.academicYears.map((academicYear, index) => (
                    <div key={index} className="mb-3">
                      <div className="d-flex">
                        <div className="me-2">
                          <label htmlFor={`academicYear-${index}`} className="form-label">Academic Year</label>
                          <select className="form-select" value={academicYear.academicYear} onChange={(e) => handleChangeAcademicYear(index, 'academicYear', e.target.value)} required >
                            <option value="">Select Academic Year</option>
                            {academicYears.map((year) => (
                              <option key={year._id} value={year.year}>{year.year}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`class-${index}`} className="form-label">Class</label>
                          <select className="form-select" value={academicYear.class} onChange={(e) => handleChangeAcademicYear(index, 'class', e.target.value)} required >
                            <option value="">Select Class</option>
                            {classes.map((cls) => (
                              <option key={cls._id} value={cls.class}>{cls.class}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>


                {/* Loop over personal info list */}
                {personalInfoList.map((info) => (
                  <div key={info._id} className="mb-3">
                    <label htmlFor={info._id} className="form-label">{info.name}</label>
                    <input type="text" className="form-control" id={info._id} value={student.additionalInfo[info.name] || ''} onChange={(e) => handleChangeAdditionalInfo(info.name, e.target.value)} />
                  </div>
                ))}

                <button type="submit" className="btn btn-success w-100">Save Student</button>
                {message && <p>{message}</p>}
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Adding Exam Marks */}
      <div className="modal fade" id="AddExamMarksModal" tabIndex="-1" aria-labelledby="AddExamMarksModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5" id="AddExamMarksModalLabel">Add Exam Details</h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmitExam}>
                <div className="mb-3">
                  <label htmlFor="selectedClass" className="form-label">Select Class</label>
                  <select id="selectedClass" className="form-select" value={examData.selectedClass} onChange={(e) => handleClassSelection(e.target.value)} required >
                    <option value="">Select Class</option>
                    {classes.map((classItem, index) => (
                      <option key={index} value={classItem.class}>
                        {classItem.class}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Number of exams section */}
                <div className="mb-3">
                  <label htmlFor="numExams" className="form-label">Number of Exams</label>
                  <input type="number" className="form-control" value={examData.numExams} onChange={handleNumExamsChange} min="1" required />
                </div>

                {/* Exam names section */}
                {examData.numExams > 0 && (
                  <>
                    <h5>Enter Exam Names</h5>
                    {examData.examNames.map((examName, index) => (
                      <div key={index} className="mb-3">
                        <label className="form-label">Exam {index + 1} Name</label>
                        <input type="text" className="form-control" placeholder={`Enter name for Exam ${index + 1}`} value={examName} onChange={(e) => handleExamNameChange(index, e.target.value)} required />
                      </div>
                    ))}
                  </>
                )}

                {message && <p className="text-center">{message}</p>}
                <button type="submit" className="btn btn-success w-100">Save Exam Data</button>
              </form>
              <hr />
              <div className="row">
                {/* Right column for the exams info */}
                <div className="col-md-12">
                  {examsData.length > 0 ? (
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Class</th>
                          <th>Number of Exams</th>
                          <th>Exam Names</th>
                        </tr>
                      </thead>
                      <tbody>
                        {examsData.map((exam, index) => (
                          <tr key={index}>
                            <td>{exam.class}</td>
                            <td>{exam.numExams}</td>
                            <td>
                              <ul>
                                {exam.examNames.map((examName, idx) => (
                                  <li key={idx}>{examName}</li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No exams data available.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Year Modal */}
      <div className="modal fade" id="AddNewAcademicYearModal" tabIndex="-1" aria-labelledby="AddNewAcademicYearModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5" id="AddNewAcademicYearModalLabel">Academic Year</h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddAcademicYear}>
                <div className="mb-3">
                  <label htmlFor="academicYear" className="form-label">Add a new Academic Year</label>
                  <input type="text" className="form-control" id="academicYear" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} required />
                </div>
                {message && <p className="text-center">{message}</p>}
                <button type="submit" className="btn btn-success w-100">Save</button>
              </form>
              <hr />
              <div className="list-group">
                {academicYears.length > 0 ? (
                  academicYears.map((year) => (
                    <div key={year._id} className="list-group-item d-flex justify-content-between align-items-center">
                      <span>{year.year}</span>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteAcademicYear(year._id)}>Delete</button>
                    </div>
                  ))
                ) : (
                  <p>No academic years available</p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>






    </div >
  )
}
