import React from 'react';

/**
 * Notification component for showing success, error, or info messages
 * with standard animated progress bar indicators.
 */
export default function Notification({ message, type }) {
  if (!message) return null;

  const msgLower = message.toLowerCase();
  const isError = type === 'error' || type === 'danger' || msgLower.includes("delete") || msgLower.includes("error") || msgLower.includes("fail") || msgLower.includes("invalid") || msgLower.includes("❌");
  const isSuccess = type === 'success' || msgLower.includes("success") || msgLower.includes("update") || msgLower.includes("save") || msgLower.includes("publish") || msgLower.includes("restore") || msgLower.includes("✅") || msgLower.includes("added");
  const isWarning = type === 'warning' || type === 'warn' || msgLower.includes("please") || msgLower.includes("warn") || msgLower.includes("⚠️");

  const bgColor = isError ? "#f8d7da"
    : isSuccess ? "#d1e7dd"
      : isWarning ? "#fff3cd"
        : "#e2e3e5";

  const textColor = isError ? "#842029"
    : isSuccess ? "#0f5132"
      : isWarning ? "#664d03"
        : "#41464b";

  const barColor = isError ? "#842029"
    : isSuccess ? "#0f5132"
      : isWarning ? "#664d03"
        : "#41464b";

  return (
    <div
      className="position-fixed fade-in"
      style={{
        bottom: "20px",
        right: "20px",
        zIndex: 9999,
        backgroundColor: bgColor,
        color: textColor,
        padding: "12px 18px 18px",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        fontWeight: "500",
        maxWidth: "300px",
        overflow: "hidden",
      }}
    >
      {message}

      <div
        className="progress-bar-animate mt-2"
        style={{
          height: "4px",
          backgroundColor: barColor,
        }}
      />
    </div>
  );
}
