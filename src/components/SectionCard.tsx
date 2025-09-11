import React, { useState } from "react";
import { Draggable, Droppable, DropResult } from "react-beautiful-dnd";
import { X, GripVertical, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Section, Subsection } from "../types";
import RatingStars from "./RatingStars";
import SensorSelector from "./SensorSelector";
import SubsectionCard from "./SubsectionCard";

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

  const handleSubsectionDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(section.subsections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    handleChange("subsections", items);
  };

  const totalTime =
    section.time +
    section.subsections.reduce(
      (sum: number, sub: Subsection) => sum + sub.time,
      0,
    );

  return (
    <Draggable draggableId={section.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`card card-hover mb-6 ${
            snapshot.isDragging ? "shadow-lg rotate-1" : ""
          } ${"border-l-4 border-l-blue-500"}`}
        >
          <div className="flex items-start gap-3">
            <div
              {...provided.dragHandleProps}
              className="flex-shrink-0 mt-2 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>

            <div className="flex-1 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
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

                  <div className="flex-1">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      className="input-field font-medium text-lg"
                      placeholder={"Section title"}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Total Time</div>
                    <div className="font-semibold">{totalTime} min</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDelete(section.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <>
                  {/* Basic Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time (min)
                      </label>
                      <input
                        type="number"
                        value={section.time}
                        onChange={(e) =>
                          handleChange("time", parseInt(e.target.value) || 0)
                        }
                        className="input-field"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Importance Rating
                      </label>
                      <RatingStars
                        rating={section.rating}
                        onRatingChange={(rating) =>
                          handleChange("rating", rating)
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={section.type}
                        onChange={(e) =>
                          handleChange(
                            "type",
                            e.target.value as "section" | "break",
                          )
                        }
                        className="input-field"
                      >
                        <option value="section">Section</option>
                        <option value="break">Break</option>
                      </select>
                    </div>
                  </div>

                  {/* Advanced Fields Toggle */}
                  <div className="border-t pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      {showAdvanced ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      Advanced Fields
                    </button>
                  </div>

                  {showAdvanced && (
                    <div className="space-y-4 border-t pt-4">
                      {/* Sensors */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sensors
                        </label>
                        <SensorSelector
                          selectedSensors={section.sensors}
                          onSensorsChange={(sensors) =>
                            handleChange("sensors", sensors)
                          }
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={section.additionalNotes}
                          onChange={(e) =>
                            handleChange("additionalNotes", e.target.value)
                          }
                          className="input-field resize-none"
                          rows={3}
                          placeholder="Add notes or comments for this section..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Subsections */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Subsections</h4>
                      <button
                        type="button"
                        onClick={handleAddSubsection}
                        className="btn-primary text-sm px-3 py-1 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Subsection
                      </button>
                    </div>

                    {section.subsections.length > 0 ? (
                      <Droppable
                        droppableId={`subsections-${section.id}`}
                        type="subsection"
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="space-y-3"
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
                      <div className="text-center py-6 text-gray-500">
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
