import React, { forwardRef } from 'react';

const PrintQuestionPaper = forwardRef(
  (
    {
      sections = [],
      questionMap = {},
      selectedQuestions = [],
      fullWidthImagesMap = {},
      schoolName = '',
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
        <div key={q.questionId || `${idx}-${level}`} className="mb-4" style={{ marginLeft: level * 32 }}>
          <div className="d-flex justify-content-between" style={{ fontWeight: 'bold', marginBottom: '6px' }}>
            <span>{qNumber}. {q.questionText}</span>
            {q.questionMarks && <span>({q.questionMarks} Marks)</span>}
          </div>
          {q.questionImage && (
            <div style={{ marginBottom: '12px' }}>
              <img
                src={q.questionImage}
                alt="Question"
                style={{
                  maxHeight: isFullWidth ? '400px' : '100px',
                  width: isFullWidth ? '100%' : 'auto',
                  objectFit: 'contain',
                  marginTop: '4px',
                  display: 'block',       // ⬅️ Forces block display
                  paddingLeft: '30px',          // ⬅️ Ensures left-aligned
                  marginRight: 'auto'     // ⬅️ Prevents centering
                }}
              />
            </div>
          )}
          {q.questionType === 'MCQ' && (
            <div className="d-flex flex-wrap mt-2" style={{ gap: '12px' }}>
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
            <div className="mt-3 d-flex flex-column gap-2">
              {q.pairs.map((pair, i) => (
                <div key={i} className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center" style={{ width: '45%' }}>
                    {pair.leftImage && (
                      <img
                        src={pair.leftImage}
                        alt="Left"
                        style={{ height: '36px', width: '36px', objectFit: 'contain', marginRight: '8px' }}
                      />
                    )}
                    <span>{pair.leftText}</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-end" style={{ width: '45%' }}>
                    <span>{pair.rightText}</span>
                    {pair.rightImage && (
                      <img
                        src={pair.rightImage}
                        alt="Right"
                        style={{ height: '36px', width: '36px', objectFit: 'contain', marginLeft: '8px' }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {q.subQuestions?.length > 0 && (
            <div className="mt-3">
              {q.subQuestions.map((subQ, subIdx) => renderQuestionWithSub(subQ, subIdx, level + 1))}
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
          padding: '48px',
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: '16px',
          lineHeight: '1.6'
        }}
      >
        {/* Heading */}
        <div className="text-center mb-1">
          {schoolName && <h3 className="" style={{marginBottom:'1px'}}>{schoolName}</h3>}
          {address && <p className="" style={{marginBottom:'1px'}}>{address}</p>}
          {examTitle && <p className="" style={{marginBottom:'1px'}}><strong>{examTitle}</strong></p>}
          <div className="d-flex justify-content-between mb-2" style={{borderBottom:'0.5px solid grey'}}>
            <span><strong>Name:</strong></span>
            <span style={{ marginRight: '150px' }}><strong>Roll No:</strong></span>
          </div>
        </div>

        {/* Date & Subject */}
        <div className="d-flex justify-content-between mb-2">
          <span><strong>Date:</strong> {examDate}</span>
          <span><strong>Time:</strong> {examTime}</span>
        </div>
        <div className="d-flex justify-content-between mb-1" style={{borderBottom:'0.5px solid grey'}}>
          <span><strong>Class:</strong> {selectedClass}</span>
          <span><strong>Subject:</strong> {selectedSubject}</span>
          <span><strong>Max Marks:</strong> {maxMarks}</span>
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