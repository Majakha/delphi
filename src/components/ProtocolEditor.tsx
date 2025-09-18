import React, { useState, useCallback } from "react";
import { DragDropContext, Droppable, DropResult } from "react-beautiful-dnd";
import { Plus, Download, Upload, Settings } from "lucide-react";
import { Protocol, Section } from "../types";
import SectionCard from "./SectionCard";

interface ProtocolEditorProps {
  protocol: Protocol;
  onProtocolChange: (protocol: Protocol) => void;
}

const ProtocolEditor: React.FC<ProtocolEditorProps> = ({
  protocol,
  onProtocolChange,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSectionUpdate = useCallback(
    (updatedSection: Section) => {
      const updatedSections = protocol.sections.map((section) =>
        section.id === updatedSection.id ? updatedSection : section,
      );
      onProtocolChange({
        ...protocol,
        sections: updatedSections,
      });
    },
    [protocol, onProtocolChange],
  );

  const handleSectionDelete = useCallback(
    (sectionId: string) => {
      const updatedSections = protocol.sections.filter(
        (section) => section.id !== sectionId,
      );
      onProtocolChange({
        ...protocol,
        sections: updatedSections,
      });
    },
    [protocol, onProtocolChange],
  );

  const handleAddSection = useCallback(() => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      title: "",
      time: 0,
      rating: 3,
      description: "",
      additionalNotes: "",
      sensors: [],
      subsections: [],
      type: "section",
      enabled: true,
    };
    onProtocolChange({
      ...protocol,
      sections: [...protocol.sections, newSection],
    });
  }, [protocol, onProtocolChange]);

  const handleAddBreak = useCallback(() => {
    const newBreak: Section = {
      id: `section-${Date.now()}`,
      title: "",
      time: 0,
      rating: 3,
      description: "",
      additionalNotes: "",
      sensors: [],
      subsections: [],
      type: "section",
      enabled: true,
    };
    onProtocolChange({
      ...protocol,
      sections: [...protocol.sections, newBreak],
    });
  }, [protocol, onProtocolChange]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const { source, destination, type } = result;

      if (type === "section") {
        const items = Array.from(protocol.sections);
        const [reorderedItem] = items.splice(source.index, 1);
        items.splice(destination.index, 0, reorderedItem);

        onProtocolChange({
          ...protocol,
          sections: items,
        });
      } else if (type === "subsection") {
        // Handle subsection reordering within a section
        const sourceSectionId = source.droppableId.replace("subsections-", "");
        const destinationSectionId = destination.droppableId.replace(
          "subsections-",
          "",
        );

        // If moving within the same section
        if (sourceSectionId === destinationSectionId) {
          const section = protocol.sections.find(
            (s) => s.id === sourceSectionId,
          );
          if (section) {
            const items = Array.from(section.subsections);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);

            const updatedSection = { ...section, subsections: items };
            const updatedSections = protocol.sections.map((s) =>
              s.id === sourceSectionId ? updatedSection : s,
            );

            onProtocolChange({
              ...protocol,
              sections: updatedSections,
            });
          }
        }
        // If moving between different sections
        else {
          const sourceSection = protocol.sections.find(
            (s) => s.id === sourceSectionId,
          );
          const destSection = protocol.sections.find(
            (s) => s.id === destinationSectionId,
          );

          if (sourceSection && destSection) {
            // Copy all subsections
            const sourceItems = Array.from(sourceSection.subsections);
            const destItems = Array.from(destSection.subsections);

            // Get the item to move
            const [movedItem] = sourceItems.splice(source.index, 1);

            // Add to destination
            destItems.splice(destination.index, 0, movedItem);

            // Update both sections
            const updatedSections = protocol.sections.map((s) => {
              if (s.id === sourceSectionId) {
                return { ...s, subsections: sourceItems };
              }
              if (s.id === destinationSectionId) {
                return { ...s, subsections: destItems };
              }
              return s;
            });

            onProtocolChange({
              ...protocol,
              sections: updatedSections,
            });
          }
        }
      }
    },
    [protocol, onProtocolChange],
  );

  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(protocol, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = `${protocol.name.replace(/\s+/g, "_")}_protocol.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  }, [protocol]);

  const handleImport = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedProtocol = JSON.parse(e.target?.result as string);
          onProtocolChange(importedProtocol);
        } catch (error) {
          alert("Error importing protocol file. Please check the file format.");
        }
      };
      reader.readAsText(file);
    },
    [onProtocolChange],
  );

  const totalTime = protocol.sections.reduce((sum, section) => {
    const sectionTime =
      section.time +
      section.subsections.reduce((subSum, sub) => subSum + sub.time, 0);
    return sum + sectionTime;
  }, 0);

  const totalSections = protocol.sections.length;
  const totalSubsections = protocol.sections.reduce(
    (sum, section) => sum + section.subsections.length,
    0,
  );

  return (
    <div className="w-full p-4 pb-24">
      {/* Sections */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="sections" type="section">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-3"
            >
              {protocol.sections.map((section, index) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  index={index}
                  onUpdate={handleSectionUpdate}
                  onDelete={handleSectionDelete}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Section Buttons */}
      <div className="mt-4">
        <div className="flex flex-row gap-2">
          <button
            type="button"
            onClick={handleAddSection}
            className="btn-primary flex items-center justify-center gap-1 text-sm px-3 py-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
          <button
            type="button"
            onClick={handleAddBreak}
            className="btn-secondary flex items-center justify-center gap-1 text-sm px-3 py-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Break
          </button>
        </div>
      </div>

      {/* JSON Preview (Advanced) */}
      {showAdvanced && (
        <div className="mt-4 border rounded p-3">
          <h3 className="text-sm font-semibold mb-2">JSON Preview</h3>
          <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-xs max-h-40">
            {JSON.stringify(protocol, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ProtocolEditor;
