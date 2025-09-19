import React, { useState } from "react";
import { ProtocolTask, Sensor, Domain } from "../services/types";
import {
  Clock,
  Star,
  Edit3,
  Trash2,
  GripVertical,
  Play,
  Pause,
  ChevronDown,
  ChevronRight,
  Tag,
  Target,
} from "lucide-react";
import RatingStars from "./RatingStars";

interface TaskCardProps {
  task: ProtocolTask;
  index: number;
  onUpdate?: (taskId: string, updates: Partial<ProtocolTask>) => void;
  onRemove?: (taskId: string) => void;
  onReorder?: (taskId: string, newIndex: number) => void;
  isEditing?: boolean;
  onEdit?: (taskId: string) => void;
  isDragDisabled?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  index,
  onUpdate,
  onRemove,
  onReorder,
  isEditing = false,
  onEdit,
  isDragDisabled = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleFieldUpdate = (field: keyof ProtocolTask, value: any) => {
    if (onUpdate) {
      onUpdate(task.task_id, { [field]: value });
    }
  };

  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    if (onRemove) {
      onRemove(task.task_id);
    }
    setShowDeleteConfirm(false);
  };

  const formatTime = (minutes: number | null) => {
    if (!minutes) return "No time set";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getTaskTypeIcon = (type: "task" | "break") => {
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

  const hasOverrides =
    task.has_title_override ||
    task.has_time_override ||
    task.has_description_override ||
    task.has_notes_override;

  return (
    <div
      className={`bg-white border rounded-lg shadow-sm transition-all duration-200 ${
        isEditing ? "ring-2 ring-blue-500 shadow-md" : "hover:shadow-md"
      }`}
      data-task-id={task.task_id}
    >
      {/* Task Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          {!isDragDisabled && (
            <div className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
              <GripVertical className="w-4 h-4" />
            </div>
          )}

          {/* Task Type Icon */}
          <div className="flex-shrink-0 mt-1">{getTaskTypeIcon(task.type)}</div>

          {/* Task Content */}
          <div className="flex-1 min-w-0">
            {/* Title Row */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    type="text"
                    value={task.title}
                    onChange={(e) => handleFieldUpdate("title", e.target.value)}
                    className="w-full text-lg font-semibold bg-transparent border-none p-0 focus:ring-0 focus:outline-none"
                    placeholder="Task title..."
                  />
                ) : (
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {task.title}
                    {task.has_title_override && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Custom
                      </span>
                    )}
                  </h3>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {onEdit && (
                  <button
                    onClick={() => onEdit(task.task_id)}
                    className="p-1 text-gray-400 hover:text-blue-600 rounded"
                    title="Edit task"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {onRemove && (
                  <div className="relative">
                    {!showDeleteConfirm ? (
                      <button
                        onClick={handleDelete}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="Remove task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleDelete}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Task Metadata Row */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {/* Task Type Badge */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getTaskTypeColor(task.type)}`}
              >
                {getTaskTypeIcon(task.type)}
                {task.type === "task" ? "Task" : "Break"}
              </span>

              {/* Duration */}
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {isEditing ? (
                  <input
                    type="number"
                    value={task.time || ""}
                    onChange={(e) =>
                      handleFieldUpdate(
                        "time",
                        e.target.value ? parseInt(e.target.value) : null,
                      )
                    }
                    className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    placeholder="min"
                    min="0"
                  />
                ) : (
                  <span
                    className={
                      task.has_time_override
                        ? "font-medium text-purple-700"
                        : ""
                    }
                  >
                    {formatTime(task.time)}
                    {task.has_time_override && " (custom)"}
                  </span>
                )}
              </div>

              {/* Rating */}
              {task.rating !== null && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  <span>{task.rating}/5</span>
                </div>
              )}

              {/* Importance Rating */}
              {task.importance_rating !== null && (
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-orange-500" />
                  {isEditing ? (
                    <RatingStars
                      rating={task.importance_rating}
                      onRatingChange={(rating) =>
                        handleFieldUpdate("importance_rating", rating)
                      }
                      size="sm"
                    />
                  ) : (
                    <span className="text-orange-600 font-medium">
                      {task.importance_rating}/5
                    </span>
                  )}
                </div>
              )}

              {/* Order Index */}
              <div className="text-xs text-gray-400">
                #{task.order_index + 1}
              </div>

              {/* Override Indicator */}
              {hasOverrides && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Modified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
                {task.has_description_override && (
                  <span className="ml-1 text-xs text-purple-600">(custom)</span>
                )}
              </label>
              {isEditing ? (
                <textarea
                  value={task.description || ""}
                  onChange={(e) =>
                    handleFieldUpdate("description", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                  placeholder="Task description..."
                />
              ) : (
                <p
                  className={`text-gray-600 ${task.has_description_override ? "font-medium" : ""}`}
                >
                  {task.description || "No description provided."}
                </p>
              )}
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
                {task.has_notes_override && (
                  <span className="ml-1 text-xs text-purple-600">(custom)</span>
                )}
              </label>
              {isEditing ? (
                <textarea
                  value={task.additional_notes || ""}
                  onChange={(e) =>
                    handleFieldUpdate("additional_notes", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={2}
                  placeholder="Additional notes..."
                />
              ) : (
                <p
                  className={`text-gray-600 ${task.has_notes_override ? "font-medium" : ""}`}
                >
                  {task.additional_notes || "No additional notes."}
                </p>
              )}
            </div>

            {/* Protocol Notes */}
            {task.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Protocol Notes
                </label>
                {isEditing ? (
                  <textarea
                    value={task.notes || ""}
                    onChange={(e) => handleFieldUpdate("notes", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={2}
                    placeholder="Notes specific to this protocol..."
                  />
                ) : (
                  <p className="text-gray-600 bg-blue-50 p-2 rounded">
                    {task.notes}
                  </p>
                )}
              </div>
            )}

            {/* Sensors */}
            {task.sensors && task.sensors.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sensors
                </label>
                <div className="flex flex-wrap gap-2">
                  {task.sensors.map((sensor) => (
                    <span
                      key={sensor.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                    >
                      <Tag className="w-3 h-3" />
                      {sensor.name}
                      <span className="text-gray-500">({sensor.category})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Domains */}
            {task.domains && task.domains.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domains
                </label>
                <div className="flex flex-wrap gap-2">
                  {task.domains.map((domain) => (
                    <span
                      key={domain.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                    >
                      <Target className="w-3 h-3" />
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
  );
};

export default TaskCard;
