import React, { useState } from "react";
import { Draggable } from "react-beautiful-dnd";
import { X, GripVertical } from "lucide-react";
import { Subsection } from "../types";
import AutoResizeTextarea from "./AutoResizeTextarea";
import ConfirmationDialog from "./ConfirmationDialog";
import RatingStars from "./RatingStars";

interface SubsectionCardProps {
  subsection: Subsection;
  index: number;
  onUpdate: (subsection: Subsection) => void;
  onDelete: (id: string) => void;
  isDragDisabled?: boolean;
  isActive?: boolean;
  onSubsectionActivate?: (subsectionId: string) => void;
}

const SubsectionCard: React.FC<SubsectionCardProps> = ({
  subsection,
  index,
  onUpdate,
  onDelete,
  isDragDisabled = false,
  isActive = false,
  onSubsectionActivate,
}) => {
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id: string;
    title: string;
  }>({ isOpen: false, id: "", title: "" });
  const handleChange = (field: keyof Subsection, value: string | number) => {
    onUpdate({
      ...subsection,
      [field]: value,
    });
  };

  const handleDelete = () => {
    setDeleteConfirmation({
      isOpen: true,
      id: subsection.id,
      title: subsection.title || "Untitled Subsection",
    });
  };

  const confirmDelete = () => {
    onDelete(subsection.id);
    setDeleteConfirmation({ isOpen: false, id: "", title: "" });
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, id: "", title: "" });
  };

  const renderContent = (dragSnapshot?: any, dragProvided?: any) => (
    <div
      ref={dragProvided?.innerRef}
      {...dragProvided?.draggableProps}
      className={`bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow ${
        dragSnapshot?.isDragging ? "shadow-md rotate-1" : ""
      } ${isActive ? "ring-2 ring-blue-500 ring-opacity-50 bg-blue-50" : ""}`}
      onClick={() =>
        onSubsectionActivate && onSubsectionActivate(subsection.id)
      }
    >
      <div className="flex items-center gap-3">
        <div
          {...(isDragDisabled ? {} : dragProvided?.dragHandleProps)}
          className={`flex-shrink-0 ${
            isDragDisabled
              ? "text-gray-300"
              : "cursor-grab active:cursor-grabbing"
          }`}
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={subsection.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="input-field"
                placeholder="Subsection title"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSubsectionActivate) onSubsectionActivate(subsection.id);
                }}
              />
            </div>
          </div>

          <div className="flex gap-6 items-center">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Importance Rating
              </label>
              <RatingStars
                rating={subsection.rating || 0}
                onRatingChange={(rating) => {
                  handleChange("rating", rating);
                  if (onSubsectionActivate) onSubsectionActivate(subsection.id);
                }}
              />
            </div>

            <div className="w-24">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time (min)
              </label>
              <input
                type="number"
                value={subsection.time}
                onChange={(e) =>
                  handleChange("time", parseInt(e.target.value) || 0)
                }
                className="input-field"
                min="0"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSubsectionActivate) onSubsectionActivate(subsection.id);
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <AutoResizeTextarea
              value={subsection.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="input-field"
              placeholder="Add description..."
              minRows={1}
              maxRows={6}
              onClick={(e) => {
                e.stopPropagation();
                if (onSubsectionActivate) onSubsectionActivate(subsection.id);
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <AutoResizeTextarea
              value={subsection.additionalNotes}
              onChange={(e) => handleChange("additionalNotes", e.target.value)}
              className="input-field"
              placeholder="Add additional notes or comments..."
              minRows={1}
              maxRows={4}
              onClick={(e) => {
                e.stopPropagation();
                if (onSubsectionActivate) onSubsectionActivate(subsection.id);
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {isDragDisabled ? (
        renderContent()
      ) : (
        <Draggable draggableId={subsection.id} index={index}>
          {(provided, snapshot) => renderContent(snapshot, provided)}
        </Draggable>
      )}

      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        title="Delete Subsection"
        message={`Are you sure you want to delete "${deleteConfirmation.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        isDestructive={true}
      />
    </>
  );
};

export default SubsectionCard;
