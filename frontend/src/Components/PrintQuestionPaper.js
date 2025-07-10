import React, { forwardRef } from 'react';

const PrintQuestionPaper = forwardRef(({ questions = [], selectedQuestions = [] }, ref) => {
  const filtered = questions.filter(q => selectedQuestions.includes(q._id));

  return (
    <div ref={ref} className="print-container">
      <h2 className="text-center mb-4">Question Paper</h2>

      {filtered.map((q, idx) => (
        <div key={q._id} className="mb-4">
          {/* Question Text */}
          <p style={{ fontWeight: 'bold', marginBottom: '6px' }}>
            Q{idx + 1}. {q.questionText}
          </p>

          {/* Question Image BELOW the text - smaller */}
          {q.questionImage && (
            <div style={{ marginBottom: '12px' }}>
              <img
                src={q.questionImage}
                alt="Question"
                style={{
                  maxHeight: '100px', // smaller
                  maxWidth: '100%',
                  objectFit: 'contain',
                  marginTop: '4px',
                }}
              />
            </div>
          )}

          {/* MCQ Options */}
          {q.questionType === 'MCQ' && (
            <div
              className="d-flex flex-wrap mt-2"
              style={{ gap: '12px', marginLeft: '4px', marginRight: '4px' }}
            >
              {q.options.map((opt, i) => (
                <div
                  key={i}
                  style={{
                    width: 'calc(25% - 12px)', // 4 per row
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
                        height: '50px', // increased
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
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {q.pairs.map((pair, i) => (
                <div key={i} className="d-flex justify-content-between align-items-center">
                  {/* Left */}
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

                  {/* Right */}
                  <div
                    className="d-flex align-items-center justify-content-end"
                    style={{ width: '45%' }}
                  >
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
});

export default PrintQuestionPaper;
