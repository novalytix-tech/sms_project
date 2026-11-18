// ==========================================
// PhotoUpload — passport-size photo picker
// Reads an image file, validates it, and returns a base64 data URL
// that gets stored on the record's photoUrl field.
// ==========================================

import React, { useRef, useState } from 'react';
import { Camera, Upload, X, User } from 'lucide-react';

interface PhotoUploadProps {
  /** Current photo (base64 data URL or image URL). */
  value?: string;
  /** Called with the new base64 data URL, or '' when removed. */
  onChange: (dataUrl: string) => void;
  label?: string;
  /** Max file size in MB (default 2). */
  maxSizeMB?: number;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  value,
  onChange,
  label = 'Passport-size Photo',
  maxSizeMB = 2,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const handleFile = (file?: File | null) => {
    setError('');
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG or PNG).');
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Image is too large. Maximum ${maxSizeMB} MB allowed.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onChange(reader.result);
    };
    reader.onerror = () => setError('Could not read the image. Please try another file.');
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange('');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      {label && (
        <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>
          {label}
        </label>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        {/* Preview box (passport ratio ~ 35:45) */}
        <div
          style={{
            width: '110px',
            height: '140px',
            borderRadius: '8px',
            border: '2px dashed #CBD5E1',
            background: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {value ? (
            <img
              src={value}
              alt="Passport preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <User size={40} color="#94A3B8" />
          )}
        </div>

        <div style={{ flex: 1 }}>
          <input
            ref={inputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files?.[0])}
          />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => inputRef.current?.click()}
            >
              {value ? <Camera size={14} /> : <Upload size={14} />}
              <span>{value ? 'Change Photo' : 'Upload Photo'}</span>
            </button>
            {value && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleRemove}
                style={{ color: '#DC2626' }}
              >
                <X size={14} />
                <span>Remove</span>
              </button>
            )}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px', lineHeight: 1.4 }}>
            JPG / PNG, clear front-facing passport photo. Max {maxSizeMB} MB.
          </div>
          {error && (
            <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '6px' }}>{error}</div>
          )}
        </div>
      </div>
    </div>
  );
};
