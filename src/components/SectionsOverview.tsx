import React, { useState } from "react";
import { DragDropContext, Draggable, DropResult } from "react-beautiful-dnd";
import StrictModeDroppable from "./StrictModeDroppable";
import {
  Check,
  Eye,
  EyeOff,
  Clock,
  Star,
  GripVertical,
  Plus,
  X,
} from "lucide-react";
import { Section, Subsection, Break, SubsectionItem } from "../types";
import ConfirmationDialog from "./ConfirmationDialog";

interface SectionsOverviewProps {
  sections: Section[];
  onSectionToggle: (sectionId: string, enabled: boolean) => void;
  onSubsectionToggle: (
    sectionId: string,
    subsectionId: string,
    enabled: boolean,
  ) => void;
  onSectionClick: (sectionId: string, subsectionId?: string) => void;
  activeSectionId?: string | null;
  activeSubsectionId?: string | null;
  onSectionReorder: (sourceIndex: number, destinationIndex: number) => void;
  onSubsectionReorder: (
    sourceSectionId: string,
    destinationSectionId: string,
    sourceIndex: number,
    destinationIndex: number,
  ) => void;
  onAddSection: () => void;
  onAddSubsection: (sectionId: string) => void;
  onAddBreak: (sectionId: string) => void;
  onSectionDelete: (sectionId: string) => void;
  onSubsectionDelete: (sectionId: string, subsectionId: string) => void;
}

const SectionsOverview: React.FC<SectionsOverviewProps> = ({
  sections,
  onSectionToggle,
  onSubsectionToggle,
  onSectionClick,
  activeSectionId,
  activeSubsectionId,
  onSectionReorder,
  onSubsectionReorder,
  onAddSection,
  onAddSubsection,
  onAddBreak,
  onSectionDelete,
  onSubsectionDelete,
}) => {
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id: string;
    title: string;
    type: "section" | "subsection";
    sectionId?: string;
  }>({ isOpen: false, id: "", title: "", type: "section" });

  const handleSectionDelete = (sectionId: string, sectionTitle: string) => {
    setDeleteConfirmation({
      isOpen: true,
      id: sectionId,
      title: sectionTitle,
      type: "section",
    });
  };

  const handleSubsectionDelete = (
    sectionId: string,
    subsectionId: string,
    subsectionTitle: string,
  ) => {
    setDeleteConfirmation({
      isOpen: true,
      id: subsectionId,
      title: subsectionTitle,
      type: "subsection",
      sectionId: sectionId,
    });
  };

  const confirmDelete = () => {
    if (deleteConfirmation.type === "section") {
      onSectionDelete(deleteConfirmation.id);
    } else if (
      deleteConfirmation.type === "subsection" &&
      deleteConfirmation.sectionId
    ) {
      onSubsectionDelete(deleteConfirmation.sectionId, deleteConfirmation.id);
    }
    setDeleteConfirmation({
      isOpen: false,
      id: "",
      title: "",
      type: "section",
    });
  };

  const cancelDelete = () => {
    setDeleteConfirmation({
      isOpen: false,
      id: "",
      title: "",
      type: "section",
    });
  };
  const enabledSections = sections.filter((s) => s.enabled).length;
  const totalSections = sections.length;
  const totalTime = sections.reduce((sum, section) => {
    if (!section.enabled) return sum;
    const sectionTime =
      section.time +
      (section.subsections || [])
        .filter((sub: SubsectionItem) => sub.enabled)
        .reduce((subSum: number, sub: SubsectionItem) => {
          if (sub.type === "break") {
            return subSum + (sub as Break).duration;
          }
          return subSum + (sub as Subsection).time;
        }, 0);
    return sum + sectionTime;
  }, 0);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, type } = result;

    if (!destination) {
      return;
    }

    // Same position, no change needed
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (type === "section") {
      onSectionReorder(source.index, destination.index);
    } else if (type === "subsection") {
      const sourceSectionId = source.droppableId.replace("subsections-", "");
      const destinationSectionId = destination.droppableId.replace(
        "subsections-",
        "",
      );

      onSubsectionReorder(
        sourceSectionId,
        destinationSectionId,
        source.index,
        destination.index,
      );
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b bg-gray-50 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900">
          Protocol Overview
        </h3>
        <div className="text-sm text-gray-600 mt-1">
          {enabledSections} of {totalSections} sections • {totalTime} min total
        </div>

        {/* Add Section Button */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={onAddSection}
            className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add Section
          </button>
        </div>
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto pb-2 px-3">
        {sections.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
              <Eye className="w-8 h-8 text-gray-400" />
            </div>
            <p>No sections created yet.</p>
            <p className="text-sm mt-1">Add sections to see them here.</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <StrictModeDroppable droppableId="sections" type="section">
              {(provided: any, snapshot: any) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-3 transition-colors ${
                    snapshot.isDraggingOver
                      ? "bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-2"
                      : ""
                  }`}
                >
                  {sections.map((section, index) => (
                    <Draggable
                      key={section.id}
                      draggableId={section.id}
                      index={index}
                    >
                      {(sectionProvided, sectionSnapshot) => (
                        <div
                          ref={sectionProvided.innerRef}
                          {...sectionProvided.draggableProps}
                          className="space-y-2"
                        >
                          {/* Section */}
                          <div
                            className={`p-3 rounded-lg border transition-all ${
                              section.enabled
                                ? "bg-white border-gray-200 shadow-sm"
                                : "bg-gray-50 border-gray-150"
                            } ${
                              activeSectionId === section.id
                                ? "ring-2 ring-blue-500 ring-opacity-50 bg-blue-50"
                                : ""
                            } ${
                              sectionSnapshot.isDragging
                                ? "shadow-lg rotate-1"
                                : ""
                            }`}
                          >
                            <div className="flex items-center justify-between overflow-hidden">
                              <div className="flex items-center space-x-3 overflow-hidden">
                                <div
                                  {...sectionProvided.dragHandleProps}
                                  className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <button
                                  onClick={() =>
                                    onSectionToggle(
                                      section.id,
                                      !section.enabled,
                                    )
                                  }
                                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    section.enabled
                                      ? "bg-blue-500 border-blue-500 text-white"
                                      : "border-gray-300 hover:border-blue-400"
                                  }`}
                                >
                                  {section.enabled && (
                                    <Check className="w-3 h-3" />
                                  )}
                                </button>

                                <div
                                  className={`${
                                    section.enabled
                                      ? "text-gray-900"
                                      : "text-gray-500"
                                  } max-w-[170px] overflow-hidden`}
                                >
                                  <div
                                    className="font-medium cursor-pointer hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-all break-words w-full"
                                    onClick={() => onSectionClick(section.id)}
                                    title="Click to scroll to section"
                                  >
                                    {section.title || `Section ${index + 1}`}
                                  </div>
                                  <div className="flex items-center space-x-3 text-xs">
                                    <span className="flex items-center space-x-1">
                                      <Clock className="w-3 h-3" />
                                      <span>{section.time}min</span>
                                    </span>
                                    {section.rating > 0 && (
                                      <span className="flex items-center space-x-1">
                                        <Star className="w-3 h-3 fill-current text-yellow-400" />
                                        <span>{section.rating}</span>
                                      </span>
                                    )}
                                    {section.sensors &&
                                      section.sensors.length > 0 && (
                                        <span className="text-blue-600">
                                          {section.sensors.length} sensors
                                        </span>
                                      )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() =>
                                    handleSectionDelete(
                                      section.id,
                                      section.title || `Section ${index + 1}`,
                                    )
                                  }
                                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                  title="Delete section"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                {section.subsections &&
                                  section.subsections.length > 0 && (
                                    <span
                                      className="text-xs text-gray-500 cursor-pointer hover:text-blue-600 transition-colors"
                                      onClick={() => onSectionClick(section.id)}
                                      title="Click to scroll to section"
                                    >
                                      {/*{
                                        section.subsections.filter(
                                          (sub: SubsectionItem) => sub.enabled,
                                        ).length
                                      }
                                      /{section.subsections.length} subs*/}
                                    </span>
                                  )}
                                {section.enabled ? (
                                  <Eye className="w-4 h-4 text-green-500" />
                                ) : (
                                  <EyeOff className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Subsections */}
                          <div className="ml-8">
                            <StrictModeDroppable
                              droppableId={`subsections-${section.id}`}
                              type="subsection"
                            >
                              {(subProvided: any, subSnapshot: any) => (
                                <div
                                  ref={subProvided.innerRef}
                                  {...subProvided.droppableProps}
                                  className={`space-y-1 transition-colors rounded p-1 min-h-[2rem] ${
                                    subSnapshot.isDraggingOver
                                      ? "bg-yellow-50 border-2 border-dashed border-yellow-300"
                                      : ""
                                  }`}
                                >
                                  {(section.subsections || []).map(
                                    (
                                      subsection: SubsectionItem,
                                      subIndex: number,
                                    ) => (
                                      <Draggable
                                        key={subsection.id}
                                        draggableId={subsection.id}
                                        index={subIndex}
                                        isDragDisabled={!section.enabled}
                                      >
                                        {(
                                          subProvided: any,
                                          subSnapshot: any,
                                        ) => (
                                          <div
                                            ref={subProvided.innerRef}
                                            {...subProvided.draggableProps}
                                            className={`p-2 rounded border transition-all ${
                                              subsection.enabled &&
                                              section.enabled
                                                ? subsection.type === "break"
                                                  ? "bg-orange-50 border-orange-200"
                                                  : "bg-white border-gray-150"
                                                : "bg-gray-50 border-gray-100"
                                            } ${
                                              subSnapshot.isDragging
                                                ? "shadow-md rotate-1"
                                                : ""
                                            } ${
                                              !section.enabled
                                                ? "opacity-60"
                                                : ""
                                            } ${
                                              activeSubsectionId ===
                                              subsection.id
                                                ? "ring-2 ring-blue-500 ring-opacity-50 bg-blue-50"
                                                : ""
                                            }`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center space-x-2 overflow-hidden">
                                                <div
                                                  {...subProvided.dragHandleProps}
                                                  className={`flex-shrink-0 text-gray-400 ${
                                                    section.enabled
                                                      ? "cursor-grab active:cursor-grabbing hover:text-gray-600"
                                                      : "cursor-not-allowed text-gray-300"
                                                  }`}
                                                >
                                                  <GripVertical className="w-3 h-3" />
                                                </div>
                                                <button
                                                  onClick={() =>
                                                    onSubsectionToggle(
                                                      section.id,
                                                      subsection.id,
                                                      !subsection.enabled,
                                                    )
                                                  }
                                                  disabled={!section.enabled}
                                                  className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                                    subsection.enabled &&
                                                    section.enabled
                                                      ? "bg-blue-500 border-blue-500 text-white"
                                                      : section.enabled
                                                        ? "border-gray-300 hover:border-blue-400"
                                                        : "border-gray-200 cursor-not-allowed"
                                                  }`}
                                                >
                                                  {subsection.enabled && (
                                                    <Check className="w-2 h-2" />
                                                  )}
                                                </button>

                                                <div
                                                  className={`${
                                                    subsection.enabled &&
                                                    section.enabled
                                                      ? "text-gray-700"
                                                      : "text-gray-400"
                                                  } max-w-[150px] overflow-hidden`}
                                                >
                                                  <div
                                                    className="text-sm font-medium cursor-pointer hover:text-blue-600 hover:bg-blue-50 px-1 py-0.5 rounded transition-all break-words w-full"
                                                    onClick={() =>
                                                      onSectionClick(
                                                        section.id,
                                                        subsection.id,
                                                      )
                                                    }
                                                    title="Click to scroll to subsection"
                                                  >
                                                    {subsection.type ===
                                                    "subsection"
                                                      ? (
                                                          subsection as Subsection
                                                        ).title ||
                                                        `Subsection ${subIndex + 1}`
                                                      : (subsection as Break)
                                                          .title ||
                                                        `Break ${subIndex + 1}`}
                                                  </div>
                                                  {subsection.type ===
                                                    "subsection" &&
                                                    (subsection as Subsection)
                                                      .time > 0 && (
                                                      <div className="flex items-center space-x-1 text-xs">
                                                        <Clock className="w-3 h-3" />
                                                        <span>
                                                          {
                                                            (
                                                              subsection as Subsection
                                                            ).time
                                                          }
                                                          min
                                                        </span>
                                                      </div>
                                                    )}
                                                  {subsection.type ===
                                                    "break" && (
                                                    <div className="flex items-center space-x-1 text-xs">
                                                      <Clock className="w-3 h-3" />
                                                      <span>
                                                        {
                                                          (subsection as Break)
                                                            .duration
                                                        }
                                                        min break
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>

                                              <div className="flex items-center space-x-1">
                                                <button
                                                  onClick={() =>
                                                    handleSubsectionDelete(
                                                      section.id,
                                                      subsection.id,
                                                      subsection.type ===
                                                        "subsection"
                                                        ? (
                                                            subsection as Subsection
                                                          ).title ||
                                                            `Subsection ${subIndex + 1}`
                                                        : (subsection as Break)
                                                            .title ||
                                                            `Break ${subIndex + 1}`,
                                                    )
                                                  }
                                                  className="p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                  title="Delete subsection"
                                                  disabled={!section.enabled}
                                                >
                                                  <X className="w-2.5 h-2.5" />
                                                </button>
                                                {subsection.enabled &&
                                                section.enabled ? (
                                                  <Eye className="w-3 h-3 text-green-500" />
                                                ) : (
                                                  <EyeOff className="w-3 h-3 text-gray-300" />
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    ),
                                  )}
                                  {(section.subsections || []).length === 0 && (
                                    <div
                                      className={`text-center py-2 text-xs ${
                                        subSnapshot.isDraggingOver
                                          ? "text-yellow-600 bg-yellow-100 border-2 border-dashed border-yellow-400 rounded"
                                          : "text-gray-400 border border-dashed border-gray-200 rounded"
                                      }`}
                                    >
                                      {subSnapshot.isDraggingOver
                                        ? "Drop subsection here"
                                        : "Drop subsections here"}
                                    </div>
                                  )}
                                  {subProvided.placeholder}
                                </div>
                              )}
                            </StrictModeDroppable>
                          </div>

                          {/* Section Action Buttons */}
                          <div className="ml-8 mt-2 flex items-center space-x-2">
                            <button
                              onClick={() => onAddSubsection(section.id)}
                              className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 border border-blue-200 hover:border-blue-300 transition-all"
                              title="Add subsection"
                            >
                              + Sub
                            </button>
                            <button
                              onClick={() => onAddBreak(section.id)}
                              className="text-xs text-orange-600 hover:text-orange-700 px-2 py-1 rounded hover:bg-orange-50 border border-orange-200 hover:border-orange-300 transition-all"
                              title="Add break"
                            >
                              + Break
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </StrictModeDroppable>
          </DragDropContext>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-2 border-t bg-gray-50 flex-shrink-0">
        <button
          onClick={onAddSection}
          className="w-full mb-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Add Section
        </button>
        <div className="text-xs text-gray-500 text-center">
          Drag items to reorder • Toggle checkboxes to enable/disable
        </div>
      </div>

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
    </div>
  );
};

export default SectionsOverview;
