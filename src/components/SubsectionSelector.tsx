import React, { useState, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import Popup from "./Popup";
import AddSubsectionPopup from "./AddSubsectionPopup";
import { Subsection } from "../types";
import { dataProvider } from "../services/DataProvider";

interface SubsectionSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (subsection: Omit<Subsection, "id">) => void;
  onAdd?: (subsection: Omit<Subsection, "id">) => void;
}

interface SharedSubsection {
  id: string;
  title: string;
  time: number;
  rating?: number;
  description: string;
  additional_notes: string;
  enabled: boolean;
  type: "subsection" | "break";
  created_by: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // Template data for creating new subsections
  templateData?: Omit<Subsection, "id">;
}

const SubsectionSelector: React.FC<SubsectionSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  onAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [subsections, setSubsections] = useState<SharedSubsection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreatePopup, setShowCreatePopup] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSubsections();
    }
  }, [isOpen]);

  const loadSubsections = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dataProvider.getSubsections();
      setSubsections(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load subsections",
      );
      setSubsections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async (subsectionData: Omit<Subsection, "id">) => {
    try {
      // Create the new subsection through the API
      await dataProvider.createSubsection({
        title: subsectionData.title,
        time: subsectionData.time || 0,
        rating: subsectionData.rating,
        description: subsectionData.description,
        additionalNotes: subsectionData.additionalNotes,
        type: subsectionData.type || "subsection",
        isPublic: true,
      });

      // Add to protocol if onAdd is provided
      if (onAdd) {
        onAdd(subsectionData);
      } else {
        // Otherwise select for immediate use
        onSelect(subsectionData);
      }

      // Refresh the list
      await loadSubsections();

      setShowCreatePopup(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create subsection",
      );
    }
  };

  const handleSelectSubsection = (subsection: SharedSubsection) => {
    // Convert shared subsection to local subsection format
    const localSubsection: Omit<Subsection, "id"> = {
      title: subsection.title,
      time: subsection.time || 0,
      rating: subsection.rating,
      description: subsection.description,
      additionalNotes: subsection.additional_notes || "",
      enabled: subsection.enabled,
      type: subsection.type,
      // If there's template data, use it
      ...(subsection.templateData || {}),
    };

    if (onAdd) {
      onAdd(localSubsection);
    } else {
      onSelect(localSubsection);
    }
    handleClose();
  };

  const handleClose = () => {
    setSearchTerm("");
    setError(null);
    onClose();
  };

  const filteredSubsections = (
    Array.isArray(subsections) ? subsections : []
  ).filter(
    (subsection) =>
      subsection.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subsection.description
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      subsection.additional_notes
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  return (
    <>
      <Popup
        isOpen={isOpen}
        onClose={handleClose}
        title="Select or Create Subsection"
        width="lg"
      >
        <div className="space-y-4">
          {/* Search and Create Button */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search existing subsections..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCreatePopup(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create New
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
              <button
                type="button"
                onClick={loadSubsections}
                className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="text-gray-500 text-sm mt-2">
                Loading subsections...
              </p>
            </div>
          )}

          {/* Subsections List */}
          {!loading && (
            <div className="max-h-96 overflow-y-auto">
              {filteredSubsections.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {searchTerm
                      ? "No subsections found matching your search."
                      : "No subsections available yet."}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Create a new one to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSubsections.map((subsection) => (
                    <div
                      key={subsection.id}
                      onClick={() => handleSelectSubsection(subsection)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">
                            {subsection.title}
                          </h3>
                          <p className="text-gray-600 text-sm mb-2">
                            {subsection.description}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>User ID: {subsection.created_by}</span>
                            <span>•</span>
                            <span>Time: {subsection.time}s</span>
                            <span>•</span>
                            <span>
                              {new Date(
                                subsection.created_at,
                              ).toLocaleDateString()}
                            </span>
                            {subsection.is_public && (
                              <>
                                <span>•</span>
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                  Public
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </Popup>

      {/* Create New Subsection Popup */}
      <AddSubsectionPopup
        isOpen={showCreatePopup}
        onClose={() => setShowCreatePopup(false)}
        onSave={handleCreateNew}
      />
    </>
  );
};

export default SubsectionSelector;
