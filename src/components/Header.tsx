import React, { useState } from "react";
import { useAuth } from "../hooks/useDataProvider";
import {
  Download,
  Upload,
  Settings,
  CheckCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { FullProtocol } from "../services/types";

interface HeaderProps {
  protocol?: FullProtocol;
  onProtocolChange?: (protocol: FullProtocol) => void;
  protocolName?: string;
  lastUpdated?: Date | string;
  enabledTasks?: number;
  totalTasks?: number;
  enabledTotalTime?: number;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
  onImport?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExport?: () => void;
  onCompleteProtocol?: () => void;
  onSwitchProtocol?: () => void;
  onCreateNewProtocol?: () => void;
  onDeleteProtocol?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  protocol,
  onProtocolChange,
  protocolName,
  lastUpdated,
  enabledTasks,
  totalTasks,
  enabledTotalTime,
  showAdvanced,
  onToggleAdvanced,
  onImport,
  onExport,
  onCompleteProtocol,
  onSwitchProtocol,
  onCreateNewProtocol,
  onDeleteProtocol,
}) => {
  const { user, logout, loading: authLoading } = useAuth();
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleLogout = async () => {
    if (!logoutConfirm) {
      setLogoutConfirm(true);
      return;
    }

    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    if (onDeleteProtocol) {
      await onDeleteProtocol();
    }
    setDeleteConfirm(false);
  };

  const cancelLogout = () => {
    setLogoutConfirm(false);
  };

  const cancelDelete = () => {
    setDeleteConfirm(false);
  };

  // Calculate protocol statistics
  const taskStats = protocol
    ? {
        totalTasks: protocol.tasks.length,
        activeTasks: protocol.tasks.filter((task) => task.type === "task")
          .length,
        breaks: protocol.tasks.filter((task) => task.type === "break").length,
        overrides: protocol.tasks.filter(
          (task) =>
            task.has_title_override ||
            task.has_time_override ||
            task.has_description_override ||
            task.has_notes_override,
        ).length,
        totalTime: protocol.tasks.reduce(
          (sum, task) => sum + (task.time || 0),
          0,
        ),
      }
    : null;

  return (
    <header className="bg-white shadow-sm border-b flex-shrink-0">
      <div className="px-6 py-4">
        {/* App Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Delphi Protocol Builder
            </h1>
            <p className="text-gray-600">
              Design data-gathering protocols for dementia studies
            </p>
            {protocolName && !protocol && (
              <p className="text-sm text-gray-500 mt-1">
                Current protocol:{" "}
                <span className="font-medium">{protocolName}</span>
              </p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              {lastUpdated && (
                <div className="text-sm text-gray-500">
                  Last updated:{" "}
                  {(() => {
                    try {
                      const date = new Date(lastUpdated);
                      return isNaN(date.getTime())
                        ? "Invalid date"
                        : date.toLocaleString();
                    } catch {
                      return "Invalid date";
                    }
                  })()}
                </div>
              )}
              {user && (
                <div className="text-sm text-gray-600">
                  Signed in as: {user.username}
                </div>
              )}
            </div>
            {!logoutConfirm ? (
              <button
                onClick={handleLogout}
                disabled={authLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-0.5 mr-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Logging out...
                  </>
                ) : (
                  <>
                    <svg
                      className="-ml-0.5 mr-2 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Logout
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-red-600 font-medium">
                  Unsaved changes will be lost
                </span>
                <button
                  onClick={handleLogout}
                  disabled={authLoading}
                  className="inline-flex items-center px-2 py-1 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  onClick={cancelLogout}
                  disabled={authLoading}
                  className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Protocol Header (shown when protocol is available) */}
        {protocol && onProtocolChange && (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 border-t border-gray-200">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="text"
                  value={protocol.name}
                  onChange={(e) =>
                    onProtocolChange({ ...protocol, name: e.target.value })
                  }
                  className="text-xl font-bold border-none bg-transparent p-0 focus:ring-0 focus:outline-none flex-1 min-w-0"
                  placeholder="Protocol Name"
                />
                {protocol.is_template && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Template
                  </span>
                )}
              </div>

              {protocol.description && (
                <textarea
                  value={protocol.description || ""}
                  onChange={(e) =>
                    onProtocolChange({
                      ...protocol,
                      description: e.target.value,
                    })
                  }
                  className="text-sm text-gray-600 border-none bg-transparent p-0 resize-none focus:ring-0 focus:outline-none w-full"
                  placeholder="Protocol description..."
                  rows={2}
                />
              )}

              {taskStats && (
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="whitespace-nowrap">
                    <span className="font-medium text-blue-600">
                      {taskStats.activeTasks}
                    </span>{" "}
                    tasks
                  </span>
                  <span className="whitespace-nowrap">
                    <span className="font-medium text-green-600">
                      {taskStats.breaks}
                    </span>{" "}
                    breaks
                  </span>
                  <span className="whitespace-nowrap">
                    <span className="font-medium text-orange-600">
                      {Math.floor(taskStats.totalTime / 60)}h{" "}
                      {taskStats.totalTime % 60}m
                    </span>{" "}
                    total
                  </span>
                  {taskStats.overrides > 0 && (
                    <span className="whitespace-nowrap">
                      <span className="font-medium text-purple-600">
                        {taskStats.overrides}
                      </span>{" "}
                      overrides
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onCompleteProtocol && (
                <button
                  onClick={onCompleteProtocol}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete
                </button>
              )}

              {onToggleAdvanced && (
                <button
                  type="button"
                  onClick={onToggleAdvanced}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Settings className="w-4 h-4" />
                  Advanced
                </button>
              )}

              {onImport && (
                <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Import
                  <input
                    type="file"
                    accept=".json"
                    onChange={onImport}
                    className="hidden"
                  />
                </label>
              )}

              {onExport && (
                <button
                  type="button"
                  onClick={onExport}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              )}

              {onSwitchProtocol && (
                <button
                  type="button"
                  onClick={onSwitchProtocol}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Settings className="w-4 h-4" />
                  Switch
                </button>
              )}

              {onCreateNewProtocol && (
                <button
                  type="button"
                  onClick={onCreateNewProtocol}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="w-4 h-4" />
                  New
                </button>
              )}

              {onDeleteProtocol && (
                <div className="relative">
                  {!deleteConfirm ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex items-center gap-2 px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleDelete}
                        className="inline-flex items-center px-2 py-1 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={cancelDelete}
                        className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
