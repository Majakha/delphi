import React, { useState } from "react";
import Popup from "./Popup";
import RatingStars from "./RatingStars";
import { Subsection } from "../types";

interface AddSubsectionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subsection: Omit<Subsection, "id">) => void;
}

const AddSubsectionPopup: React.FC<AddSubsectionPopupProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [type, setType] = useState<"subsection" | "break">("subsection");
  const [enabled, setEnabled] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!time || isNaN(Number(time)) || Number(time) < 0) {
      newErrors.time = "Valid time is required (in minutes)";
    }

    if (rating && (rating < 1 || rating > 5)) {
      newErrors.rating = "Rating must be between 1 and 5";
    }

    if (!description.trim()) {
      newErrors.description = "Description is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const newSubsection: Omit<Subsection, "id"> = {
      title: title.trim(),
      time: Number(time),
      rating: rating > 0 ? rating : undefined,
      description: description.trim(),
      additionalNotes: additionalNotes.trim(),
      enabled,
      type,
    };

    onSave(newSubsection);
    handleClose();
  };

  const handleClose = () => {
    setTitle("");
    setTime("");
    setRating(0);
    setDescription("");
    setAdditionalNotes("");
    setType("subsection");
    setEnabled(true);
    setErrors({});
    onClose();
  };

  return (
    <Popup
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Subsection"
      width="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter subsection title"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.title ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1">{errors.title}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time (minutes) *
            </label>
            <input
              type="number"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="Enter time in minutes"
              min="0"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.time ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.time && (
              <p className="text-red-500 text-sm mt-1">{errors.time}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Importance Rating
            </label>
            <div className="flex items-center gap-2">
              <RatingStars
                rating={rating}
                onRatingChange={setRating}
                size="md"
              />
              {rating > 0 && (
                <span className="text-sm text-gray-500">({rating}/5)</span>
              )}
            </div>
            {errors.rating && (
              <p className="text-red-500 text-sm mt-1">{errors.rating}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "subsection" | "break")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="subsection">Subsection</option>
            <option value="break">Break</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter subsection description"
            rows={3}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.description ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes
          </label>
          <textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Enter additional notes (optional)"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="enabled" className="ml-2 block text-sm text-gray-700">
            Enable subsection
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Subsection
          </button>
        </div>
      </div>
    </Popup>
  );
};

export default AddSubsectionPopup;
