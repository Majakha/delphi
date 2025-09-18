import React, { useState, useEffect } from "react";
import { Protocol } from "../types";
import { dataProvider } from "../services/DataProvider";
import { Plus, Calendar, User, Clock, ChevronRight, X } from "lucide-react";

interface ProtocolSelectorProps {
  onProtocolSelect: (protocol: Protocol) => void;
  onClose?: () => void;
}

interface UserProtocol {
  id: string;
  name: string;
  type: "in-lab" | "real-world";
  created_at: string;
  updated_at: string;
  sections_count?: number;
  total_time?: number;
}

const ProtocolSelector: React.FC<ProtocolSelectorProps> = ({
  onProtocolSelect,
  onClose,
}) => {
  const [protocols, setProtocols] = useState<UserProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProtocolName, setNewProtocolName] = useState("");
  const [newProtocolType, setNewProtocolType] = useState<
    "in-lab" | "real-world"
  >("in-lab");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadUserProtocols();
  }, []);

  const loadUserProtocols = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the DataProvider's API request method
      const protocolsList = await dataProvider["apiRequest"]("/protocols/my");

      const protocols = protocolsList.data || protocolsList || [];
      setProtocols(protocols);
    } catch (err) {
      console.error("Error loading protocols:", err);
      setError(err instanceof Error ? err.message : "Failed to load protocols");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProtocol = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newProtocolName.trim()) {
      setError("Protocol name is required");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const response = await dataProvider["apiRequest"]("/protocols", {
        method: "POST",
        body: {
          name: newProtocolName.trim(),
          type: newProtocolType,
        },
      });

      const newProtocol = response.data || response;

      // Convert to Protocol format expected by the app
      const protocolForApp: Protocol = {
        id: newProtocol.id,
        name: newProtocol.name,
        type: newProtocol.type,
        sections: [],
        createdAt: new Date(newProtocol.created_at || newProtocol.createdAt),
        updatedAt: new Date(newProtocol.updated_at || newProtocol.updatedAt),
      };

      onProtocolSelect(protocolForApp);
    } catch (err) {
      console.error("Error creating protocol:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create protocol",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleSelectProtocol = async (userProtocol: UserProtocol) => {
    try {
      // Fetch the full protocol data
      const response = await dataProvider["apiRequest"](
        `/protocols/${userProtocol.id}/full`,
      );
      const protocolData = response.data || response;

      // Convert to Protocol format expected by the app
      const protocol: Protocol = {
        id: protocolData.id,
        name: protocolData.name,
        type: userProtocol.type,
        sections:
          protocolData.sections?.map((section: any) => ({
            id: section.id,
            title: section.title,
            time: section.time || 0,
            rating: section.rating || 0,
            description: section.description || "",
            additionalNotes: section.additional_notes || "",
            sensors: section.sensors || [],
            subsections:
              section.subsections?.map((sub: any) => ({
                id: sub.id,
                title: sub.title,
                time: sub.time || 0,
                rating: sub.rating,
                description: sub.description || "",
                additionalNotes: sub.additional_notes || "",
                enabled: sub.enabled !== false,
                type: sub.type || "subsection",
              })) || [],
            type: "section" as const,
            enabled: section.enabled !== false,
          })) || [],
        createdAt: new Date(userProtocol.created_at),
        updatedAt: new Date(userProtocol.updated_at),
      };

      onProtocolSelect(protocol);
    } catch (err) {
      console.error("Error loading protocol:", err);
      setError(err instanceof Error ? err.message : "Failed to load protocol");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your protocols...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Select a Protocol
              </h2>
              <p className="text-gray-600 mt-1">
                Choose an existing protocol or create a new one
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create New
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {showCreateForm && (
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Create New Protocol
              </h3>
              <form onSubmit={handleCreateProtocol} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="protocolName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Protocol Name
                    </label>
                    <input
                      id="protocolName"
                      type="text"
                      value={newProtocolName}
                      onChange={(e) => setNewProtocolName(e.target.value)}
                      placeholder="Enter protocol name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={creating}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="protocolType"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Protocol Type
                    </label>
                    <select
                      id="protocolType"
                      value={newProtocolType}
                      onChange={(e) =>
                        setNewProtocolType(
                          e.target.value as "in-lab" | "real-world",
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={creating}
                    >
                      <option value="in-lab">In-lab</option>
                      <option value="real-world">Real-world</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating || !newProtocolName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {creating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create Protocol
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewProtocolName("");
                      setError(null);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 border-b border-gray-200">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                      onClick={() => setError(null)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <span className="sr-only">Dismiss</span>
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Protocols List */}
          <div className="flex-1 overflow-y-auto p-6">
            {protocols.length === 0 ? (
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No protocols found
                </h3>
                <p className="text-gray-500 mb-4">
                  Get started by creating your first protocol
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Protocol
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {protocols.map((protocol) => (
                  <button
                    key={protocol.id}
                    onClick={() => handleSelectProtocol(protocol)}
                    className="text-left p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 mb-1">
                          {protocol.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {protocol.type}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        Created {formatDate(protocol.created_at)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        Updated {formatDate(protocol.updated_at)}
                      </div>
                      {protocol.sections_count !== undefined && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <User className="w-4 h-4" />
                          {protocol.sections_count} sections
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProtocolSelector;
