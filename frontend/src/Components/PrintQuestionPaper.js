import React, { forwardRef } from 'react';

const PrintQuestionPaper = forwardRef(({ questions = [], selectedQuestions = [] }, ref) => {
    const filtered = questions.filter(q => selectedQuestions.includes(q._id));

    return (
        <div
            ref={ref}
            className="print-container"
        >
            <h4 className="text-center mb-4">Question Paper</h4>

            {filtered.map((q, idx) => (
                <div key={q._id} className="mb-4">
                    {/* Question Header */}
                    <div className="d-flex justify-content-between mb-2">
                        <div style={{ flex: 1 }}>
                            <strong>Q{idx + 1}.</strong> {q.questionText}
                        </div>
                        {q.questionImage && (
                            <div style={{ marginLeft: '16px' }}>
                                <img
                                    src={q.questionImage}
                                    alt="Q"
                                    style={{
                                        maxHeight: '80px',
                                        maxWidth: '120px',
                                        objectFit: 'contain',
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* MCQ Options */}
                    {q.questionType === 'MCQ' && (
                        <div className="row mt-2" style={{ marginLeft: '8px', marginRight: '8px' }}>
                            {q.options.map((opt, i) => (
                                <div key={i} className="col-6 col-md-3 mb-2 d-flex align-items-center">
                                    <div style={{ marginRight: '6px' }}>({String.fromCharCode(65 + i)})</div>
                                    {opt.imageUrl && (
                                        <img
                                            src={opt.imageUrl}
                                            alt={`Opt-${i}`}
                                            style={{
                                                height: '40px',
                                                width: '40px',
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
                        <div className="row mt-2" style={{ marginLeft: '4px', marginRight: '4px' }}>
                            {q.pairs.map((pair, i) => (
                                <div key={i} className="col-12 d-flex justify-content-between mb-2">
                                    {/* Left */}
                                    <div className="d-flex align-items-center" style={{ width: '45%' }}>
                                        {pair.leftImage && (
                                            <img
                                                src={pair.leftImage}
                                                alt="Left"
                                                style={{
                                                    height: '40px',
                                                    width: '40px',
                                                    objectFit: 'contain',
                                                    marginRight: '8px',
                                                }}
                                            />
                                        )}
                                        <span>{pair.leftText}</span>
                                    </div>

                                    {/* Right */}
                                    <div className="d-flex align-items-center justify-content-end" style={{ width: '45%' }}>
                                        <span>{pair.rightText}</span>
                                        {pair.rightImage && (
                                            <img
                                                src={pair.rightImage}
                                                alt="Right"
                                                style={{
                                                    height: '40px',
                                                    width: '40px',
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
