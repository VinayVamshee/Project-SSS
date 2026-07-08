import React, { forwardRef } from 'react';

const PrintQuestionPaper = forwardRef(
  (
    {
      sections = [],
      questionMap = {},
      selectedQuestions = [],
      imageSizesMap = {},
      addAnsLine = [],
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
      const customWidth = imageSizesMap[q.questionId] || '120px';

      const answerConfig = addAnsLine.find(a => a.QuestionId === q.questionId);
      const answerLines = answerConfig?.lines || 0;

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
            <div style={{ textAlign: "justify", whiteSpace: 'pre-wrap' }}>
              <div
                className="question-content"
                dangerouslySetInnerHTML={{
                  __html: q.questionText
                }}
              />
              {q.questionImage && (
                <div style={{ marginBottom: '12px', gridColumn: '3 / 4' }}>
                  <img
                    src={q.questionImage}
                    alt="Question"
                    style={{
                      width: customWidth,
                      maxWidth: '100%',
                      height: 'auto',
                      objectFit: 'contain',
                      marginTop: '4px',
                      display: 'block'
                    }}
                  />
                </div>
              )}

              {/* ✅ Answer Section */}
              {answerLines > 0 && (
                <div style={{ marginTop: '6px' }}>
                  {Array.from({ length: answerLines }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        borderBottom: '1px solid gray',
                        margin: i === answerLines - 1 ? '18px 0 0 0' : '30px 0',
                        width: '100%',
                      }}
                    ></div>
                  ))}
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
        className=""
        style={{
          padding: '15px 40px',   // 🔹 Narrow margin around paper
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#000000',
          backgroundColor: '#ffffff'
        }}
      >

        {/* Heading */}
        <div className="mb-1 text-center" style={{ color: '#000000' }}>
          <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
            {schoolLogo && (
              <img
                src={schoolLogo}
                alt="School Logo"
                style={{ height: '60px', width: '60px', objectFit: 'cover', borderRadius: '50%', overflow: 'hidden' }}
              />
            )}
            {schoolName && <h3 className="mb-0" style={{ fontFamily: '"Times New Roman", Times, serif', color: '#000000' }}>{schoolName}</h3>}
          </div>

          {address && <p className="mb-1" style={{ marginTop: '-10px', color: '#000000' }}><strong style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '20px' }}>{address}</strong></p>}
          {examTitle && <p className="mb-1" style={{ marginTop: '-10px', color: '#000000' }}><strong style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '20px' }}>{examTitle}</strong></p>}

          {/* 🔹 Line 1 → Name, Date, Roll No */}
          <div
            className="d-flex justify-content-between mb-1"
            style={{ borderBottom: '0.5px solid grey', paddingBottom: '4px', color: '#000000' }}
          >
            <span><strong>Name:</strong></span>
            <span style={{ marginLeft: '100px' }}><strong>Date:</strong> {examDate}</span>
            <span style={{ marginRight: '100px' }}><strong>Roll No:</strong></span>
          </div>

          {/* 🔹 Line 2 → Class, Subject, Max Marks */}
          <div
            className="d-flex justify-content-between mb-2"
            style={{ borderBottom: '0.5px solid grey', paddingBottom: '4px', color: '#000000' }}
          >
            <span><strong>Class:</strong> {selectedClass}</span>
            <span><strong>Subject:</strong> {selectedSubject}</span>
            <span><strong>Max Marks:</strong> {maxMarks}</span>
          </div>
        </div>

        {/* Instructions */}
        {instructions.length > 0 && (
          <div style={{ color: '#000000' }}>
            <div className="mb-1">
              <h5 className='text-center' style={{ color: '#000000' }}>Instructions:</h5>
              <ul style={{ paddingLeft: '20px', color: '#000000' }}>
                {instructions.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ul>
            </div>
            <hr style={{ borderColor: '#000000' }} />
          </div>
        )}

        {/* Section-wise Questions */}
        {(() => {
          let globalQIdx = 0;
          return sections.map((section, secIdx) => {
            const questionsInSection = section.questionIds
              ?.map(id => questionMap[id])
              ?.filter(q => q && selectedQuestions.includes(q.questionId));

            if (!questionsInSection || questionsInSection.length === 0) return null;

            return (
              <div key={secIdx} className="mb-3" style={{ color: '#000000' }}>
                <h5 className="text-decoration-underline mb-3 text-center" style={{ color: '#000000' }}>{section.title}</h5>
                {questionsInSection.map((q) => {
                  const el = renderQuestionWithSub(q, globalQIdx);
                  globalQIdx++;
                  return el;
                })}
              </div>
            );
          });
        })()}

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

          const renderedInSectionsCount = sections.reduce((acc, section) => {
            const count = section.questionIds
              ?.map(id => questionMap[id])
              ?.filter(q => q && selectedQuestions.includes(q.questionId))?.length || 0;
            return acc + count;
          }, 0);

          let globalQIdx = renderedInSectionsCount;

          return (
            <div className="mb-5" style={{ color: '#000000' }}>
              {unassignedQuestions.map((q) => {
                const el = renderQuestionWithSub(q, globalQIdx);
                globalQIdx++;
                return el;
              })}
            </div>
          );
        })()}
      </div>
    );
  }
);

export default PrintQuestionPaper;