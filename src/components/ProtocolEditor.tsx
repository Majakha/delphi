import React, { useState, useEffect, useRef } from "react";
import { DropResult } from "react-beautiful-dnd";
import { MapPin, GripVertical, AlertCircle, X } from "lucide-react";
import { Protocol, Section, Subsection, Break } from "../types";
import ProtocolContent from "./ProtocolContent";
import UploadSync from "./UploadSync";
import SectionsOverview from "./SectionsOverview";

interface ProtocolEditorProps {
  protocol: Protocol;
  onProtocolChange: (protocol: Protocol) => void;
  showAdvanced?: boolean;
}

const ProtocolEditor: React.FC<ProtocolEditorProps> = ({
  protocol,
  onProtocolChange,
  showAdvanced: propShowAdvanced,
}) => {
  const [showAdvancedLocal, setShowAdvancedLocal] = useState(false);
  const showAdvanced =
    propShowAdvanced !== undefined ? propShowAdvanced : showAdvancedLocal;
  const [isDragDisabled, setIsDragDisabled] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activeSubsectionId, setActiveSubsectionId] = useState<string | null>(
    null,
  );
  const [scrollToast, setScrollToast] = useState<{
    show: boolean;
    message: string;
  }>({ show: false, message: "" });
  const [dragToast, setDragToast] = useState<{
    show: boolean;
    message: string;
  }>({ show: false, message: "" });
  // Validation alert now handled at the App level
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const editorPaneRef = useRef<HTMLDivElement | null>(null);

  // Enable drag and drop after component mounts to avoid SSR issues
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDragDisabled(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Scroll observer to track active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            const sectionId = Object.keys(sectionRefs.current).find(
              (id) => sectionRefs.current[id] === entry.target,
            );
            if (sectionId) {
              setActiveSectionId(sectionId);
            }
          }
        });
      },
      {
        root: editorPaneRef.current,
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0.1, 0.3, 0.5],
      },
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [protocol.sections]);

  // Calculate enabled sections and total time
  const enabledSections = protocol.sections.filter(
    (section) => section.enabled,
  );
  const totalSections = protocol.sections.length;
  const enabledTotalTime = enabledSections.reduce((sum, section) => {
    const sectionTime =
      section.time +
      (section.subsections || [])
        .filter((sub) => sub.enabled)
        .reduce((subSum, sub) => {
          if (sub.type === "break") {
            return subSum + (sub as Break).duration;
          }
          return subSum + (sub as Subsection).time;
        }, 0);
    return sum + sectionTime;
  }, 0);

  const handleSectionToggle = (sectionId: string, enabled: boolean) => {
    const updatedSections = protocol.sections.map((section) =>
      section.id === sectionId ? { ...section, enabled } : section,
    );
    onProtocolChange({ ...protocol, sections: updatedSections });
  };

  const handleSubsectionToggle = (
    sectionId: string,
    subsectionId: string,
    enabled: boolean,
  ) => {
    const updatedSections = protocol.sections.map((section) => {
      if (section.id === sectionId) {
        const updatedSubsections = (section.subsections || []).map((sub) =>
          sub.id === subsectionId ? { ...sub, enabled } : sub,
        );
        return { ...section, subsections: updatedSubsections };
      }
      return section;
    });
    onProtocolChange({ ...protocol, sections: updatedSections });
  };

  const handleSubsectionDelete = (sectionId: string, subsectionId: string) => {
    const updatedSections = protocol.sections.map((section) => {
      if (section.id === sectionId) {
        const updatedSubsections = (section.subsections || []).filter(
          (sub) => sub.id !== subsectionId,
        );
        return { ...section, subsections: updatedSubsections };
      }
      return section;
    });
    onProtocolChange({ ...protocol, sections: updatedSections });
  };

  const handleActivateSection = (sectionId: string, subsectionId?: string) => {
    setActiveSectionId(sectionId);
    setActiveSubsectionId(subsectionId || null);
  };

  const handleScrollToSection = (sectionId: string, subsectionId?: string) => {
    const section = protocol.sections.find((s) => s.id === sectionId);
    const sectionElement = sectionRefs.current[sectionId];

    // Update active section and subsection
    handleActivateSection(sectionId, subsectionId);

    if (sectionElement && section) {
      // Show toast notification
      const message = subsectionId
        ? `Scrolling to subsection in "${section.title || "Untitled Section"}"`
        : `Scrolling to "${section.title || "Untitled Section"}"`;

      setScrollToast({ show: true, message });

      // Hide toast after 2 seconds
      setTimeout(() => setScrollToast({ show: false, message: "" }), 2000);

      // Add highlight animation to section
      sectionElement.classList.add("animate-pulse", "bg-blue-50");
      setTimeout(() => {
        sectionElement.classList.remove("animate-pulse", "bg-blue-50");
      }, 1500);

      sectionElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });

      // If subsection ID is provided, try to scroll to it after a brief delay
      if (subsectionId) {
        setTimeout(() => {
          const subsectionElement = sectionElement.querySelector(
            `[data-subsection-id="${subsectionId}"]`,
          );
          if (subsectionElement) {
            // Add highlight animation to subsection
            subsectionElement.classList.add("animate-pulse", "bg-yellow-50");
            setTimeout(() => {
              subsectionElement.classList.remove(
                "animate-pulse",
                "bg-yellow-50",
              );
            }, 1500);

            subsectionElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
            });
          }
        }, 300);
      }
    }
  };

  const handleSectionReorder = (
    sourceIndex: number,
    destinationIndex: number,
  ) => {
    const sections = Array.from(protocol.sections);
    const [reorderedSection] = sections.splice(sourceIndex, 1);
    sections.splice(destinationIndex, 0, reorderedSection);

    onProtocolChange({ ...protocol, sections });

    // Show toast notification
    setDragToast({
      show: true,
      message: `Moved ${reorderedSection.title || "section"} to position ${destinationIndex + 1}`,
    });
    setTimeout(() => setDragToast({ show: false, message: "" }), 2000);
  };

  const handleSubsectionReorder = (
    sourceSectionId: string,
    destinationSectionId: string,
    sourceIndex: number,
    destinationIndex: number,
  ) => {
    const updatedSections = protocol.sections.map((section) => {
      if (
        section.id === sourceSectionId &&
        section.id === destinationSectionId
      ) {
        // Moving within the same section
        const subsections = Array.from(section.subsections || []);
        const [reorderedSubsection] = subsections.splice(sourceIndex, 1);
        subsections.splice(destinationIndex, 0, reorderedSubsection);
        return { ...section, subsections };
      } else if (section.id === sourceSectionId) {
        // Removing from source section
        const subsections = Array.from(section.subsections || []);
        subsections.splice(sourceIndex, 1);
        return { ...section, subsections };
      } else if (section.id === destinationSectionId) {
        // Adding to destination section
        const sourceSection = protocol.sections.find(
          (s) => s.id === sourceSectionId,
        );
        const movedSubsection = sourceSection?.subsections?.[sourceIndex];
        if (movedSubsection) {
          const subsections = Array.from(section.subsections || []);
          subsections.splice(destinationIndex, 0, movedSubsection);
          return { ...section, subsections };
        }
      }
      return section;
    });

    onProtocolChange({ ...protocol, sections: updatedSections });
  };

  const handleAddSection = () => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      title: `Section ${protocol.sections.length + 1}`,
      time: 0,
      rating: 0,
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
  };

  const handleAddBreak = (sectionId: string) => {
    const updatedSections = protocol.sections.map((section) => {
      if (section.id === sectionId) {
        const newBreak: Break = {
          id: `break-${Date.now()}`,
          title: `Break ${(section.subsections || []).filter((s) => s.type === "break").length + 1}`,
          duration: 5,
          type: "break",
          enabled: true,
        };
        return {
          ...section,
          subsections: [...(section.subsections || []), newBreak],
        };
      }
      return section;
    });
    onProtocolChange({ ...protocol, sections: updatedSections });
  };

  const handleAddSubsection = (sectionId: string) => {
    const updatedSections = protocol.sections.map((section) => {
      if (section.id === sectionId) {
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
        return {
          ...section,
          subsections: [...(section.subsections || []), newSubsection],
        };
      }
      return section;
    });
    onProtocolChange({ ...protocol, sections: updatedSections });
  };

  const handleSectionUpdate = (updatedSection: Section) => {
    const updatedSections = protocol.sections.map((section) =>
      section.id === updatedSection.id ? updatedSection : section,
    );
    onProtocolChange({ ...protocol, sections: updatedSections });
  };

  const handleSectionDelete = (id: string) => {
    const updatedSections = protocol.sections.filter(
      (section) => section.id !== id,
    );
    onProtocolChange({ ...protocol, sections: updatedSections });
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, type } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (type === "section") {
      handleSectionReorder(source.index, destination.index);
    } else if (type === "subsection") {
      const sourceSectionId = source.droppableId.replace("subsections-", "");
      const destinationSectionId = destination.droppableId.replace(
        "subsections-",
        "",
      );

      handleSubsectionReorder(
        sourceSectionId,
        destinationSectionId,
        source.index,
        destination.index,
      );
    }
  };

  // Export and Import functions now handled by parent component

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Upload/Sync Section */}
      {showAdvanced && (
        <div className="flex-shrink-0 bg-gray-50 border-b p-4">
          <h3 className="text-lg font-semibold mb-4">Cloud Sync</h3>
          <UploadSync protocol={protocol} onProtocolLoad={onProtocolChange} />
        </div>
      )}

      {/* Two-pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Overview Pane */}
        <div className="w-96 flex-shrink-0 bg-gray-50 border-r overflow-y-auto">
          <SectionsOverview
            sections={protocol.sections}
            onSectionToggle={handleSectionToggle}
            onSubsectionToggle={handleSubsectionToggle}
            onSectionClick={handleScrollToSection}
            activeSectionId={activeSectionId}
            activeSubsectionId={activeSubsectionId}
            onSectionReorder={handleSectionReorder}
            onSubsectionReorder={handleSubsectionReorder}
            onAddSection={handleAddSection}
            onAddSubsection={handleAddSubsection}
            onAddBreak={handleAddBreak}
            onSectionDelete={handleSectionDelete}
            onSubsectionDelete={handleSubsectionDelete}
          />
        </div>

        {/* Editor Pane */}
        <ProtocolContent
          protocol={protocol}
          onProtocolChange={onProtocolChange}
          isDragDisabled={isDragDisabled}
          sectionRefs={sectionRefs}
          editorPaneRef={editorPaneRef}
          onAddSection={handleAddSection}
          onSectionUpdate={handleSectionUpdate}
          onSectionDelete={handleSectionDelete}
          onDragEnd={handleDragEnd}
          showAdvanced={showAdvanced}
          activeSectionId={activeSectionId}
          activeSubsectionId={activeSubsectionId}
          onSectionActivate={handleActivateSection}
        />
      </div>

      {/* Scroll Toast Notification */}
      {scrollToast.show && (
        <div className="fixed top-20 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-fade-in">
          <MapPin className="w-4 h-4" />
          <span className="text-sm font-medium">{scrollToast.message}</span>
        </div>
      )}

      {/* Drag Toast Notification */}
      {dragToast.show && (
        <div className="fixed top-20 left-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-fade-in">
          <GripVertical className="w-4 h-4" />
          <span className="text-sm font-medium">{dragToast.message}</span>
        </div>
      )}

      {/* Footer removed - Complete Protocol button moved to header */}

      {/* Validation Alert moved to App.tsx */}
    </div>
  );
};

export default ProtocolEditor;
