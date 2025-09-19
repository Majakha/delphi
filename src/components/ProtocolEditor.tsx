import React, { useState, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
import { Plus, Search, Filter, SortAsc, SortDesc } from "lucide-react";
import { FullProtocol, ProtocolTask } from "../services/types";
import { useTasks } from "../hooks/useDataProvider";
import TaskCard from "./TaskCard";
import AddTaskPopup from "./AddTaskPopup";

interface ProtocolEditorProps {
  protocol: FullProtocol;
  onProtocolChange: (protocol: FullProtocol) => void;
  onTaskAdd?: (taskId: string, orderIndex?: number) => void;
  onTaskRemove?: (taskId: string) => void;
  onTaskReorder?: (taskId: string, newIndex: number) => void;
}

const ProtocolEditor: React.FC<ProtocolEditorProps> = ({
  protocol,
  onProtocolChange,
  onTaskAdd,
  onTaskRemove,
  onTaskReorder,
}) => {
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "task" | "break">("all");
  const [sortBy, setSortBy] = useState<"order" | "time" | "title">("order");
  const [sortDesc, setSortDesc] = useState(false);

  const { tasks: availableTasks } = useTasks();

  const handleTaskUpdate = useCallback(
    (taskId: string, updates: Partial<ProtocolTask>) => {
      const updatedTasks = protocol.tasks.map((task) =>
        task.task_id === taskId ? { ...task, ...updates } : task,
      );

      onProtocolChange({
        ...protocol,
        tasks: updatedTasks,
      });
    },
    [protocol, onProtocolChange],
  );

  const handleTaskEdit = useCallback(
    (taskId: string) => {
      setEditingTaskId(editingTaskId === taskId ? null : taskId);
    },
    [editingTaskId],
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId } = result;

      if (!destination) {
        return;
      }

      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }

      const taskId = draggableId.replace("task-", "");

      if (onTaskReorder) {
        onTaskReorder(taskId, destination.index);
      }

      // Update local state optimistically
      const updatedTasks = Array.from(protocol.tasks);
      const [movedTask] = updatedTasks.splice(source.index, 1);
      updatedTasks.splice(destination.index, 0, movedTask);

      // Update order indices
      updatedTasks.forEach((task, index) => {
        task.order_index = index;
      });

      onProtocolChange({
        ...protocol,
        tasks: updatedTasks,
      });
    },
    [protocol, onProtocolChange, onTaskReorder],
  );

  const handleAddTaskFromLibrary = useCallback(
    (taskId: string) => {
      if (onTaskAdd) {
        onTaskAdd(taskId, protocol.tasks.length);
      }
      setShowAddTask(false);
    },
    [onTaskAdd, protocol.tasks.length],
  );

  // Filter and sort tasks
  const filteredTasks = protocol.tasks.filter((task) => {
    if (filterType !== "all" && task.type !== filterType) {
      return false;
    }
    if (
      searchTerm &&
      !task.title.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "order":
        comparison = a.order_index - b.order_index;
        break;
      case "time":
        comparison = (a.time || 0) - (b.time || 0);
        break;
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
    }

    return sortDesc ? -comparison : comparison;
  });

  // Calculate protocol statistics
  const stats = {
    totalTasks: protocol.tasks.length,
    totalTime: protocol.tasks.reduce((sum, task) => sum + (task.time || 0), 0),
    tasksByType: {
      task: protocol.tasks.filter((t) => t.type === "task").length,
      break: protocol.tasks.filter((t) => t.type === "break").length,
    },
    overrides: protocol.tasks.filter(
      (t) =>
        t.has_title_override ||
        t.has_time_override ||
        t.has_description_override ||
        t.has_notes_override,
    ).length,
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Protocol Tasks
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {stats.totalTasks} tasks • {Math.floor(stats.totalTime / 60)}h{" "}
              {stats.totalTime % 60}m total
            </p>
          </div>
          <button
            onClick={() => setShowAddTask(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.tasksByType.task}
            </div>
            <div className="text-sm text-gray-600">Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.tasksByType.break}
            </div>
            <div className="text-sm text-gray-600">Breaks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Math.floor(stats.totalTime / 60)}h {stats.totalTime % 60}m
            </div>
            <div className="text-sm text-gray-600">Duration</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {stats.overrides}
            </div>
            <div className="text-sm text-gray-600">Modified</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

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

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "order" | "time" | "title")
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="order">Order</option>
              <option value="time">Duration</option>
              <option value="title">Title</option>
            </select>
            <button
              onClick={() => setSortDesc(!sortDesc)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded"
              title={sortDesc ? "Sort ascending" : "Sort descending"}
            >
              {sortDesc ? (
                <SortDesc className="w-4 h-4" />
              ) : (
                <SortAsc className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-6">
        {protocol.tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tasks in this protocol
            </h3>
            <p className="text-gray-500 mb-4">
              Add tasks from the library to get started
            </p>
            <button
              onClick={() => setShowAddTask(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Task
            </button>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="protocol-tasks">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-4 min-h-[200px] ${
                    snapshot.isDraggingOver ? "bg-blue-50 rounded-lg" : ""
                  }`}
                >
                  {sortedTasks.map((task, index) => (
                    <Draggable
                      key={task.protocol_task_id}
                      draggableId={`task-${task.task_id}`}
                      index={index}
                      isDragDisabled={sortBy !== "order"}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`${
                            snapshot.isDragging ? "rotate-2 shadow-lg" : ""
                          }`}
                        >
                          <TaskCard
                            task={task}
                            index={index}
                            onUpdate={handleTaskUpdate}
                            onRemove={onTaskRemove}
                            onEdit={handleTaskEdit}
                            isEditing={editingTaskId === task.task_id}
                            isDragDisabled={sortBy !== "order"}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {/* Filter Results Message */}
        {protocol.tasks.length > 0 && filteredTasks.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <Filter className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No tasks match your filters
            </h3>
            <p className="text-gray-500">
              Try adjusting your search term or filter settings
            </p>
          </div>
        )}
      </div>

      {/* Add Task Popup */}
      {showAddTask && (
        <AddTaskPopup
          availableTasks={availableTasks}
          usedTaskIds={protocol.tasks.map((t) => t.task_id)}
          onTaskSelect={handleAddTaskFromLibrary}
          onClose={() => setShowAddTask(false)}
        />
      )}
    </div>
  );
};

export default ProtocolEditor;
