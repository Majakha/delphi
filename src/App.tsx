import React, { useState, useEffect } from "react";
import { Protocol } from "./types";
import ProtocolEditor from "./components/ProtocolEditor";
import ProtocolOverview from "./components/ProtocolOverview";
import Login from "./components/Login";
import Header from "./components/Header";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AlertCircle, X } from "lucide-react";
import { useProtocol } from "./hooks/useDataProvider";

import "./index.css";

const initialProtocol: Protocol = {
  id: "protocol-1",
  name: "New Dementia Study Protocol",
  type: "in-lab",
  sections: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [validationAlert, setValidationAlert] = useState<{
    show: boolean;
    message: string;
    missingItems: {
      type: "section" | "subsection";
      id: string;
      title: string;
    }[];
  }>({
    show: false,
    message: "",
    missingItems: [],
  });
  // Use a default protocol ID for now - in a real app this would come from routing
  const protocolId = "protocol-1";
  const {
    protocol: loadedProtocol,
    updateProtocol,
    loading: protocolLoading,
    error: protocolError,
  } = useProtocol(protocolId);

  const [protocol, setProtocol] = useState<Protocol>(initialProtocol);
  const [hasError, setHasError] = useState(false);

  // Update local state when protocol is loaded
  useEffect(() => {
    if (loadedProtocol) {
      // Ensure sections and subsections have enabled property for backward compatibility
      const sectionsWithEnabled = loadedProtocol.sections.map(
        (section: any) => ({
          ...section,
          enabled: section.enabled !== undefined ? section.enabled : true,
          subsections:
            section.subsections?.map((sub: any) => ({
              ...sub,
              enabled: sub.enabled !== undefined ? sub.enabled : true,
            })) || [],
        }),
      );

      setProtocol({
        ...loadedProtocol,
        sections: sectionsWithEnabled,
        type: loadedProtocol.type || "in-lab",
      });
    }
  }, [loadedProtocol]);

  // Handle protocol loading error
  useEffect(() => {
    if (protocolError) {
      setHasError(true);
    }
  }, [protocolError]);

  // Protocol is automatically saved via DataProvider, no need for manual saving

  const handleProtocolChange = (updatedProtocol: Protocol) => {
    try {
      const protocolWithUpdatedTime = {
        ...updatedProtocol,
        updatedAt: new Date(),
      };

      setProtocol(protocolWithUpdatedTime);

      // Save to DataProvider (convert to Partial<Protocol> for updateProtocol)
      const partialUpdate: Partial<Protocol> = {
        ...protocolWithUpdatedTime,
        createdAt: protocolWithUpdatedTime.createdAt,
        updatedAt: protocolWithUpdatedTime.updatedAt,
      };
      updateProtocol(partialUpdate);
      setHasError(false); // Reset error state on successful update
    } catch (error) {
      console.error("Error updating protocol:", error);
      setHasError(true);
    }
  };

  if (isLoading || protocolLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-4">
            There was an error loading your protocol data.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => {
                setProtocol(initialProtocol);
                const partialUpdate: Partial<Protocol> = {
                  ...initialProtocol,
                };
                updateProtocol(partialUpdate);
                setHasError(false);
              }}
              className="btn-primary w-full"
            >
              Start Fresh
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary w-full"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="bg-white shadow-sm"></div>

      <main className="flex-1 overflow-y-auto flex">
        <div className="w-3/5 overflow-y-auto border-r border-gray-200">
          <ProtocolEditor
            protocol={protocol}
            onProtocolChange={handleProtocolChange}
          />
        </div>
        <div className="w-2/5 overflow-y-auto">
          <ProtocolOverview protocol={protocol} />
        </div>
      </main>

      {/* Validation Alert */}
      {validationAlert.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 pt-24 pb-16">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Missing Importance Ratings
                </h3>
              </div>
              <button
                onClick={() =>
                  setValidationAlert({ ...validationAlert, show: false })
                }
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">{validationAlert.message}</p>
            <div className="flex-1 overflow-y-auto border rounded-md p-2 mb-2">
              <ul className="divide-y divide-gray-200">
                {validationAlert.missingItems.map((item) => (
                  <li key={item.id} className="py-2">
                    <div className="flex items-center">
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded-full mr-2 bg-blue-100 text-blue-800">
                        {item.type === "section" ? "Section" : "Subsection"}
                      </span>
                      <button
                        onClick={() => {
                          // Find the section element and scroll to it
                          const sectionElement = document.querySelector(
                            `[data-section-id="${item.type === "section" ? item.id : ""}"]`,
                          );
                          if (sectionElement) {
                            sectionElement.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }
                          setValidationAlert({
                            ...validationAlert,
                            show: false,
                          });
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {item.title}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() =>
                  setValidationAlert({ ...validationAlert, show: false })
                }
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
