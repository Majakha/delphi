import React, { useEffect, useRef, useCallback } from "react";

interface AutoResizeTextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minRows?: number;
  maxRows?: number;
}

const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({
  value,
  onChange,
  onClick,
  placeholder,
  disabled = false,
  className = "",
  minRows = 1,
  maxRows = 10,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";

    // Calculate the line height
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = parseInt(computedStyle.lineHeight, 10) || 20; // Fallback if lineHeight isn't set

    // Calculate min and max heights
    // For empty textarea, use a smaller height
    const isEmpty = !value || value.trim() === "";
    const effectiveMinRows = isEmpty ? 1 : minRows;
    const minHeight = lineHeight * effectiveMinRows;
    const maxHeight = lineHeight * maxRows;

    // Set the height based on scroll height, but within min/max bounds
    const newHeight = Math.max(
      minHeight,
      Math.min(textarea.scrollHeight, maxHeight),
    );
    textarea.style.height = `${newHeight}px`;
  }, [minRows, maxRows, value]);

  useEffect(() => {
    adjustHeight();
  }, [value, minRows, maxRows, adjustHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e);
    // Adjust height after state update
    setTimeout(adjustHeight, 0);
  };

  return (
    <textarea
      ref={textareaRef}
      value={value || ""}
      onChange={handleChange}
      onClick={onClick}
      placeholder={placeholder}
      disabled={disabled}
      className={`resize-none overflow-hidden ${disabled ? "cursor-not-allowed" : ""} ${className}`}
      style={{
        minHeight:
          value && value.trim() ? `${minRows * 1.5}em` : `${1 * 1.2}em`,
        padding: value && value.trim() ? undefined : "0.25rem 0.5rem", // Smaller padding when empty
      }}
    />
  );
};

export default AutoResizeTextarea;
