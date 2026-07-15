import React, { forwardRef } from "react";
import principalSignature from "../Images/Prinicipal Signature.png"
import './IdentityCard.css';

const IdentityCardPage = forwardRef(
    ({ selectedStudents, students, selectedYear, latestMaster }, ref) => {
        const filteredStudents = students
            .filter((s) => selectedStudents.includes(s._id))
            .sort((a, b) => (a.AdmissionNo || "").localeCompare(b.AdmissionNo || "", undefined, { numeric: true }));

        // Resolve active school master details if latestMaster is returned as a database array
        const activeSchool = Array.isArray(latestMaster)
            ? (latestMaster.find(sch => sch._id === (students[0]?.schoolId?._id || students[0]?.schoolId)) || latestMaster[0])
            : latestMaster;

        const getValue = (student, key) => {
            const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");

            // Heuristic check for contact numbers (mobile, phone, contact)
            if (lowerKey === "fathersphoneno" || lowerKey === "mobile" || lowerKey === "phone" || lowerKey === "mobileno") {
                // Direct exact key check first
                if (student.fathermobilenumber) return student.fathermobilenumber;
                if (student.mothermobilenumber) return student.mothermobilenumber;

                // 1. Look for father's mobile number specifically
                const fatherContactKey = Object.keys(student).find(k => {
                    const ck = k.toLowerCase().replace(/[^a-z0-9]/g, "");
                    return ck.includes("father") && (ck.includes("mobile") || ck.includes("phone") || ck.includes("contact"));
                });
                if (fatherContactKey && student[fatherContactKey]) {
                    return student[fatherContactKey];
                }

                // 2. Look for mother's mobile number specifically as fallback
                const motherContactKey = Object.keys(student).find(k => {
                    const ck = k.toLowerCase().replace(/[^a-z0-9]/g, "");
                    return ck.includes("mother") && (ck.includes("mobile") || ck.includes("phone") || ck.includes("contact"));
                });
                if (motherContactKey && student[motherContactKey]) {
                    return student[motherContactKey];
                }

                // 3. Fall back to any key containing mobile, phone, or contact
                const generalContactKey = Object.keys(student).find(k => {
                    const ck = k.toLowerCase();
                    return ck.includes("mobile") || ck.includes("phone") || ck.includes("contact");
                });
                if (generalContactKey) return student[generalContactKey];
            }

            // Heuristic check for Father's name
            if (lowerKey === "fathersname") {
                const fKey = Object.keys(student).find(k => {
                    const ck = k.toLowerCase().replace(/[^a-z0-9]/g, "");
                    return ck.includes("father") && ck.includes("name");
                });
                if (fKey) return student[fKey];
                return student.fathername || student.father || "";
            }

            // Heuristic check for Mother's name
            if (lowerKey === "mothersname") {
                const mKey = Object.keys(student).find(k => {
                    const ck = k.toLowerCase().replace(/[^a-z0-9]/g, "");
                    return ck.includes("mother") && ck.includes("name");
                });
                if (mKey) return student[mKey];
                return student.mothername || student.mother || "";
            }

            // Direct property match
            for (const [k, v] of Object.entries(student)) {
                const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, "");
                if (cleanK === lowerKey) return v;
            }

            return "";
        };

        return (
            <div ref={ref} className="identity-pdf-print">
                <style>
                    {`
            @media print {
              @page {
                size: A4 landscape;
                margin: 10mm;
              }
              body * {
                visibility: hidden;
              }
              .identity-pdf-print, .identity-pdf-print * {
                visibility: visible;
              }
              .identity-pdf-print {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
            }

            .identity-pdf-print {
              font-family: 'Times New Roman', Times, serif;
            }
          `}
                </style>

                <div className="IdentityCard-Page">
                    {filteredStudents.map((student, index) => {
                        const fatherName = getValue(student, "Father's Name");
                        const motherName = getValue(student, "Mother's Name");
                        const phone = getValue(student, "Father's Phone No.");
                        const address = getValue(student, "Address");

                        // Find student enrollment for selected academic year name or ID
                        const academicClassObj = student.academicYears?.find(
                            (a) => a.academicYear === selectedYear || a.academicYearId === selectedYear
                        );
                        
                        let className = "";
                        if (academicClassObj) {
                            className = typeof academicClassObj.class === 'object' ? academicClassObj.class.class : academicClassObj.class;
                            if (academicClassObj.section) {
                                className += ` - ${academicClassObj.section}`;
                            }
                        }
                        if (!className) {
                            className = student.class || student.classId?.class || getValue(student, "AClass") || "";
                        }

                        const formatDate = (dateInput) => {
                            if (!dateInput) return "";

                            const date = new Date(dateInput);
                            if (isNaN(date.getTime())) {
                                return dateInput;
                            }
                            const day = String(date.getDate()).padStart(2, "0");
                            const month = String(date.getMonth() + 1).padStart(2, "0");
                            const year = date.getFullYear();

                            return `${day}-${month}-${year}`;
                        };

                        const admissionNumber = student.AdmissionNo || student.admissionNumber || student.admissionno || getValue(student, "Admission No.");

                        return (
                            <div key={index} className="IdentityCard" style={{ fontSize: "8px" }}>
                                <div className="school-info w-100">
                                    <h5 style={{ marginBottom: "0px", fontWeight: 'bolder', color: 'blue' }}>
                                        {activeSchool?.name || "SCHOOL NAME"}
                                    </h5>
                                    <div style={{ marginTop: '-2px' }}>{activeSchool?.address || "School Address"}</div>
                                    <div style={{ marginTop: '-5px' }}>(www.vamsheetechnoschool.com)</div>
                                    <div style={{ marginTop: '-4px' }} className="w-100 fw-bold">
                                        IDENTITY CARD: {selectedYear || "YYYY-YY"}
                                    </div>
                                </div>

                                <div className="" style={{ textAlign: 'start', width: '100%', marginTop: '-2px' }}>
                                    <img className="logo ms-1" src="https://i.ibb.co/cKvYrpsm/Screenshot-2023-10-21-085200.jpg" alt="..." />
                                    <img
                                        src={student.image || "https://i.ibb.co/5Rz2Zk9/default-avatar.png"}
                                        alt={student.name}
                                        className="student-id-image ms-2"
                                        onError={(e) => { e.target.src = "https://i.ibb.co/5Rz2Zk9/default-avatar.png" }}
                                    />
                                </div>

                                <div className="student-information">
                                    <div>
                                        <strong style={{ color: "blue", marginRight: "20px" }}>
                                            Student:
                                        </strong>
                                        {student.name}
                                    </div>
                                    <div>
                                        <strong style={{ color: "blue", marginRight: "17px" }}>
                                            Adm No:
                                        </strong>
                                        {admissionNumber}
                                    </div>
                                    <div>
                                        <strong style={{ color: "blue", marginRight: "30px" }}>
                                            Class:
                                        </strong>
                                        {className}
                                    </div>
                                    <div>
                                        <strong style={{ color: "blue", marginRight: "31px" }}>
                                            DOB:
                                        </strong>
                                        {formatDate(student.dob || student.dateofbirth)}
                                    </div>
                                    <div>
                                        <strong style={{ color: "blue", marginRight: "24px" }}>
                                            Father:
                                        </strong>
                                        {fatherName}
                                    </div>
                                    <div>
                                        <strong style={{ color: "blue", marginRight: "20px" }}>
                                            Mother:
                                        </strong>
                                        {motherName}
                                    </div>
                                    <div>
                                        <strong style={{ color: "blue", marginRight: "22px" }}>
                                            Mobile:
                                        </strong>
                                        {phone}
                                    </div>
                                    <div>
                                        <strong style={{ color: "blue", marginRight: "7px" }}>Address:</strong>
                                        {address}
                                    </div>
                                </div>

                                <div className="principal-signature">
                                    <img src={principalSignature} alt="..." /> <div>(Principal)</div></div>

                                <div className="contact bg-dark w-100 text-light"> (Mb): {activeSchool?.phoneNo} | (Email): {activeSchool?.email}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
);

export default IdentityCardPage;
