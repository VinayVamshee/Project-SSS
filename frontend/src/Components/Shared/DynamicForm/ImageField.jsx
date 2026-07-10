import React, { useRef, useState } from 'react';

/**
 * ImageField — Dedicated image upload component with imgBB hosting integration.
 */
export default function ImageField({ fieldKey, value, onChange, required, readOnly }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('key', '8451f34223c6e62555eec9187d855f8f');
    formData.append('image', file);

    try {
      const response = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (data.success && (data.data?.display_url || data.data?.url)) {
        onChange(data.data.display_url || data.data.url);
      } else {
        throw new Error(data.error?.message || "Upload failed");
      }
    } catch (err) {
      console.error("imgBB upload failed:", err);
      alert("Failed to upload image: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="df-file-wrapper">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        id={`image-${fieldKey}`}
        style={{ display: 'none' }}
        required={required}
        disabled={readOnly || uploading}
        onChange={handleChange}
      />
      <label
        htmlFor={`image-${fieldKey}`}
        className="df-file-label d-flex align-items-center gap-2"
        style={readOnly || uploading ? { opacity: 0.6, cursor: 'default' } : undefined}
      >
        {uploading ? (
          <><i className="fa-solid fa-spinner fa-spin"></i>Uploading to Cloud...</>
        ) : (
          <><i className="fa-solid fa-image"></i>{value ? 'Change Profile Image' : 'Upload Profile Image'}</>
        )}
      </label>
      {value && !uploading && (
        <div className="df-file-name mt-2 small text-muted text-truncate" style={{ maxWidth: '100%' }}>
          <i className="fa-solid fa-link me-1"></i>
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-info">{value}</a>
        </div>
      )}
    </div>
  );
}
