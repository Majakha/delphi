import React, { useState } from "react";
import { Draggable } from "react-beautiful-dnd";
import { X, GripVertical, Clock } from "lucide-react";
import { Break } from "../types";
import ConfirmationDialog from "./ConfirmationDialog";

interface SubsectionBreakCardProps {
  breakSubsection: Break;
  index: number;
  onUpdate: (breakSubsection: Break) => void;
  onDelete: (id: string) => void;
  isDragDisabled?: boolean;
  isActive?: boolean;
  onSubsectionActivate?: (subsectionId: string) => void;
}

const SubsectionBreakCard: React.FC<SubsectionBreakCardProps> = ({
  breakSubsection,
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

  const handleChange = (field: keyof Break, value: string | number) => {
    onUpdate({
      ...breakSubsection,
      [field]: value,
    });
  };

  const handleDelete = () => {
    setDeleteConfirmation({
      isOpen: true,
      id: breakSubsection.id,
      title: breakSubsection.title || "Untitled Break",
    });
  };

  const confirmDelete = () => {
    onDelete(breakSubsection.id);
    setDeleteConfirmation({ isOpen: false, id: "", title: "" });
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, id: "", title: "" });
  };

  const renderContent = (dragSnapshot?: any, dragProvided?: any) => (
    <div
      ref={dragProvided?.innerRef}
      {...dragProvided?.draggableProps}
      className={`bg-orange-50 border border-orange-200 rounded-lg p-4 hover:shadow-sm transition-shadow ${
        dragSnapshot?.isDragging ? "shadow-md rotate-1" : ""
      } ${isActive ? "ring-2 ring-blue-500 ring-opacity-50" : ""}`}
      onClick={() =>
        onSubsectionActivate && onSubsectionActivate(breakSubsection.id)
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
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <input
                  type="text"
                  value={breakSubsection.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  className="input-field font-medium bg-transparent border-none p-0 text-orange-800 placeholder-orange-400"
                  placeholder="Break title"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSubsectionActivate)
                      onSubsectionActivate(breakSubsection.id);
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-orange-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={breakSubsection.duration}
                onChange={(e) =>
                  handleChange("duration", parseInt(e.target.value) || 0)
                }
                className="input-field w-24"
                min="0"
                step="1"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSubsectionActivate)
                    onSubsectionActivate(breakSubsection.id);
                }}
              />
            </div>

            <div className="text-sm text-orange-600 bg-orange-100 px-2 py-1 rounded">
              Break
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isDragDisabled ? (
        renderContent()
      ) : (
        <Draggable
          draggableId={breakSubsection.id}
          index={index}
          isDragDisabled={isDragDisabled}
        >
          {(provided, snapshot) => renderContent(snapshot, provided)}
        </Draggable>
      )}

      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        title="Delete Break"
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

export default SubsectionBreakCard;
