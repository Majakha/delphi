/// <reference path="./AutoResizeTextarea.tsx" />
import React from "react";
import { Draggable } from "react-beautiful-dnd";
import { X, GripVertical, Coffee } from "lucide-react";
import { Subsection } from "../types";
import AutoResizeTextarea from "./AutoResizeTextarea";
import RatingStars from "./RatingStars";

interface SubsectionCardProps {
  subsection: Subsection;
  index: number;
  onUpdate: (subsection: Subsection) => void;
  onDelete: (id: string) => void;
}

const SubsectionCard: React.FC<SubsectionCardProps> = ({
  subsection,
  index,
  onUpdate,
  onDelete,
}) => {
  const handleChange = (
    field: keyof Subsection,
    value: string | number | boolean,
  ) => {
    onUpdate({
      ...subsection,
      [field]: value,
    });
  };

  const isBreak = subsection.type !== "subsection";

  return (
    <Draggable draggableId={subsection.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`card card-hover mb-3 pl-2 ${
            isBreak
              ? "bg-amber-50 border-l-3 border-amber-300"
              : "bg-blue-50 border-l-3 border-blue-300"
          } ${
            snapshot.isDragging ? "shadow-lg rotate-2" : ""
          } ${!subsection.enabled ? "opacity-60 bg-gray-100 border-gray-200" : ""}`}
        >
          <div className="flex items-center gap-2">
            <div
              {...provided.dragHandleProps}
              className="flex-shrink-0 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>

            <div className="flex items-center mr-2">
              <input
                type="checkbox"
                checked={subsection.enabled !== false}
                onChange={(e) => handleChange("enabled", e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex-1 flex items-center gap-2">
              {isBreak ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={subsection.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    className={`input-field font-medium flex-1 ${!subsection.enabled ? "bg-gray-100 text-gray-500" : ""}`}
                    placeholder="Break title"
                    disabled={subsection.enabled === false}
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={subsection.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  className={`input-field font-medium flex-1 ${!subsection.enabled ? "bg-gray-100 text-gray-500" : ""}`}
                  placeholder="Subsection title"
                  disabled={subsection.enabled === false}
                />
              )}

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label
                    className={`text-xs ${!subsection.enabled ? "text-gray-400" : "text-gray-500"} whitespace-nowrap`}
                  >
                    Minutes:
                  </label>
                  <input
                    type="number"
                    value={subsection.time}
                    onChange={(e) =>
                      handleChange("time", parseInt(e.target.value) || 0)
                    }
                    className={`input-field w-16 text-sm ${!subsection.enabled ? "bg-gray-100 text-gray-500" : ""}`}
                    min="0"
                    disabled={subsection.enabled === false}
                  />
                </div>

                {!isBreak && (
                  <div className="flex flex-col items-center gap-1">
                    <label
                      className={`text-xs ${!subsection.enabled ? "text-gray-400" : "text-gray-500"} whitespace-nowrap`}
                    >
                      Importance:
                    </label>
                    <RatingStars
                      rating={subsection.rating ?? 0}
                      onRatingChange={(rating) =>
                        handleChange("rating", rating)
                      }
                      size="md"
                      disabled={subsection.enabled === false}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onDelete(subsection.id)}
                  className={`flex-shrink-0 p-1 rounded-full transition-colors ${
                    !subsection.enabled
                      ? "text-gray-300 hover:text-gray-500 hover:bg-gray-200"
                      : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          {!isBreak && subsection.enabled && (
            <div className="mt-2 pl-6">
              <AutoResizeTextarea
                value={subsection.additionalNotes || ""}
                onChange={(e) =>
                  handleChange("additionalNotes", e.target.value)
                }
                className="input-field resize-none text-sm"
                placeholder="Add notes or comments for this subsection..."
              />
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default SubsectionCard;
