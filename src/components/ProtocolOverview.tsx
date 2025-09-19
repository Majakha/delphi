import React from "react";
import { FullProtocol, ProtocolTask } from "../services/types";
import { Clock, Play, Pause, Star, Target, Tag } from "lucide-react";

interface ProtocolOverviewProps {
  protocol: FullProtocol;
}

const ProtocolOverview: React.FC<ProtocolOverviewProps> = ({ protocol }) => {
  // Calculate total minutes for the protocol
  const totalMinutes = protocol.tasks.reduce((total, task) => {
    return total + (task.time || 0);
  }, 0);

  // Calculate protocol statistics
  const stats = {
    totalTasks: protocol.tasks.length,
    tasksByType: {
      task: protocol.tasks.filter((t) => t.type === "task").length,
      break: protocol.tasks.filter((t) => t.type === "break").length,
    },
    totalSensors: new Set(
      protocol.tasks.flatMap((t) => t.sensors.map((s) => s.id)),
    ).size,
    totalDomains: new Set(
      protocol.tasks.flatMap((t) => t.domains.map((d) => d.id)),
    ).size,
    overrides: protocol.tasks.filter(
      (t) =>
        t.has_title_override ||
        t.has_time_override ||
        t.has_description_override ||
        t.has_notes_override,
    ).length,
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getTaskIcon = (type: "task" | "break") => {
    return type === "task" ? (
      <Play className="w-3 h-3 text-blue-500" />
    ) : (
      <Pause className="w-3 h-3 text-green-500" />
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-white rounded-lg shadow border border-gray-200 p-4 text-sm">
      {/* Protocol Header */}
      <div className="mb-4">
        <h2 className="text-lg font-bold mb-2">
          {protocol.name || "Untitled Protocol"}
        </h2>
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatTime(totalMinutes)} total</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                protocol.is_template
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {protocol.is_template ? "Template" : "Protocol"}
            </span>
          </div>
        </div>

        {/* Protocol Description */}
        {protocol.description && (
          <p className="text-xs text-gray-600 mb-3 p-2 bg-gray-50 rounded">
            {protocol.description}
          </p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-blue-50 p-2 rounded">
            <div className="font-semibold text-blue-800">
              {stats.tasksByType.task}
            </div>
            <div className="text-blue-600">Tasks</div>
          </div>
          <div className="bg-green-50 p-2 rounded">
            <div className="font-semibold text-green-800">
              {stats.tasksByType.break}
            </div>
            <div className="text-green-600">Breaks</div>
          </div>
          <div className="bg-orange-50 p-2 rounded">
            <div className="font-semibold text-orange-800">
              {stats.totalSensors}
            </div>
            <div className="text-orange-600">Sensors</div>
          </div>
          <div className="bg-purple-50 p-2 rounded">
            <div className="font-semibold text-purple-800">
              {stats.overrides}
            </div>
            <div className="text-purple-600">Modified</div>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900 border-b border-gray-200 pb-1">
          Tasks ({protocol.tasks.length})
        </h3>

        {protocol.tasks.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-gray-400 mb-2">
              <Play className="w-12 h-12 mx-auto" />
            </div>
            <p>No tasks added yet</p>
          </div>
        ) : (
          protocol.tasks
            .sort((a, b) => a.order_index - b.order_index)
            .map((task, index) => (
              <div
                key={task.protocol_task_id}
                className="border border-gray-200 rounded p-3"
              >
                {/* Task Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span className="text-xs text-gray-400 mt-0.5">
                      #{index + 1}
                    </span>
                    {getTaskIcon(task.type)}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {task.title}
                        {(task.has_title_override ||
                          task.has_time_override ||
                          task.has_description_override ||
                          task.has_notes_override) && (
                          <span className="ml-1 inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Modified
                          </span>
                        )}
                      </h4>
                    </div>
                  </div>

                  {/* Duration and Rating */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {task.time && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span
                          className={
                            task.has_time_override
                              ? "text-purple-700 font-medium"
                              : ""
                          }
                        >
                          {formatTime(task.time)}
                        </span>
                      </div>
                    )}
                    {task.importance_rating && (
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3 text-orange-500" />
                        <span className="text-orange-600">
                          {task.importance_rating}/5
                        </span>
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

                {/* Task Description */}
                {task.description && (
                  <p
                    className={`text-xs text-gray-600 mb-2 ${
                      task.has_description_override ? "font-medium" : ""
                    }`}
                  >
                    {task.description.length > 100
                      ? `${task.description.substring(0, 100)}...`
                      : task.description}
                  </p>
                )}

                {/* Protocol Notes */}
                {task.notes && (
                  <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded mb-2">
                    <span className="font-medium">Protocol Notes:</span>{" "}
                    {task.notes}
                  </p>
                )}

                {/* Additional Notes */}
                {task.additional_notes && (
                  <p
                    className={`text-xs text-gray-600 mb-2 ${
                      task.has_notes_override ? "font-medium" : ""
                    }`}
                  >
                    <span className="font-medium">Notes:</span>{" "}
                    {task.additional_notes}
                  </p>
                )}

                {/* Sensors and Domains */}
                <div className="flex flex-wrap gap-1 text-xs">
                  {task.sensors.map((sensor) => (
                    <span
                      key={sensor.id}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded"
                    >
                      <Tag className="w-2 h-2" />
                      {sensor.name}
                    </span>
                  ))}
                  {task.domains.map((domain) => (
                    <span
                      key={domain.id}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded"
                    >
                      <Target className="w-2 h-2" />
                      {domain.name}
                    </span>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default ProtocolOverview;
