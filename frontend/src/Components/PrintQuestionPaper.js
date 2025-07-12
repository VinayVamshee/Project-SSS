import React, { forwardRef } from 'react';

const PrintQuestionPaper = forwardRef(
  (
    {
      questions = [],
      selectedQuestions = [],
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
    const filtered = questions.filter(q => selectedQuestions.includes(q._id));

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
        {/* School Heading */}
        <div className="text-center mb-3">
          {schoolName && <h3 className="mb-1">{schoolName}</h3>}
          {address && <p className="mb-1">{address}</p>}
          {examTitle && (
            <p className="mb-2"><strong>{examTitle}</strong></p>
          )}

          {/* Name & Roll No */}
          <div className="d-flex justify-content-between mb-2">
            <span><strong>Name:</strong> ______________________</span>
            <span><strong>Roll No:</strong> ______________________</span>
          </div>
        </div>
        <hr />

        {/* Date & Time */}
        <div className="d-flex justify-content-between mb-2">
          <span><strong>Date:</strong> {examDate}</span>
          <span><strong>Time:</strong> {examTime}</span>
        </div>

        {/* Class & Subject */}
        <div className="d-flex justify-content-between mb-1">
          <span><strong>Class:</strong> {selectedClass}</span>
          <span><strong>Subject:</strong> {selectedSubject}</span>
        </div>

        {/* Max Marks */}
        <div className="d-flex justify-content-end mb-2">
          <span><strong>Max Marks:</strong> {maxMarks}</span>
        </div>

        <hr />
        {/* Instructions */}
        {instructions.length > 0 && (
          <>
            <div className="mb-2">
              <h5 style={{ textDecoration: 'underline' }}>Instructions:</h5>
              <ul style={{ paddingLeft: '20px' }}>
                {instructions.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ul>
            </div>
            <hr />
          </>
        )}

        {/* Questions */}
        {filtered.map((q, idx) => (
          <div key={q._id} className="mb-4">
            <div className="d-flex justify-content-between" style={{ fontWeight: 'bold', marginBottom: '6px' }}>
              <span>Q{idx + 1}. {q.questionText}</span>
              {q.questionMarks && <span>({q.questionMarks} Marks)</span>}
            </div>

            {q.questionImage && (
              <div style={{ marginBottom: '12px' }}>
                <img
                  src={q.questionImage}
                  alt="Question"
                  style={{
                    maxHeight: '100px',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    marginTop: '4px',
                  }}
                />
              </div>
            )}

            {/* MCQ Options */}
            {q.questionType === 'MCQ' && (
              <div className="d-flex flex-wrap mt-2" style={{ gap: '12px' }}>
                {q.options.map((opt, i) => (
                  <div
                    key={i}
                    style={{
                      width: 'calc(25% - 12px)',
                      display: 'flex',
                      alignItems: 'flex-start',
                    }}
                  >
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
              <div className="mt-3 d-flex flex-column gap-2">
                {q.pairs.map((pair, i) => (
                  <div key={i} className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center" style={{ width: '45%' }}>
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

                    <div className="d-flex align-items-center justify-content-end" style={{ width: '45%' }}>
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

export default PrintQuestionPaper;