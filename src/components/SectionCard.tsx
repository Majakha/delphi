import React, { useState } from "react";
import { Draggable, Droppable, DropResult } from "react-beautiful-dnd";
import { X, GripVertical, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Section, Subsection } from "../types";
import RatingStars from "./RatingStars";
import SensorSelector from "./SensorSelector";
import SubsectionCard from "./SubsectionCard";
import AutoResizeTextarea from "./AutoResizeTextarea";

interface SectionCardProps {
  section: Section;
  index: number;
  onUpdate: (section: Section) => void;
  onDelete: (id: string) => void;
}

const SectionCard: React.FC<SectionCardProps> = ({
  section,
  index,
  onUpdate,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (field: keyof Section, value: any) => {
    onUpdate({
      ...section,
      [field]: value,
    });
  };

  const handleSubsectionUpdate = (updatedSubsection: Subsection) => {
    const updatedSubsections = section.subsections.map((sub: Subsection) =>
      sub.id === updatedSubsection.id ? updatedSubsection : sub,
    );
    handleChange("subsections", updatedSubsections);
  };

  const handleSubsectionDelete = (subsectionId: string) => {
    const updatedSubsections = section.subsections.filter(
      (sub: Subsection) => sub.id !== subsectionId,
    );
    handleChange("subsections", updatedSubsections);
  };

  const handleAddSubsection = () => {
    const newSubsection: Subsection = {
      id: `subsection-${Date.now()}`,
      title: "",
      time: 0,
      additionalNotes: "",
      description: "",
      enabled: true,
      type: "subsection",
    };
    handleChange("subsections", [...section.subsections, newSubsection]);
  };

  const handleAddBreak = () => {
    const newBreak: Subsection = {
      id: `break-${Date.now()}`,
      title: "",
      time: 5,
      additionalNotes: "",
      description: "",
      enabled: true,
      type: "break",
    };
    handleChange("subsections", [...section.subsections, newBreak]);
  };

  const handleSubsectionDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(section.subsections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    handleChange("subsections", items);
  };

  const totalTime = section.subsections.reduce(
    (sum: number, sub: Subsection) => sum + sub.time,
    0,
  );

  return (
    <Draggable draggableId={section.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`card card-hover mb-1 ${
            snapshot.isDragging ? "shadow-lg rotate-2" : ""
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              {...provided.dragHandleProps}
              className="flex-shrink-0 mt-2 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>

            <div className="flex-1 space-y-1">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 flex-1">
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  <div className="flex-1 flex items-center gap-4">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      className="input-field font-medium text-lg flex-1"
                      placeholder={"Section title"}
                    />

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-500 whitespace-nowrap">
                          Max:
                        </label>
                        <input
                          type="number"
                          value={section.time}
                          onChange={(e) =>
                            handleChange("time", parseInt(e.target.value) || 0)
                          }
                          className="input-field w-16"
                          min="0"
                        />
                      </div>
                      <div
                        className={`flex items-center gap-1 px-3 py-1 rounded-md ${
                          totalTime > section.time ? "bg-red-50" : "bg-blue-50"
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                            Subsections
                            {totalTime > section.time && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3.5 w-3.5 text-red-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                              </svg>
                            )}
                          </span>
                          <span
                            className={`font-semibold ${
                              totalTime > section.time
                                ? "text-red-600"
                                : "text-blue-700"
                            }`}
                          >
                            {totalTime} {totalTime === 1 ? "minute" : "minutes"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDelete(section.id)}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <>
                  <div className="space-y-2 pt-4">
                    {/* Notes */}
                    <div>
                      <AutoResizeTextarea
                        value={section.additionalNotes || ""}
                        onChange={(e) =>
                          handleChange("additionalNotes", e.target.value)
                        }
                        className="input-field resize-none"
                        placeholder="Add notes or comments for this section..."
                      />
                    </div>
                  </div>

                  {/* Subsections */}
                  <div className=" pt-4">
                    <div className="flex  justify-left mb-4 gap-3">
                      <button
                        type="button"
                        onClick={handleAddSubsection}
                        className="btn-primary text-sm px-3 py-1 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Subsection
                      </button>
                      <button
                        type="button"
                        onClick={handleAddBreak}
                        className="btn-primary amber text-sm px-3 py-1 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Break
                      </button>
                      <SensorSelector
                        selectedSensors={section.sensors || []}
                        onSensorsChange={(sensors) =>
                          handleChange("sensors", sensors)
                        }
                      />
                    </div>

                    {section.subsections.length > 0 ? (
                      <Droppable
                        key={`subsections-drop-${section.id}`}
                        droppableId={`subsections-${section.id}`}
                        type="subsection"
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="space-y-2"
                          >
                            {section.subsections.map((subsection, subIndex) => (
                              <SubsectionCard
                                key={subsection.id}
                                subsection={subsection}
                                index={subIndex}
                                onUpdate={handleSubsectionUpdate}
                                onDelete={handleSubsectionDelete}
                              />
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    ) : (
                      <div className="text-center py-5 text-gray-500">
                        <p>
                          No subsections yet. Click "Add Subsection" to get
                          started.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default SectionCard;
