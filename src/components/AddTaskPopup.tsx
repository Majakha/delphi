import React, { useState, useMemo } from "react";
import { Task, TaskFilters, SearchParams } from "../services/types";
import {
  Search,
  Plus,
  Filter,
  X,
  Play,
  Pause,
  Clock,
  Star,
  Tag,
  Target,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Popup from "./Popup";

interface AddTaskPopupProps {
  availableTasks: Task[];
  usedTaskIds: string[];
  onTaskSelect: (taskId: string) => void;
  onClose: () => void;
}

const AddTaskPopup: React.FC<AddTaskPopupProps> = ({
  availableTasks,
  usedTaskIds,
  onTaskSelect,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "task" | "break">("all");
  const [showCustomOnly, setShowCustomOnly] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  // Filter available tasks
  const filteredTasks = useMemo(() => {
    return availableTasks.filter((task) => {
      // Exclude already used tasks
      if (usedTaskIds.includes(task.id)) {
        return false;
      }

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (
          !task.title.toLowerCase().includes(searchLower) &&
          !task.description?.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Apply type filter
      if (filterType !== "all" && task.type !== filterType) {
        return false;
      }

      // Apply custom filter
      if (showCustomOnly && !task.is_custom) {
        return false;
      }

      return true;
    });
  }, [availableTasks, usedTaskIds, searchTerm, filterType, showCustomOnly]);

  const formatTime = (minutes: number | null) => {
    if (!minutes) return "No time set";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getTaskIcon = (type: "task" | "break") => {
    return type === "task" ? (
      <Play className="w-4 h-4 text-blue-500" />
    ) : (
      <Pause className="w-4 h-4 text-green-500" />
    );
  };

  const getTaskTypeColor = (type: "task" | "break") => {
    return type === "task"
      ? "bg-blue-50 border-blue-200 text-blue-800"
      : "bg-green-50 border-green-200 text-green-800";
  };

  const handleTaskSelect = (taskId: string) => {
    onTaskSelect(taskId);
  };

  const toggleExpanded = (taskId: string) => {
    setExpandedTask(expandedTask === taskId ? null : taskId);
  };

  return (
    <Popup isOpen={true} onClose={onClose} title="Add Task to Protocol">
      <div className="space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as "all" | "task" | "break")
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="task">Tasks Only</option>
              <option value="break">Breaks Only</option>
            </select>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCustomOnly}
                onChange={(e) => setShowCustomOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Custom tasks only</span>
            </label>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600">
          Showing {filteredTasks.length} of{" "}
          {availableTasks.length - usedTaskIds.length} available tasks
        </div>

        {/* Tasks List */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="mb-2">
                <Search className="w-12 h-12 mx-auto text-gray-300" />
              </div>
              <p>No tasks found matching your criteria</p>
              {usedTaskIds.length > 0 && (
                <p className="text-xs mt-1">
                  {usedTaskIds.length} tasks are already in this protocol
                </p>
              )}
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className="border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                {/* Task Header */}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {getTaskIcon(task.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">
                            {task.title}
                          </h3>
                          {task.is_custom && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Custom
                            </span>
                          )}
                        </div>

                        {/* Task Metadata */}
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getTaskTypeColor(task.type)}`}
                          >
                            {getTaskIcon(task.type)}
                            {task.type === "task" ? "Task" : "Break"}
                          </span>

                          {task.time && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTime(task.time)}</span>
                            </div>
                          )}

                          {task.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              <span>{task.rating}/5</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpanded(task.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        title={expandedTask === task.id ? "Collapse" : "Expand"}
                      >
                        {expandedTask === task.id ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleTaskSelect(task.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedTask === task.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      {task.description && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <p className="text-sm text-gray-600">
                            {task.description}
                          </p>
                        </div>
                      )}

                      {task.additional_notes && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Additional Notes
                          </label>
                          <p className="text-sm text-gray-600">
                            {task.additional_notes}
                          </p>
                        </div>
                      )}

                      {/* Sensors */}
                      {task.sensors && task.sensors.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Sensors
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {task.sensors.map((sensor) => (
                              <span
                                key={sensor.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                              >
                                <Tag className="w-2 h-2" />
                                {sensor.name}
                                <span className="text-gray-500">
                                  ({sensor.category})
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Domains */}
                      {task.domains && task.domains.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Domains
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {task.domains.map((domain) => (
                              <span
                                key={domain.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs"
                              >
                                <Target className="w-2 h-2" />
                                {domain.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Popup>
  );
};

export default AddTaskPopup;
