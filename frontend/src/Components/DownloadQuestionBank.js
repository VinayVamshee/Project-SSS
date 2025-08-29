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
          padding: "20px 25px",
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: "15px",
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
            style={{ marginBottom: "15px" }}
          >
            {/* Question row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "35px 80px 1fr 60px",
                columnGap: "4px",
                alignItems: "start",
              }}
            >
              {/* Question number */}
              <div style={{ whiteSpace: "nowrap", fontWeight: "bold" }}>
                Q{i + 1}.
              </div>

              {/* Question ID */}
              <div style={{ fontStyle: "italic", color: "#555" }}>
                {q.questionId || "-"}
              </div>

              {/* Question text + image */}
              <div style={{ textAlign: "justify" }}>
                {q.questionText}

                {q.questionImage && (
                  <div style={{ marginTop: "6px" }}>
                    <img
                      src={q.questionImage}
                      alt="question"
                      style={{
                        height: "150px",
                        width: "auto",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                )}
              </div>

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

            {/* MCQ Options */}
            {q.questionType === "MCQ" && q.options && (
              <div
                className="d-flex flex-wrap mt-2"
                style={{ gap: "12px", paddingLeft: "40px" }}
              >
                {q.options.map((opt, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: "calc(50% - 12px)",
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <div style={{ fontWeight: "bold", marginRight: "6px" }}>
                      ({String.fromCharCode(65 + idx)})
                    </div>
                    {opt.imageUrl && (
                      <img
                        src={opt.imageUrl}
                        alt={`Option-${idx}`}
                        style={{
                          height: "60px",
                          width: "auto",
                          objectFit: "contain",
                          marginRight: "8px",
                        }}
                      />
                    )}
                    <div>{opt.text}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Match the Following */}
            {q.questionType === "Match" && q.pairs && (
              <div
                className="mt-2 d-flex flex-column gap-2"
                style={{ paddingLeft: "40px" }}
              >
                {q.pairs.map((pair, idx) => (
                  <div
                    key={idx}
                    className="d-flex justify-content-start align-items-center"
                    style={{ gap: "80px" }}
                  >
                    {/* Left side */}
                    <div className="d-flex align-items-center">
                      {pair.leftImage && (
                        <img
                          src={pair.leftImage}
                          alt="Left"
                          style={{
                            height: "60px",
                            width: "auto",
                            objectFit: "contain",
                            marginRight: "6px",
                          }}
                        />
                      )}
                      <span>{pair.leftText}</span>
                    </div>

                    {/* Right side */}
                    <div className="d-flex align-items-center">
                      <span>{pair.rightText}</span>
                      {pair.rightImage && (
                        <img
                          src={pair.rightImage}
                          alt="Right"
                          style={{
                            height: "60px",
                            width: "auto",
                            objectFit: "contain",
                            marginLeft: "6px",
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
);

export default DownloadQuestionBank;
