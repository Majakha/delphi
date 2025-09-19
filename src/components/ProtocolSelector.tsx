import React, { useState, useCallback } from "react";
import { Protocol } from "../services/types";
import { dataProvider } from "../services/DataProvider";
import { Plus, Calendar, Clock, ChevronRight, X, Copy } from "lucide-react";

interface ProtocolSelectorProps {
  onProtocolSelect: (protocol: Protocol) => void;
  onClose?: () => void;
}

const ProtocolSelector: React.FC<ProtocolSelectorProps> = ({
  onProtocolSelect,
  onClose,
}) => {
  const [userProtocols, setUserProtocols] = useState<Protocol[]>([]);
  const [templates, setTemplates] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [newProtocolData, setNewProtocolData] = useState({
    name: "",
    description: "",
    is_template: false,
  });
  const [creating, setCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Load user protocols on mount
  React.useEffect(() => {
    let isMounted = true;

    const loadUserProtocols = async () => {
      try {
        setLoading(true);
        setError(null);
        const protocols = await dataProvider.getProtocols({ user_only: true });
        if (isMounted) {
          setUserProtocols(protocols as Protocol[]);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load protocols",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUserProtocols();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load templates when requested
  const loadTemplates = useCallback(async () => {
    if (templatesLoaded) return;

    try {
      setTemplatesLoading(true);
      const templateProtocols = await dataProvider.getProtocols({
        templates_only: true,
      });
      setTemplates(templateProtocols as Protocol[]);
      setTemplatesLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setTemplatesLoading(false);
    }
  }, [templatesLoaded]);

  const handleCreateProtocol = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newProtocolData.name.trim()) return;

    try {
      setCreating(true);
      let newProtocol: Protocol;

      if (selectedTemplate) {
        // Create from template
        newProtocol = await dataProvider.createProtocol({
          name: newProtocolData.name.trim(),
          description: newProtocolData.description.trim() || undefined,
          template_protocol_id: selectedTemplate,
        });
      } else {
        // Create blank protocol
        newProtocol = await dataProvider.createProtocol({
          name: newProtocolData.name.trim(),
          description: newProtocolData.description.trim() || undefined,
          is_template: newProtocolData.is_template,
        });
      }

      onProtocolSelect(newProtocol);
      setShowCreateForm(false);
      setNewProtocolData({ name: "", description: "", is_template: false });
      setSelectedTemplate(null);
    } catch (error) {
      console.error("Error creating protocol:", error);
      setError("Failed to create protocol");
    } finally {
      setCreating(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId === selectedTemplate ? null : templateId);
  };

  const handleShowTemplates = () => {
    setShowTemplates(!showTemplates);
    if (!showTemplates && !templatesLoaded) {
      loadTemplates();
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Error Loading Protocols
          </h2>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reload
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">
            Select Protocol
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading protocols...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <p className="text-gray-600">
                  Choose an existing protocol or create a new one
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleShowTemplates}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={templatesLoading}
                  >
                    <Copy className="w-4 h-4" />
                    {templatesLoading
                      ? "Loading..."
                      : showTemplates
                        ? "Hide Templates"
                        : "Browse Templates"}
                  </button>
                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create New
                  </button>
                </div>
              </div>

              {/* Create Form */}
              {showCreateForm && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Create New Protocol
                  </h3>

                  <form onSubmit={handleCreateProtocol} className="space-y-4">
                    {/* Template Selection */}
                    {templates.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start from template (optional)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => setSelectedTemplate(null)}
                            className={`p-3 text-left rounded-md border-2 transition-colors ${
                              selectedTemplate === null
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="font-medium text-gray-900">
                              Start from scratch
                            </div>
                            <div className="text-sm text-gray-500">
                              Create an empty protocol
                            </div>
                          </button>
                          {templates.map((template: Protocol) => (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => handleTemplateSelect(template.id)}
                              className={`p-3 text-left rounded-md border-2 transition-colors ${
                                selectedTemplate === template.id
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className="font-medium text-gray-900 truncate">
                                {template.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {template.description || "No description"}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="protocolName"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Protocol Name *
                        </label>
                        <input
                          id="protocolName"
                          type="text"
                          value={newProtocolData.name}
                          onChange={(e) =>
                            setNewProtocolData((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter protocol name"
                          required
                          disabled={creating}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="protocolDescription"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Description
                        </label>
                        <input
                          id="protocolDescription"
                          type="text"
                          value={newProtocolData.description}
                          onChange={(e) =>
                            setNewProtocolData((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Optional description"
                          disabled={creating}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="isTemplate"
                        type="checkbox"
                        checked={newProtocolData.is_template}
                        onChange={(e) =>
                          setNewProtocolData((prev) => ({
                            ...prev,
                            is_template: e.target.checked,
                          }))
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={creating}
                      />
                      <label
                        htmlFor="isTemplate"
                        className="text-sm text-gray-700"
                      >
                        Create as template (can be reused by others)
                      </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateForm(false);
                          setSelectedTemplate(null);
                        }}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                        disabled={creating}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!newProtocolData.name.trim() || creating}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        {creating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Creating...
                          </>
                        ) : (
                          "Create Protocol"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Templates Section */}
              {showTemplates && templates.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Copy className="w-5 h-5" />
                    Available Templates
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template: Protocol) => (
                      <button
                        key={template.id}
                        onClick={() => onProtocolSelect(template)}
                        className="group p-4 bg-white border border-gray-200 rounded-lg text-left hover:border-blue-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 group-hover:text-blue-600 truncate">
                              {template.name}
                            </h4>
                            {template.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                {template.description}
                              </p>
                            )}
                          </div>
                          <Copy className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0 ml-2" />
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>Template Protocol</span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                            Template
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* User Protocols Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Your Protocols
                </h3>
                {userProtocols.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      No protocols yet
                    </h4>
                    <p className="text-gray-500 mb-4">
                      Create your first protocol to get started
                    </p>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create Protocol
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userProtocols.map((protocol) => (
                      <button
                        key={protocol.id}
                        onClick={() => onProtocolSelect(protocol)}
                        className="group p-4 bg-white border border-gray-200 rounded-lg text-left hover:border-blue-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 group-hover:text-blue-600 truncate">
                              {protocol.name}
                            </h4>
                            {protocol.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                {protocol.description}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0 ml-2" />
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>
                              {new Date(
                                protocol.created_at,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          {protocol.is_template && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                              Template
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProtocolSelector;
