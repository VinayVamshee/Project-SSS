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
    // helper for sub-question numbering
    const getSubLabel = (index) => {
      const roman = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)"];
      return roman[index] || `(${index + 1})`;
    };

    // recursive renderer (main + sub-questions)
    const renderQuestionWithSub = (q, idx, level = 0) => {
      const isMain = level === 0;
      const qNumber = isMain ? `Q${idx + 1}` : getSubLabel(idx);

      return (
        <div key={q.questionId || q._id || `${idx}-${level}`} style={{ marginBottom: "18px", marginLeft: level * 30, lineHeight: isMain ? "1.5" : "1", }}>
          {/* Question Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `${isMain ? "45px" : "30px"} 1fr 60px`,
              columnGap: "6px",
              alignItems: "start",
              marginBottom: "6px",
            }}
          >
            {/* Question number */}
            <div style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>{qNumber} {isMain ? '.' : null}</div>

            {/* Text + Image */}
            <div style={{ textAlign: "justify" }}>
              {q.questionText}
              {q.questionImage && (
                <div style={{ marginTop: "6px" }}>
                  <img
                    src={q.questionImage}
                    alt="question"
                    style={{ maxHeight: "160px", width: "auto", objectFit: "contain" }}
                  />
                </div>
              )}
            </div>

            {/* Marks */}
            {q.questionMarks && (
              <div style={{ textAlign: "right", fontWeight: "bold", whiteSpace: "nowrap" }}>
                ({q.questionMarks})
              </div>
            )}
          </div>

          {/* MCQs */}
          {q.questionType === "MCQ" && q.options?.length > 0 && (
            <div style={{ paddingLeft: "40px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {q.options.map((opt, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", width: "calc(50% - 12px)" }}>
                  <div style={{ fontWeight: "bold", marginRight: "6px" }}>({String.fromCharCode(65 + i)})</div>
                  {opt.imageUrl && (
                    <img
                      src={opt.imageUrl}
                      alt={`Option-${i}`}
                      style={{ height: "50px", width: "auto", objectFit: "contain", marginRight: "6px" }}
                    />
                  )}
                  <div>{opt.text}</div>
                </div>
              ))}
            </div>
          )}

          {/* Match the Following */}
          {q.questionType === "Match" && q.pairs?.length > 0 && (
            <div
              style={{
                marginTop: "10px",
                paddingLeft: isMain ? "45px" : "30px", // align with question text
                display: "grid",
                gridTemplateColumns: "1fr 1fr", // two equal columns
                columnGap: "60px",
                rowGap: "10px",
              }}
            >
              {q.pairs.map((pair, i) => (
                <React.Fragment key={i}>
                  {/* Left Side */}
                  <div style={{ display: "flex", alignItems: "center", textAlign: "left" }}>
                    {pair.leftImage && (
                      <img
                        src={pair.leftImage}
                        alt="Left"
                        style={{ height: "40px", width: "auto", objectFit: "contain", marginRight: "6px" }}
                      />
                    )}
                    <span>{pair.leftText}</span>
                  </div>

                  {/* Right Side */}
                  <div style={{ display: "flex", alignItems: "center", textAlign: "left" }}>
                    <span>{pair.rightText}</span>
                    {pair.rightImage && (
                      <img
                        src={pair.rightImage}
                        alt="Right"
                        style={{ height: "40px", width: "auto", objectFit: "contain", marginLeft: "6px" }}
                      />
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}


          {/* Sub-questions */}
          {q.subQuestions?.length > 0 && (
            <div style={{ marginTop: "10px", paddingLeft: "35px" }}>
              {q.subQuestions.map((subQ, subIdx) => renderQuestionWithSub(subQ, subIdx, level + 1))}
            </div>
          )}
        </div>
      );
    };

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

        {/* Render Questions */}
        {questions.map((q, i) => renderQuestionWithSub(q, i))}
      </div>
    );
  }
);

export default DownloadQuestionBank;
