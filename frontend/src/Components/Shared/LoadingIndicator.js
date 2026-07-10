import React from 'react';

/**
 * LoadingIndicator component for showing loading states
 * with spinner and standard themed container.
 */
export default function LoadingIndicator({ message, active }) {
  if (!active || !message) return null;

  const msgLower = message.toLowerCase();
  const isDelete = msgLower.includes("delete") || msgLower.includes("remove") || msgLower.includes("archive");
  const isUpload = msgLower.includes("upload") || msgLower.includes("image") || msgLower.includes("file");
  const isSave = msgLower.includes("save") || msgLower.includes("creat") || msgLower.includes("updat") || msgLower.includes("link");

  const bgColor = isDelete ? "#f8d7da"
    : isUpload ? "#fff3cd"
      : isSave ? "#d1e7dd"
        : "#e2e3e5";

  const textColor = isDelete ? "#842029"
    : isUpload ? "#664d03"
      : isSave ? "#0f5132"
        : "#41464b";

  const spinnerColorClass = isDelete ? "text-danger"
    : isUpload ? "text-warning"
      : isSave ? "text-success"
        : "text-secondary";

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(1px)',
          zIndex: 9997,
          cursor: 'not-allowed',
          pointerEvents: 'all'
        }}
      />
      <div
        className="position-fixed fade-in"
        style={{
          bottom: "95px", // Stacks nicely above the Notification toast (bottom: 20px)
          right: "20px",
          zIndex: 9999,
          backgroundColor: bgColor,
          color: textColor,
          padding: "12px 18px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          fontWeight: "500",
          maxWidth: "300px",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}
      >
        <i className={`fas fa-spinner fa-spin ${spinnerColorClass}`}></i>
        <span>{message}</span>
      </div>
    </>
  );
}
