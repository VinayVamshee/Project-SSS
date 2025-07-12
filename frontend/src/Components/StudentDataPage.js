import React, { forwardRef } from "react";

const StudentDataPage = forwardRef(
  ({ selectedStudents, selectedFields, students, selectedYear, latestMaster }, ref) => {
    const filteredStudents = students.filter((s) =>
      selectedStudents.includes(s._id)
    );

    const getFieldValue = (student, field) => {
      if (field === "academicYear" || field === "class") {
        const yearEntry = student.academicYears.find(
          (y) => y.academicYear === selectedYear
        );
        return field === "academicYear"
          ? yearEntry?.academicYear || "N/A"
          : yearEntry?.class || "N/A";
      } else if (field.startsWith("additional_")) {
        const key = field.replace("additional_", "");
        return (
          student.additionalInfo?.find((info) => info.key === key)?.value ||
          "N/A"
        );
      } else {
        return student[field] || "N/A";
      }
    };

    return (
      <div ref={ref} className="student-pdf-print p-4 bg-white">
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

                .student-pdf-print, .student-pdf-print * {
                    visibility: visible;
                }

                .student-pdf-print {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                }
            }

            .student-pdf-print {
                font-family: 'Times New Roman', Times, serif;
            }

            .student-pdf-print h3,
            .student-pdf-print h5,
            .student-pdf-print p,
            .student-pdf-print table,
            .student-pdf-print th,
            .student-pdf-print td {
                font-family: 'Times New Roman', Times, serif !important;
            }

            .custom-scroll-table {
                overflow-x: auto;
                min-width: 100%;
            }

            .student-pdf-print table {
                font-size: 10px;
                table-layout: auto;
                width: 100%;
                border-collapse: collapse;
            }

            .student-pdf-print th,
            .student-pdf-print td {
                white-space: normal !important;
                word-break: break-word;
                padding: 6px !important;
                border: 1px solid #000 !important;
                text-align: left;
            }

            .student-pdf-print h3 {
                text-align: center;
                margin-bottom: 5px;
                font-weight: bold;
            }

            .student-pdf-print h5 {
                text-align: center;
                margin-bottom: 20px;
                font-weight: bold;
            }

            .student-pdf-print .school-header {
                text-align: center;
                margin-bottom: 20px;
            }

            .student-pdf-print .school-header p {
                margin: 0;
                font-size: 10px;
            }
        `}
        </style>

        {/* School Info Header */}
        <div className="school-header">
          <h3>{latestMaster?.name || "School Name"}</h3>
          <p>{latestMaster?.address || "School Address"}</p>
          <p>
            {latestMaster?.phoneNo || "Phone"} | {latestMaster?.email || "Email"}
          </p>
        </div>

        <h5>Student Data</h5>

        <div className="custom-scroll-table">
          <table className="table table-bordered table-striped">
            <thead className="table-light">
              <tr>
                {selectedFields.map((field, i) => (
                  <th key={i} className="text-capitalize">
                    {field.startsWith("additional_")
                      ? field.replace("additional_", "").replace(/_/g, " ")
                      : field.replace(/([A-Z])/g, " $1")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, index) => (
                <tr key={index}>
                  {selectedFields.map((field, i) => (
                    <td key={i}>{getFieldValue(student, field)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);

export default StudentDataPage;
