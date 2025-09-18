import React, { useState } from "react";
import { Draggable, Droppable } from "react-beautiful-dnd";
import { X, GripVertical, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Section, Subsection, Sensor } from "../types";
import RatingStars from "./RatingStars";
import SubsectionCard from "./SubsectionCard";
import SubsectionSelector from "./SubsectionSelector";
import AutoResizeTextarea from "./AutoResizeTextarea";
import { dataProvider } from "../services/DataProvider";

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
  const [showSensorSelector, setShowSensorSelector] = useState(false);
  const [showSubsectionSelector, setShowSubsectionSelector] = useState(false);
  const [sensors, setSensors] = useState<Sensor[]>([]);

  React.useEffect(() => {
    loadSensors();
  }, []);

  const loadSensors = async () => {
    try {
      const apiSensors = await dataProvider.getSensors();
      setSensors(apiSensors);
    } catch (error) {
      console.error("Failed to load sensors:", error);
    }
  };

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

  const handleAddSubsection = (subsectionData: Omit<Subsection, "id">) => {
    const newSubsection: Subsection = {
      id: `subsection-${Date.now()}`,
      ...subsectionData,
    };
    handleChange("subsections", [...section.subsections, newSubsection]);
  };

  const handleAddBreak = () => {
    const newBreak: Subsection = {
      id: `break-${Date.now()}`,
      title: "Break",
      time: 5,
      additionalNotes: "",
      description: "Break time for participants",
      enabled: true,
      type: "break",
    };
    handleChange("subsections", [...section.subsections, newBreak]);
  };

  const handleAddSensor = (sensorId: string) => {
    if (!section.sensors.includes(sensorId)) {
      const updatedSensors = [...section.sensors, sensorId];
      handleChange("sensors", updatedSensors);
    }
  };

  const handleRemoveSensor = (sensorId: string) => {
    const updatedSensors = section.sensors.filter((id) => id !== sensorId);
    handleChange("sensors", updatedSensors);
  };

  const getSensorName = (sensorId: string) => {
    const sensor = sensors.find((s) => s.id === sensorId);
    return sensor ? sensor.name : sensorId;
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
          className={`
            card card-hover mb-1 transition-all duration-200
            ${snapshot.isDragging ? "shadow-lg rotate-2" : ""}
            ${isExpanded ? "ring-2 ring-blue-100 border-blue-200" : ""}
          `}
        >
          <div className="flex items-start gap-2">
            <div
              {...provided.dragHandleProps}
              className="flex-shrink-0 mt-2 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>

            <div className="flex-1 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 flex-1">
                  {/*<button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>*/}

                  <div className="flex-1 flex items-center gap-4">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      className="input-field font-medium text-lg flex-1"
                      placeholder="Section title"
                    />
                  </div>

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

                  <button
                    type="button"
                    onClick={() => onDelete(section.id)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sensors Row - Always visible when section has sensors */}
              {section.sensors && section.sensors.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 font-medium">
                    Sensors:
                  </span>
                  {section.sensors.map((sensorId) => (
                    <div
                      key={sensorId}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
                    >
                      <span>{getSensorName(sensorId)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSensor(sensorId)}
                        className="hover:text-blue-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowSensorSelector(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 text-gray-600 text-xs font-medium rounded-full hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add Sensor
                  </button>
                </div>
              )}

              {/* Add Sensor button when no sensors */}
              {(!section.sensors || section.sensors.length === 0) && (
                <button
                  type="button"
                  onClick={() => setShowSensorSelector(true)}
                  className="inline-flex items-center gap-2 px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Sensors
                </button>
              )}

              {isExpanded && (
                <div className="mt-4 border-blue-200">
                  {/* Description Textarea */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2"></label>
                    <AutoResizeTextarea
                      value={section.description || ""}
                      onChange={(e) =>
                        handleChange("description", e.target.value)
                      }
                      placeholder="Add section description, notes, or instructions..."
                      className="w-full min-h-[60px] p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Subsections Container */}
                  <div className="bg-gray-50/30 rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">
                          Subsections ({section.subsections.length})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowSubsectionSelector(true)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Subsection</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleAddBreak}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Break</span>
                        </button>

                        {/* Time Summary Badge */}
                        <div
                          className={`
                            inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium
                            ${
                              totalTime > section.time
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                            }
                          `}
                        >
                          {totalTime > section.time && (
                            <svg
                              className="w-3 h-3"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          <span>{totalTime}min used</span>
                        </div>
                      </div>
                    </div>

                    {section.subsections.length > 0 ? (
                      <Droppable
                        key={`subsections-drop-${section.id}`}
                        droppableId={`subsections-${section.id}`}
                        type="subsection"
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`
                              space-y-2 min-h-[40px] rounded-md transition-all duration-200
                              ${
                                snapshot.isDraggingOver
                                  ? "bg-blue-50 border-2 border-dashed border-blue-300 p-2"
                                  : "p-1"
                              }
                            `}
                          >
                            {section.subsections.map((subsection, subIndex) => (
                              <div key={subsection.id} className="relative">
                                <div className="">
                                  <SubsectionCard
                                    subsection={subsection}
                                    index={subIndex}
                                    onUpdate={handleSubsectionUpdate}
                                    onDelete={handleSubsectionDelete}
                                  />
                                </div>
                              </div>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    ) : (
                      <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg bg-gray-25">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <Plus className="w-4 h-4 text-gray-400" />
                          </div>
                          <p className="text-sm">
                            No subsections yet. Click "Add Subsection" to get
                            started.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Subsection Selector Popup */}
          <SubsectionSelector
            isOpen={showSubsectionSelector}
            onClose={() => setShowSubsectionSelector(false)}
            onSelect={handleAddSubsection}
            onAdd={handleAddSubsection}
          />

          {/* Sensor Selector Popup */}
          <SensorSelectorPopup
            isOpen={showSensorSelector}
            onClose={() => setShowSensorSelector(false)}
            onSelect={handleAddSensor}
            selectedSensors={section.sensors || []}
            availableSensors={sensors}
          />
        </div>
      )}
    </Draggable>
  );
};

// Sensor Selector Popup Component
interface SensorSelectorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sensorId: string) => void;
  selectedSensors: string[];
  availableSensors: Sensor[];
}

const SensorSelectorPopup: React.FC<SensorSelectorPopupProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedSensors,
  availableSensors,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSensors = availableSensors.filter(
    (sensor) =>
      sensor.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedSensors.includes(sensor.id),
  );

  const handleSensorSelect = (sensor: Sensor) => {
    onSelect(sensor.id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-96 max-h-96 overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Add Sensor</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search sensors..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
        </div>

        <div className="max-h-64 overflow-y-auto p-2">
          {filteredSensors.length > 0 ? (
            <div className="space-y-1">
              {filteredSensors.map((sensor) => (
                <button
                  key={sensor.id}
                  onClick={() => handleSensorSelect(sensor)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-3"
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="font-medium">{sensor.name}</span>
                  {sensor.description && (
                    <span className="text-sm text-gray-500 truncate">
                      {sensor.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No sensors available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SectionCard;
