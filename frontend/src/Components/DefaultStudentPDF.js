import React, { forwardRef } from "react";

const DefaultStudentPDF = forwardRef(
    ({ selectedStudents, students, selectedYear, latestMaster }, ref) => {
        const filteredStudents = students
            .filter((s) => selectedStudents.includes(s._id))
            .sort((a, b) =>
                (a.AdmissionNo || "").localeCompare(b.AdmissionNo || "", undefined, {
                    numeric: true,
                })
            );

        const formatDate = (dateInput) => {
            if (!dateInput) return "";
            const date = new Date(dateInput);
            const day = String(date.getDate()).padStart(2, "0");
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        };

        const getFieldValue = (student, field) => {
            if (field.startsWith("additional_")) {
                const key = field.replace("additional_", "");
                return student.additionalInfo?.find((info) => info.key === key)?.value || "";
            }

            // Add special mapping for firstAdmissionClass and firstAdmissionDate
            if (field === "firstAdmissionClass") {
                return student.additionalInfo?.find(info => info.key === "AClass")?.value || "";
            }
            if (field === "firstAdmissionDate") {
                return formatDate(student.additionalInfo?.find(info => info.key === "ADate")?.value);
            }

            if (field === "dob") return formatDate(student.dob);
            if (field === "currentClass") {
                const yearEntry = student.academicYears?.[student.academicYears.length - 1];
                return yearEntry?.class || "";
            }
            return student[field] || "";
        };


        const columns = [
            { key: "sNo", label: "S.No" },
            { key: "AdmissionNo", label: "Admission No.", nowrap: true },
            { key: ["firstAdmissionClass", "firstAdmissionDate"], label: "Adm. in Class / Admission Dt.", vertical: true, nowrap: true },
            { key: "currentClass", label: "Class", nowrap: true },
            { key: ["name", "nameHindi"], label: "Name [English] / Name [Hindi]", vertical: true },
            { key: ["additional_Father's Name", "additional_Mother's Name"], label: "Father / Mother", vertical: true },
            { key: "dob", label: "DOB", nowrap: true },
            { key: "gender", label: "Gender" },
            { key: ["Caste", "CasteHindi"], label: "Caste Eng / Caste Hindi", vertical: true },
            { key: ["category", "aadharNo"], label: "Category / Aadhar No.", nowrap: true, vertical: true },
            { key: ["additional_Address", "permanentAddress"], label: "Address / Permanent Address", width: "18%" },
        ];

        return (
            <div ref={ref} className="student-pdf-print p-2 bg-white">
                <style>
                    {`
            @media print {
              @page { size: A3 landscape; margin: 2mm; }
              body * { visibility: hidden; }
              .student-pdf-print, .student-pdf-print * { visibility: visible; }
              .student-pdf-print { position: absolute; left: 0; top: 0; width: 100%; }
            }
            .student-pdf-print { font-family: 'Times New Roman', Times, serif; }
            .student-pdf-print table { font-size: 9px; table-layout: auto; width: 100%; border-collapse: collapse; }
            .student-pdf-print th, .student-pdf-print td { padding: 1px 2px !important; border: 1px solid #000 !important; text-align: center; vertical-align: middle; }
            .student-pdf-print h3, .student-pdf-print h5 { text-align: center; font-weight: bold; margin-bottom: 5px; }
            .student-pdf-print .school-header { text-align: center; margin-bottom: 5px; }
            .student-pdf-print .school-header p { margin: 0; font-size: 9px; text-align: center; }
          `}
                </style>

                <div className="school-header">
                    <h3>{latestMaster?.name || "School Name"}</h3>
                    <p>{latestMaster?.address || "School Address"}</p>
                    <p>{latestMaster?.phoneNo || "Phone"} | {latestMaster?.email || "Email"}</p>
                </div>

                <h5>Student Data</h5>

                <div className="custom-scroll-table">
                    <table className="table table-bordered">
                        <thead>
                            <tr>
                                {columns.map((col, idx) => (
                                    <th
                                        key={idx}
                                        style={{
                                            textAlign: "center",
                                            width: col.width || "auto",
                                            whiteSpace: col.nowrap ? "nowrap" : "normal",
                                        }}
                                    >
                                        {col.vertical && Array.isArray(col.key)
                                            ? col.key.map((k, i) => {
                                                if (k === "name") return <div key={i}>Name in English</div>;
                                                if (k === "nameHindi") return <div key={i}>Name in Hindi</div>;
                                                if (k === "additional_Father's Name") return <div key={i}>Father's Name</div>;
                                                if (k === "additional_Mother's Name") return <div key={i}>Mother's Name</div>;
                                                if (k === "Caste") return <div key={i}>Caste English</div>;
                                                if (k === "CasteHindi") return <div key={i}>Caste Hindi</div>;
                                                if (k === "firstAdmissionClass") return <div key={i}>Admission Class</div>;
                                                if (k === "firstAdmissionDate") return <div key={i}>Admission Date</div>;
                                                if (k === "category") return <div key={i}>Category</div>;
                                                if (k === "aadharNo") return <div key={i}>Aadhar No.</div>;
                                                return <div key={i}>{k}</div>;
                                            })
                                            : col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((student, index) => (
                                <tr key={index}>
                                    {columns.map((col, idx) => {
                                        if (col.key === "sNo") return <td key={idx}>{index + 1}</td>;

                                        if (Array.isArray(col.key)) {
                                            return (
                                                <td
                                                    key={idx}
                                                    style={{
                                                        textAlign: "left",
                                                        width: col.width || "auto",
                                                        whiteSpace: col.nowrap ? "nowrap" : "normal",
                                                    }}
                                                >
                                                    {col.key.map((k, i) => {
                                                        if (col.vertical) {
                                                            return <div key={i}>{getFieldValue(student, k)}</div>;
                                                        }
                                                        if (["firstAdmissionClass", "firstAdmissionDate", "currentClass", "dob", "AdmissionNo", "aadharNo"].includes(k)) {
                                                            return (
                                                                <span key={i} style={{ whiteSpace: "nowrap" }}>
                                                                    {getFieldValue(student, k)}
                                                                </span>
                                                            );
                                                        }
                                                        return <span key={i}>{getFieldValue(student, k)}</span>;
                                                    })}
                                                </td>
                                            );
                                        }

                                        return (
                                            <td
                                                key={idx}
                                                style={{
                                                    textAlign: "left",
                                                    width: col.width || "auto",
                                                    whiteSpace: col.nowrap ? "nowrap" : "normal",
                                                }}
                                            >
                                                {getFieldValue(student, col.key)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
);

export default DefaultStudentPDF;
