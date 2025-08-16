import React, { forwardRef } from "react";

const DownloadQuestionBank = forwardRef(
  (
    {
      questions = [],
      selectedClass = "",
      selectedSubject = "",
      selectedChapter = "",
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        style={{
          padding: "20px 25px", // reduced padding (top/bottom 20px, left/right 25px)
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: "15px", // slightly smaller text
          lineHeight: "1.5",
        }}
      >
        {/* Header */}
        <div className="text-center mb-3">
          <h3>Question Bank</h3>
          <p>
            <strong>Class:</strong> {selectedClass} &nbsp;&nbsp;
            <strong>Chapter:</strong> {selectedChapter} &nbsp;&nbsp;
            <strong>Subject:</strong> {selectedSubject}
          </p>
          <hr />
        </div>

        {/* Questions */}
        {questions.map((q, i) => (
          <div
            key={q._id || q.questionId || i}
            style={{
              display: "grid",
              gridTemplateColumns: "35px 100px 1fr 60px", // narrower columns
              columnGap: "4px", // reduced gap
              alignItems: "start",
              marginBottom: "8px", // tighter spacing
            }}
          >
            {/* Question number */}
            <div style={{ whiteSpace: "nowrap", fontWeight: "bold" }}>
              Q{i + 1}.
            </div>

            {/* Question ID */}
            <div style={{ fontStyle: "italic", color: "#555" }}>
              ID: {q.questionId || "-"}
            </div>

            {/* Question text */}
            <div style={{ textAlign: "justify" }}>{q.questionText}</div>

            {/* Marks */}
            {q.questionMarks && (
              <div
                style={{
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                }}
              >
                ({q.questionMarks})
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
);

export default DownloadQuestionBank;
