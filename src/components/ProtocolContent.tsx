import React from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import StrictModeDroppable from "./StrictModeDroppable";
import { Plus } from "lucide-react";
import { Protocol, Section } from "../types";
import SectionCard from "./SectionCard";

interface ProtocolContentProps {
  protocol: Protocol;
  onProtocolChange: (protocol: Protocol) => void;
  isDragDisabled: boolean;
  sectionRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  editorPaneRef: React.MutableRefObject<HTMLDivElement | null>;
  onAddSection: () => void;
  onSectionUpdate: (section: Section) => void;
  onSectionDelete: (id: string) => void;
  onDragEnd: (result: DropResult) => void;
  showAdvanced: boolean;
  activeSectionId?: string | null;
  activeSubsectionId?: string | null;
  onSectionActivate?: (sectionId: string, subsectionId?: string) => void;
}

const ProtocolContent: React.FC<ProtocolContentProps> = ({
  protocol,
  onProtocolChange,
  isDragDisabled,
  sectionRefs,
  editorPaneRef,
  onAddSection,
  onSectionUpdate,
  onSectionDelete,
  onDragEnd,
  showAdvanced,
  activeSectionId,
  activeSubsectionId,
  onSectionActivate,
}) => {
  // Filter to only show enabled sections
  const enabledSections = protocol.sections.filter(
    (section) => section.enabled,
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div ref={editorPaneRef} className="flex-1 overflow-y-auto p-4 pt-2 pb-4">
        {/* Add Section Buttons */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onAddSection}
              className="btn-primary flex items-center justify-center gap-2 flex-1"
            >
              <Plus className="w-4 h-4" />
              Add Section
            </button>
          </div>
        </div>

        {/* Sections */}
        {enabledSections.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <p>No enabled sections.</p>
            <p className="text-sm mt-1">
              Enable sections in the overview pane or create new ones.
            </p>
          </div>
        ) : isDragDisabled ? (
          <div className="space-y-4">
            {enabledSections.map((section, index) => (
              <div
                key={section.id}
                ref={(el) => {
                  sectionRefs.current[section.id] = el;
                }}
              >
                <SectionCard
                  section={section}
                  index={index}
                  onUpdate={onSectionUpdate}
                  onDelete={onSectionDelete}
                  isDragDisabled={isDragDisabled}
                  isActive={activeSectionId === section.id}
                  activeSubsectionId={activeSubsectionId}
                  onSectionActivate={onSectionActivate}
                />
              </div>
            ))}
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <StrictModeDroppable droppableId="sections" type="section">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-4"
                  style={{
                    backgroundColor: snapshot.isDraggingOver
                      ? "#f3f4f6"
                      : "transparent",
                  }}
                >
                  {enabledSections.map((section, index) => (
                    <div
                      key={section.id}
                      ref={(el) => {
                        sectionRefs.current[section.id] = el;
                      }}
                    >
                      <SectionCard
                        section={section}
                        index={index}
                        onUpdate={onSectionUpdate}
                        onDelete={onSectionDelete}
                        isDragDisabled={isDragDisabled}
                        isActive={activeSectionId === section.id}
                        activeSubsectionId={activeSubsectionId}
                        onSectionActivate={onSectionActivate}
                      />
                    </div>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </StrictModeDroppable>
          </DragDropContext>
        )}

        {/* JSON Preview (Advanced) */}
        {showAdvanced && (
          <div className="card mt-6">
            <h3 className="text-lg font-semibold mb-4">JSON Preview</h3>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm max-h-96">
              {JSON.stringify(protocol, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProtocolContent;
