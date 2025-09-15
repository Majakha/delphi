import React, { useEffect, useRef, useCallback } from "react";

interface AutoResizeTextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
  maxRows?: number;
}

const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({
  value,
  onChange,
  onClick,
  placeholder,
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
    const lineHeight = parseInt(computedStyle.lineHeight, 10);

    // Calculate min and max heights
    const minHeight = lineHeight * minRows;
    const maxHeight = lineHeight * maxRows;

    // Set the height based on scroll height, but within min/max bounds
    const newHeight = Math.max(
      minHeight,
      Math.min(textarea.scrollHeight, maxHeight),
    );
    textarea.style.height = `${newHeight}px`;
  }, [minRows, maxRows]);

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
      value={value}
      onChange={handleChange}
      onClick={onClick}
      placeholder={placeholder}
      className={`resize-none overflow-hidden ${className}`}
      style={{ minHeight: `${minRows * 1.5}em` }}
    />
  );
};

export default AutoResizeTextarea;
