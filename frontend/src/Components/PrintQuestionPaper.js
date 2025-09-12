import React, { forwardRef } from 'react';

const PrintQuestionPaper = forwardRef(
  (
    {
      sections = [],
      questionMap = {},
      selectedQuestions = [],
      fullWidthImagesMap = {},
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
      const isFullWidth = !!fullWidthImagesMap[q.questionId]; // ✅ image width check

      return (
        <div key={q.questionId || `${idx}-${level}`} className="mb-4" style={{ marginLeft: level * 32, lineHeight: isMain ? "1.3" : "1.3" }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `${isMain ? "45px" : "30px"} 1fr 60px`,  // left col for QNo, middle for text, right for marks
              columnGap: '8px',
              alignItems: 'start',
              marginBottom: '6px',
            }}
          >
            {/* Question number */}
            <div style={{ whiteSpace: 'nowrap', fontWeight: 'bold', }}>{qNumber} {isMain ? '.' : null} </div>

            {/* Question text wraps only here */}
            <div style={{ textAlign: "justify" }}>{q.questionText}
              {q.questionImage && (
                <div style={{ marginBottom: '12px', gridColumn: '3 / 4' }}>
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
            </div>

            {/* Marks aligned to right, no wrapping under text */}
            {q.questionMarks && (
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 'bold', }}>
                ({q.questionMarks} Marks)
              </div>
            )}
          </div>

          {q.questionType === 'MCQ' && (
            <div className="d-flex flex-wrap mt-2" style={{ gap: '12px', paddingLeft: '30px', }}>
              {q.options.map((opt, i) => (
                <div key={i} style={{ width: 'calc(25% - 12px)', display: 'flex' }}>
                  <div style={{ fontWeight: 'bold', marginRight: '6px' }}>
                    ({String.fromCharCode(65 + i)})
                  </div>
                  {opt.imageUrl && (
                    <img
                      src={opt.imageUrl}
                      alt={`Option-${i}`}
                      style={{ height: '50px', width: '50px', objectFit: 'contain', marginRight: '8px' }}
                    />
                  )}
                  <div>{opt.text}</div>
                </div>
              ))}
            </div>
          )}

          {q.questionType === 'Match' && (
            <div
              className="mt-3"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr", // two equal columns
                gap: "12px 40px", // row gap 12px, column gap 40px
                paddingLeft: isMain ? "70px" : "50px", // align with question text
              }}
            >
              {q.pairs.map((pair, i) => (
                <React.Fragment key={i}>
                  {/* Left Side */}
                  <div className="d-flex align-items-center" style={{ textAlign: "left" }}>
                    {pair.leftImage && (
                      <img
                        src={pair.leftImage}
                        alt="Left"
                        style={{ height: '36px', width: '36px', objectFit: 'contain', marginRight: '8px' }}
                      />
                    )}
                    <span>{pair.leftText}</span>
                  </div>

                  {/* Right Side */}
                  <div className="d-flex align-items-center" style={{ textAlign: "left" }}>
                    <span>{pair.rightText}</span>
                    {pair.rightImage && (
                      <img
                        src={pair.rightImage}
                        alt="Right"
                        style={{ height: '36px', width: '36px', objectFit: 'contain', marginLeft: '8px' }}
                      />
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}


          {q.subQuestions?.length > 0 && (
            <div className="mt-3" style={{ paddingLeft: '30px' }}>
              {q.subQuestions
                .filter(sub => selectedQuestions.includes(sub.questionId)) // ✅ only selected sub-questions will render
                .map((subQ, subIdx) => renderQuestionWithSub(subQ, subIdx, level + 1))
              }
            </div>
          )}
        </div>
      );
    };

    return (
      <div
        ref={ref}
        className="print-container"
        style={{
          padding: '30px 20px',
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: '16px',
          lineHeight: '1.6'
        }}
      >
        {/* Heading */}
        <div className="mb-1 text-center">
          <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
            {schoolLogo && (
              <img
                src={schoolLogo}
                alt="School Logo"
                style={{ height: '60px', width: '60px', objectFit: 'cover', borderRadius: '50%', overflow: 'hidden' }}
              />
            )}
            {schoolName && <h3 className="mb-0" style={{ fontFamily: '"Times New Roman", Times, serif' }}>{schoolName}</h3>}
          </div>

          {address && <p className="mb-1" style={{marginTop:'-10px'}}><strong style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '20px' }}>{address}</strong></p>}
          {examTitle && <p className="mb-1" style={{marginTop:'-10px'}}><strong style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '20px' }}>{examTitle}</strong></p>}

          {/* 🔹 Line 1 → Name, Date, Roll No */}
          <div
            className="d-flex justify-content-between mb-1"
            style={{ borderBottom: '0.5px solid grey', paddingBottom: '4px' }}
          >
            <span><strong>Name:</strong></span>
            <span style={{ marginLeft: '100px' }}><strong>Date:</strong> {examDate}</span>
            <span style={{ marginRight: '100px' }}><strong>Roll No:</strong></span>
          </div>

          {/* 🔹 Line 2 → Class, Subject, Max Marks */}
          <div
            className="d-flex justify-content-between mb-2"
            style={{ borderBottom: '0.5px solid grey', paddingBottom: '4px' }}
          >
            <span><strong>Class:</strong> {selectedClass}</span>
            <span><strong>Subject:</strong> {selectedSubject}</span>
            <span><strong>Max Marks:</strong> {maxMarks}</span>
          </div>
        </div>

        {/* Instructions */}
        {instructions.length > 0 && (
          <>
            <div className="mb-1">
              <h5 className='text-center'>Instructions:</h5>
              <ul style={{ paddingLeft: '20px' }}>
                {instructions.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ul>
            </div>
            <hr />
          </>
        )}

        {/* Section-wise Questions */}
        {sections.map((section, secIdx) => {
          const questionsInSection = section.questionIds
            ?.map(id => questionMap[id])
            ?.filter(q => q && selectedQuestions.includes(q.questionId));

          if (!questionsInSection || questionsInSection.length === 0) return null;

          return (
            <div key={secIdx} className="mb-3">
              <h5 className="text-decoration-underline mb-3 text-center">{section.title}</h5>
              {questionsInSection.map((q, i) => renderQuestionWithSub(q, i))}
            </div>
          );
        })}

        {/* 🔹 Render Unassigned Selected Questions */}
        {(() => {
          const sectionQuestionIds = new Set(
            sections.flatMap(section => section.questionIds || [])
          );

          const unassignedQuestions = selectedQuestions
            .filter(qid => !sectionQuestionIds.has(qid))
            .map(qid => questionMap[qid])
            .filter(Boolean); // remove undefined

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