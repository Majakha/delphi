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
        const sectionId = source.droppableId.replace("subsections-", "");
        const section = protocol.sections.find((s) => s.id === sectionId);

        if (section) {
          const items = Array.from(section.subsections);
          const [reorderedItem] = items.splice(source.index, 1);
          items.splice(destination.index, 0, reorderedItem);

          const updatedSection = { ...section, subsections: items };
          const updatedSections = protocol.sections.map((s) =>
            s.id === sectionId ? updatedSection : s,
          );

          onProtocolChange({
            ...protocol,
            sections: updatedSections,
          });
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
    <div className="max-w-[50%] mx-auto p-6">
      {/* Header */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={protocol.name}
              onChange={(e) =>
                onProtocolChange({ ...protocol, name: e.target.value })
              }
              className="input-field text-2xl font-bold"
              placeholder="Protocol Name"
            />
            <div className="flex items-center gap-4 mt-2">
              <select
                value={protocol.type}
                onChange={(e) =>
                  onProtocolChange({
                    ...protocol,
                    type: e.target.value as "in-lab" | "real-world",
                  })
                }
                className="input-field w-auto"
              >
                <option value="in-lab">In-lab</option>
                <option value="real-world">Real-world</option>
              </select>
              <span className="text-sm text-gray-500">
                {totalSections} sections, {totalSubsections} subsections,{" "}
                {totalTime} min total
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="btn-secondary flex items-center gap-1"
            >
              <Settings className="w-4 h-4" />
              Advanced
            </button>

            <label className="btn-secondary flex items-center gap-1 cursor-pointer">
              <Upload className="w-4 h-4" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleExport}
              className="btn-primary flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Sections */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="sections" type="section">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-4"
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
      <div className="card mt-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleAddSection}
            className="btn-primary flex items-center justify-center gap-2 flex-1"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
          <button
            type="button"
            onClick={handleAddBreak}
            className="btn-secondary flex items-center justify-center gap-2 flex-1"
          >
            <Plus className="w-4 h-4" />
            Add Break
          </button>
        </div>
      </div>

      {/* JSON Preview (Advanced) */}
      {showAdvanced && (
        <div className="card mt-6">
          <h3 className="text-lg font-semibold mb-4">JSON Preview</h3>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
            {JSON.stringify(protocol, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ProtocolEditor;
