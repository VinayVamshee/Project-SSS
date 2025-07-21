import React, { forwardRef } from "react";
import principalSignature from "./Images/Prinicipal Signature.png"

const IdentityCardPage = forwardRef(
    ({ selectedStudents, students, selectedYear, latestMaster }, ref) => {
        const filteredStudents = students.filter((s) =>
            selectedStudents.includes(s._id)
        );

        const getValue = (student, key) =>
            student.additionalInfo?.find((info) => info.key === key)?.value || "";

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
                        const academicClass = student.academicYears?.find(
                            (a) => a.academicYear === selectedYear
                        )?.class;

                        const className = academicClass || getValue(student, "AClass");

                        const formatDate = (dateInput) => {
                            if (!dateInput) return "";

                            const date = new Date(dateInput);
                            const day = String(date.getDate()).padStart(2, "0");
                            const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
                            const year = date.getFullYear();

                            return `${day}-${month}-${year}`;
                        };

                        return (
                            <div key={index} className="IdentityCard" style={{ fontSize: "8px" }}>
                                <div className="school-info w-100">
                                    <h5 style={{ marginBottom: "0px", fontWeight: 'bold', color: 'blue' }}>
                                        {latestMaster?.name || "SCHOOL NAME"}
                                    </h5>
                                    <div style={{ marginTop: '-5px' }}>(www.vamsheetechnoschool.com)</div>
                                    <div style={{ marginTop: '-2px' }}>{latestMaster?.address || "School Address"}</div>
                                    <div style={{ marginTop: '-2px' }} className="w-100 bg-dark text-light my-1 fw-bold">
                                        IDENTITY CARD: {selectedYear || "YYYY-YY"}
                                    </div>
                                </div>

                                <div className="" style={{ textAlign: 'start', width: '100%' }}>

                                    <img className="logo ms-1" src="https://i.ibb.co/cKvYrpsm/Screenshot-2023-10-21-085200.jpg" alt="..." />
                                    <img
                                        src={student.image}
                                        alt={student.name}
                                        className="student-id-image ms-2"
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
                                        <strong style={{ color: "blue", marginRight: "18px" }}>
                                            Adm No:
                                        </strong>
                                        {student.AdmissionNo}
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
                                        {formatDate(student.dob)}
                                    </div>
                                    <div>
                                        <strong style={{ color: "blue", marginRight: "24px" }}>
                                            Father:
                                        </strong>
                                        {fatherName}
                                    </div>
                                    <div>
                                        <strong style={{ color: "blue", marginRight: "21px" }}>
                                            Mother:
                                        </strong>
                                        {motherName}
                                    </div>
                                    <div>
                                        <strong style={{ color: "blue", marginRight: "23px" }}>
                                            Mobile:
                                        </strong>
                                        {phone}
                                    </div>
                                    <div>
                                        <strong style={{ color: "blue", marginRight: "10px" }}>Address:</strong>
                                        {address}
                                    </div>
                                </div>

                                <div className="principal-signature">
                                    <img src={principalSignature} alt="..." /> <div>(Principal)</div></div>

                                <div className="contact bg-dark w-100 text-light"> (Mb): {latestMaster?.phoneNo} | (Email): {latestMaster?.email}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
);

export default IdentityCardPage;
