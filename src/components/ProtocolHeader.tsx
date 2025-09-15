import React from "react";
import { Download, Upload, Settings } from "lucide-react";
import { Protocol } from "../types";

interface ProtocolHeaderProps {
  protocol: Protocol;
  onProtocolChange: (protocol: Protocol) => void;
  enabledSections: number;
  totalSections: number;
  enabledTotalTime: number;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
}

const ProtocolHeader: React.FC<ProtocolHeaderProps> = ({
  protocol,
  onProtocolChange,
  enabledSections,
  totalSections,
  enabledTotalTime,
  showAdvanced,
  onToggleAdvanced,
  onImport,
  onExport,
}) => {
  return (
    <div className="flex-shrink-0 bg-white border-b p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              {enabledTotalTime} min total
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleAdvanced}
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
              onChange={onImport}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={onExport}
            className="btn-primary flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProtocolHeader;
