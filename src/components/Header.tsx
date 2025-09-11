import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { Download, Upload, Settings, CheckCircle } from "lucide-react";
import { Protocol } from "../types";

interface HeaderProps {
  protocol?: Protocol;
  onProtocolChange?: (protocol: Protocol) => void;
  protocolName?: string;
  lastUpdated?: Date;
  enabledSections?: number;
  totalSections?: number;
  enabledTotalTime?: number;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
  onImport?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExport?: () => void;
  onCompleteProtocol?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  protocol,
  onProtocolChange,
  protocolName,
  lastUpdated,
  enabledSections,
  totalSections,
  enabledTotalTime,
  showAdvanced,
  onToggleAdvanced,
  onImport,
  onExport,
  onCompleteProtocol,
}) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (
      window.confirm(
        "Are you sure you want to log out? Any unsaved changes will be lost.",
      )
    ) {
      logout();
    }
  };

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
                  Last updated: {lastUpdated.toLocaleDateString()}
                </div>
              )}
              {user && (
                <div className="text-sm text-gray-600">User ID: {user.id}</div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
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
            </button>
          </div>
        </div>

        {/* Protocol Header (shown when protocol is available) */}
        {protocol && onProtocolChange && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-gray-200">
            <div className="flex-1">
              <input
                type="text"
                value={protocol.name}
                onChange={(e) =>
                  onProtocolChange({ ...protocol, name: e.target.value })
                }
                className="input-field text-xl font-bold border-none bg-transparent p-0"
                placeholder="Protocol Name"
              />
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <select
                  value={protocol.type}
                  onChange={(e) =>
                    onProtocolChange({
                      ...protocol,
                      type: e.target.value as "in-lab" | "real-world",
                    })
                  }
                  className="text-sm border border-gray-300 rounded px-2 py-1 flex-shrink-0"
                >
                  <option value="in-lab">In-lab</option>
                  <option value="real-world">Real-world</option>
                </select>
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  {enabledSections} of {totalSections} sections enabled •{" "}
                  {enabledTotalTime} min total •{" "}
                  {protocol?.sections.reduce(
                    (count, section) =>
                      count + (section.subsections?.length || 0),
                    0,
                  ) || 0}{" "}
                  subsections
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {onCompleteProtocol && (
                <button
                  onClick={onCompleteProtocol}
                  className="btn-primary flex items-center gap-1 py-1 px-3"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Complete Protocol</span>
                </button>
              )}

              {onToggleAdvanced && (
                <button
                  type="button"
                  onClick={onToggleAdvanced}
                  className="btn-secondary flex items-center gap-1"
                >
                  <Settings className="w-4 h-4" />
                  Advanced
                </button>
              )}

              {onImport && (
                <label className="btn-secondary flex items-center gap-1 cursor-pointer">
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
                  className="btn-primary flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
