import React, { forwardRef } from 'react';

const PrintQuestionPaper = forwardRef(
  (
    {
      sections = [],
      questionMap = {},
      selectedQuestions = [],
      fullWidthImagesMap = {},
      addAnsLine = [],          // ✅ new prop
      schoolName = '',
      schoolLogo = '',
      address = '',
      examTitle = '',
      examDate = '',
      examTime = '',
      maxMarks = '',
      instructions = [],
      selectedClass = '',
      selectedSubject = '',
    },
    ref
  ) => {
    const getSubLabel = (index) => {
      const roman = ['(i)', '(ii)', '(iii)', '(iv)', '(v)', '(vi)', '(vii)', '(viii)', '(ix)', '(x)'];
      return roman[index] || `(${index + 1})`;
    };

    const renderQuestionWithSub = (q, idx, level = 0) => {
      const isMain = level === 0;
      const qNumber = isMain ? `Q${idx + 1}` : getSubLabel(idx);
      const isFullWidth = !!fullWidthImagesMap[q.questionId];

      // ✅ Check if this question has answer lines
      const answerConfig = addAnsLine.find(a => a.QuestionId === q.questionId);
      const answerLines = answerConfig?.lines || 0;

      return (
        <div
          key={q.questionId || `${idx}-${level}`}
          className="mb-4"
          style={{ marginLeft: level * 32, lineHeight: isMain ? "1.3" : "1.3" }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `${isMain ? "45px" : "30px"} 1fr 60px`,
              columnGap: '8px',
              alignItems: 'start',
              marginBottom: '6px',
            }}
          >
            {/* Question number */}
            <div style={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}>
              {qNumber} {isMain ? '.' : null}
            </div>

            {/* Question text */}
            <div style={{ textAlign: "justify", whiteSpace: 'pre-wrap' }}>
              {q.questionText}

              {q.questionImage && (
                <div style={{ marginBottom: '12px' }}>
                  <img
                    src={q.questionImage}
                    alt="Question"
                    style={{
                      maxHeight: isFullWidth ? '400px' : '120px',
                      width: isFullWidth ? '100%' : 'auto',
                      objectFit: 'contain',
                      marginTop: '4px',
                      display: 'block'
                    }}
                  />
                </div>
              )}

              {/* ✅ Answer Section */}
              {answerLines > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ marginTop: '6px' }}>
                    {Array.from({ length: answerLines }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          borderBottom: '1px solid gray',
                          margin: '22px 0',
                          width: '100%',
                        }}
                      ></div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Marks column */}
            {q.questionMarks && (
              <div
                style={{
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                  fontWeight: 'bold',
                }}
              >
                ({q.questionMarks} Marks)
              </div>
            )}
          </div>

          {/* MCQ Options */}
          {q.questionType === 'MCQ' && (
            <div
              className="d-flex flex-wrap mt-2"
              style={{ gap: '12px', paddingLeft: '30px' }}
            >
              {q.options.map((opt, i) => (
                <div key={i} style={{ width: 'calc(25% - 12px)', display: 'flex' }}>
                  <div style={{ fontWeight: 'bold', marginRight: '6px' }}>
                    ({String.fromCharCode(65 + i)})
                  </div>
                  {opt.imageUrl && (
                    <img
                      src={opt.imageUrl}
                      alt={`Option-${i}`}
                      style={{
                        height: '50px',
                        width: '50px',
                        objectFit: 'contain',
                        marginRight: '8px',
                      }}
                    />
                  )}
                  <div>{opt.text}</div>
                </div>
              ))}
            </div>
          )}

          {/* Match the Following */}
          {q.questionType === 'Match' && (
            <div
              className="mt-3"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px 40px",
                paddingLeft: isMain ? "70px" : "50px",
              }}
            >
              {q.pairs.map((pair, i) => (
                <React.Fragment key={i}>
                  <div className="d-flex align-items-center" style={{ textAlign: "left" }}>
                    {pair.leftImage && (
                      <img
                        src={pair.leftImage}
                        alt="Left"
                        style={{
                          height: '36px',
                          width: '36px',
                          objectFit: 'contain',
                          marginRight: '8px',
                        }}
                      />
                    )}
                    <span>{pair.leftText}</span>
                  </div>
                  <div className="d-flex align-items-center" style={{ textAlign: "left" }}>
                    <span>{pair.rightText}</span>
                    {pair.rightImage && (
                      <img
                        src={pair.rightImage}
                        alt="Right"
                        style={{
                          height: '36px',
                          width: '36px',
                          objectFit: 'contain',
                          marginLeft: '8px',
                        }}
                      />
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Sub-Questions */}
          {q.subQuestions?.length > 0 && (
            <div className="mt-3" style={{ paddingLeft: '30px' }}>
              {q.subQuestions
                .filter(sub => selectedQuestions.includes(sub.questionId))
                .map((subQ, subIdx) => renderQuestionWithSub(subQ, subIdx, level + 1))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div
        ref={ref}
        style={{
          padding: '15px 40px',
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: '16px',
          lineHeight: '1.6',
        }}
      >
        {/* 🔹 Header */}
        {/* ... (your header & instructions code remains the same) ... */}

        {/* 🔹 Sections */}
        {sections.map((section, secIdx) => {
          const questionsInSection = section.questionIds
            ?.map(id => questionMap[id])
            ?.filter(q => q && selectedQuestions.includes(q.questionId));

          if (!questionsInSection || questionsInSection.length === 0) return null;

          return (
            <div key={secIdx} className="mb-3">
              <h5 className="text-decoration-underline mb-3 text-center">
                {section.title}
              </h5>
              {questionsInSection.map((q, i) => renderQuestionWithSub(q, i))}
            </div>
          );
        })}

        {/* 🔹 Orphan questions */}
        {(() => {
          const sectionQuestionIds = new Set(
            sections.flatMap(section => section.questionIds || [])
          );

          const unassignedQuestions = selectedQuestions
            .filter(qid => !sectionQuestionIds.has(qid))
            .map(qid => questionMap[qid])
            .filter(Boolean);

          if (unassignedQuestions.length === 0) return null;

          return (
            <div className="mb-5">
              {unassignedQuestions.map((q, i) => renderQuestionWithSub(q, i))}
            </div>
          );
        })()}
      </div>
    );
  }
);

export default PrintQuestionPaper;