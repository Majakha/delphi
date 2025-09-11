import React, { useState } from "react";
import { Draggable } from "react-beautiful-dnd";
import StrictModeDroppable from "./StrictModeDroppable";
import { X, GripVertical, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Section, Subsection, Break, SubsectionItem } from "../types";
import RatingStars from "./RatingStars";
import SensorTagSelector from "./SensorTagSelector";
import SubsectionCard from "./SubsectionCard";
import SubsectionBreakCard from "./SubsectionBreakCard";
import AutoResizeTextarea from "./AutoResizeTextarea";
import ConfirmationDialog from "./ConfirmationDialog";

interface SectionCardProps {
  section: Section;
  index: number;
  onUpdate: (section: Section) => void;
  onDelete: (id: string) => void;
  isDragDisabled?: boolean;
  isActive?: boolean;
  activeSubsectionId?: string | null;
  onSectionActivate?: (sectionId: string, subsectionId?: string) => void;
}

const SectionCard: React.FC<SectionCardProps> = ({
  section,
  index,
  onUpdate,
  onDelete,
  isDragDisabled = false,
  isActive = false,
  activeSubsectionId = null,
  onSectionActivate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: "section" | "subsection";
    id: string;
    title: string;
  }>({ isOpen: false, type: "section", id: "", title: "" });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (field: keyof Section, value: any) => {
    onUpdate({
      ...section,
      [field]: value,
    });
  };

  const handleSubsectionUpdate = (updatedSubsection: SubsectionItem) => {
    const updatedSubsections = (section.subsections || []).map(
      (sub: SubsectionItem) =>
        sub.id === updatedSubsection.id ? updatedSubsection : sub,
    );
    handleChange("subsections", updatedSubsections);
  };

  const handleSubsectionDelete = (subsectionId: string) => {
    const subsection = section.subsections?.find(
      (sub) => sub.id === subsectionId,
    );
    if (subsection) {
      setDeleteConfirmation({
        isOpen: true,
        type: "subsection",
        id: subsectionId,
        title: subsection.title || "Untitled",
      });
    }
  };

  const confirmDelete = () => {
    if (deleteConfirmation.type === "section") {
      onDelete(section.id);
    } else if (deleteConfirmation.type === "subsection") {
      const updatedSubsections = (section.subsections || []).filter(
        (sub: SubsectionItem) => sub.id !== deleteConfirmation.id,
      );
      onUpdate({ ...section, subsections: updatedSubsections });
    }
    setDeleteConfirmation({
      isOpen: false,
      type: "section",
      id: "",
      title: "",
    });
  };

  const cancelDelete = () => {
    setDeleteConfirmation({
      isOpen: false,
      type: "section",
      id: "",
      title: "",
    });
  };

  const handleSectionDelete = () => {
    setDeleteConfirmation({
      isOpen: true,
      type: "section",
      id: section.id,
      title: section.title || "Untitled Section",
    });
  };

  const handleAddSubsection = () => {
    const newSubsection: Subsection = {
      id: `subsection-${Date.now()}`,
      title: `Subsection ${(section.subsections || []).filter((s) => s.type === "subsection").length + 1}`,
      time: 0,
      rating: 0,
      description: "",
      additionalNotes: "",
      enabled: true,
      type: "subsection",
    };
    handleChange("subsections", [
      ...(section.subsections || []),
      newSubsection,
    ]);
  };

  const totalTime =
    section.time +
    (section.subsections || [])
      .filter((sub) => sub.enabled)
      .reduce((sum: number, sub: SubsectionItem) => {
        if (sub.type === "break") {
          return sum + (sub as Break).duration;
        }
        return sum + (sub as Subsection).time;
      }, 0);

  const renderContent = (dragSnapshot?: any, dragProvided?: any) => (
    <div
      ref={dragProvided?.innerRef}
      {...dragProvided?.draggableProps}
      className={`card card-hover mb-6 ${
        dragSnapshot?.isDragging ? "shadow-lg rotate-1" : ""
      } ${isActive ? "ring-2 ring-blue-500 ring-opacity-50 bg-blue-50" : ""}`}
      onClick={() => {
        if (!isExpanded) setIsExpanded(true);
        if (onSectionActivate) onSectionActivate(section.id);
      }}
    >
      <div className="flex items-start gap-3">
        <div
          {...(isDragDisabled ? {} : dragProvided?.dragHandleProps)}
          className={`p-1 rounded ${
            isDragDisabled
              ? "text-gray-300"
              : "cursor-move hover:bg-gray-100 text-gray-400"
          }`}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        <div className="flex-1 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                  if (onSectionActivate) onSectionActivate(section.id);
                }}
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
                  placeholder="Section title"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSectionActivate) onSectionActivate(section.id);
                  }}
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
                onClick={handleSectionDelete}
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
                    Importance Rating
                  </label>
                  <RatingStars
                    rating={section.rating}
                    onRatingChange={(rating) => {
                      handleChange("rating", rating);
                      if (onSectionActivate) onSectionActivate(section.id);
                    }}
                  />
                </div>

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
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSectionActivate) onSectionActivate(section.id);
                    }}
                  />
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
                    <SensorTagSelector
                      selectedSensors={section.sensors}
                      onSensorsChange={(sensors) => {
                        handleChange("sensors", sensors);
                        if (onSectionActivate) onSectionActivate(section.id);
                      }}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <AutoResizeTextarea
                      value={section.description}
                      onChange={(e) =>
                        handleChange("description", e.target.value)
                      }
                      className="input-field"
                      placeholder="Add description for this section..."
                      minRows={2}
                      maxRows={8}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSectionActivate) onSectionActivate(section.id);
                      }}
                    />
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes
                    </label>
                    <AutoResizeTextarea
                      value={section.additionalNotes}
                      onChange={(e) =>
                        handleChange("additionalNotes", e.target.value)
                      }
                      className="input-field"
                      placeholder="Add additional notes or comments for this section..."
                      minRows={1}
                      maxRows={6}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSectionActivate) onSectionActivate(section.id);
                      }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddSubsection();
                      if (onSectionActivate) onSectionActivate(section.id);
                    }}
                    className="btn-primary text-sm px-3 py-1 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Subsection
                  </button>
                </div>

                {isDragDisabled ? (
                  <div className="space-y-3">
                    {(section.subsections || [])
                      .filter((subsection) => subsection.enabled)
                      .map((subsection, subIndex) => (
                        <div
                          key={subsection.id}
                          data-subsection-id={subsection.id}
                        >
                          {subsection.type === "subsection" ? (
                            <SubsectionCard
                              subsection={subsection as Subsection}
                              index={subIndex}
                              onUpdate={handleSubsectionUpdate}
                              onDelete={handleSubsectionDelete}
                              isDragDisabled={true}
                              isActive={activeSubsectionId === subsection.id}
                              onSubsectionActivate={
                                onSectionActivate
                                  ? (id) => onSectionActivate(section.id, id)
                                  : undefined
                              }
                            />
                          ) : (
                            <SubsectionBreakCard
                              breakSubsection={subsection as Break}
                              index={subIndex}
                              onUpdate={handleSubsectionUpdate}
                              onDelete={handleSubsectionDelete}
                              isDragDisabled={true}
                              isActive={activeSubsectionId === subsection.id}
                            />
                          )}
                        </div>
                      ))}
                    {(section.subsections || []).filter((sub) => sub.enabled)
                      .length === 0 && (
                      <div className="text-center py-6 text-gray-500">
                        <p>
                          No enabled subsections. Enable subsections in the
                          overview pane or add new ones.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <StrictModeDroppable
                    droppableId={`subsections-${section.id}`}
                    type="subsection"
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-3 min-h-[60px] ${
                          snapshot.isDraggingOver
                            ? "bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-2"
                            : ""
                        }`}
                      >
                        {(section.subsections || [])
                          .filter((subsection) => subsection.enabled)
                          .map((subsection, subIndex) => (
                            <div
                              key={subsection.id}
                              data-subsection-id={subsection.id}
                            >
                              {subsection.type === "subsection" ? (
                                <SubsectionCard
                                  subsection={subsection as Subsection}
                                  index={subIndex}
                                  onUpdate={handleSubsectionUpdate}
                                  onDelete={handleSubsectionDelete}
                                  isDragDisabled={false}
                                  isActive={
                                    activeSubsectionId === subsection.id
                                  }
                                  onSubsectionActivate={
                                    onSectionActivate
                                      ? (id) =>
                                          onSectionActivate(section.id, id)
                                      : undefined
                                  }
                                />
                              ) : (
                                <SubsectionBreakCard
                                  breakSubsection={subsection as Break}
                                  index={subIndex}
                                  onUpdate={handleSubsectionUpdate}
                                  onDelete={handleSubsectionDelete}
                                  isDragDisabled={false}
                                  isActive={
                                    activeSubsectionId === subsection.id
                                  }
                                />
                              )}
                            </div>
                          ))}
                        {(section.subsections || []).filter(
                          (sub) => sub.enabled,
                        ).length === 0 && (
                          <div
                            className={`text-center py-6 text-gray-400 ${
                              snapshot.isDraggingOver ? "text-blue-600" : ""
                            }`}
                          >
                            <p>
                              {snapshot.isDraggingOver
                                ? "Drop subsection here"
                                : "No enabled subsections. Drop subsections here or add new ones."}
                            </p>
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </StrictModeDroppable>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isDragDisabled ? (
        renderContent()
      ) : (
        <Draggable draggableId={section.id} index={index}>
          {(provided, snapshot) => renderContent(snapshot, provided)}
        </Draggable>
      )}

      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        title={`Delete ${deleteConfirmation.type === "section" ? "Section" : "Subsection"}`}
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

export default SectionCard;
