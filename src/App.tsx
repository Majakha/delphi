import React, { useState, useEffect } from "react";
import { Protocol, Section, Subsection } from "./types";
import ProtocolEditor from "./components/ProtocolEditor";
import Login from "./components/Login";
import Header from "./components/Header";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AlertCircle, X } from "lucide-react";
import {
  protocolService,
  clearOldProtocolData,
} from "./services/protocolService";
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [enabledSections, setEnabledSections] = useState<Section[]>([]);
  const [totalSections, setTotalSections] = useState<number>(0);
  const [enabledTotalTime, setEnabledTotalTime] = useState<number>(0);
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
  const [protocol, setProtocol] = useState<Protocol>(() => {
    try {
      const savedProtocol = protocolService.loadLocal();
      if (savedProtocol && savedProtocol.data) {
        // Validate that the saved data has required Protocol properties
        if (
          savedProtocol.data.id &&
          savedProtocol.data.name &&
          savedProtocol.data.sections
        ) {
          // Ensure sections and subsections have enabled property
          const sectionsWithEnabled = savedProtocol.data.sections.map(
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

          return {
            ...savedProtocol.data,
            sections: sectionsWithEnabled,
            createdAt: savedProtocol.data.createdAt
              ? new Date(savedProtocol.data.createdAt)
              : new Date(),
            updatedAt: savedProtocol.data.updatedAt
              ? new Date(savedProtocol.data.updatedAt)
              : new Date(),
          };
        }
      }
    } catch (error) {
      console.error("Error loading saved protocol, clearing old data:", error);
      clearOldProtocolData();
    }
    return initialProtocol;
  });
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !hasError) {
      try {
        const updatedProtocol = {
          ...protocol,
          updatedAt: new Date(),
        };
        protocolService.saveLocally(updatedProtocol);
      } catch (error) {
        console.error("Error saving protocol:", error);
        setHasError(true);
      }
    }
  }, [protocol, isAuthenticated, hasError]);

  const handleExport = () => {
    const dataStr = JSON.stringify(protocol, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = `${protocol.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedProtocol = JSON.parse(e.target?.result as string);
          handleProtocolChange(importedProtocol);
        } catch (error) {
          console.error("Error parsing JSON:", error);
          alert("Error importing protocol. Please check the file format.");
        }
      };
      reader.readAsText(file);
    }
    // Reset file input
    event.target.value = "";
  };

  const handleProtocolChange = (updatedProtocol: Protocol) => {
    try {
      setProtocol({
        ...updatedProtocol,
        updatedAt: new Date(),
      });

      // Update sections stats
      const enabled = updatedProtocol.sections.filter(
        (section) => section.enabled,
      );
      setEnabledSections(enabled);
      setTotalSections(updatedProtocol.sections.length);

      // Calculate total time
      const totalTime = enabled.reduce((sum, section) => {
        const sectionTime =
          section.time +
          (section.subsections || [])
            .filter((sub) => sub.enabled)
            .reduce((subSum, sub) => {
              if (sub.type === "break") {
                return subSum + (sub as Subsection).time;
              }
              return subSum + (sub as Subsection).time;
            }, 0);
        return sum + sectionTime;
      }, 0);

      setEnabledTotalTime(totalTime);
      setHasError(false); // Reset error state on successful update
    } catch (error) {
      console.error("Error updating protocol:", error);
      setHasError(true);
    }
  };

  if (isLoading) {
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
                clearOldProtocolData();
                setProtocol(initialProtocol);
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

  const handleCompleteProtocol = () => {
    // Validate that all sections and subsections have importance ratings
    const missingSections: {
      type: "section" | "subsection";
      id: string;
      title: string;
    }[] = [];

    protocol.sections.forEach((section) => {
      // Check if section has a rating
      if (!section.rating || section.rating === 0) {
        missingSections.push({
          type: "section",
          id: section.id,
          title: section.title || "Untitled Section",
        });
      }

      // Check subsections
      if (section.subsections) {
        section.subsections.forEach((sub) => {
          if (sub.type === "subsection") {
            const subsection = sub as Subsection;
            if (!subsection.rating || subsection.rating === 0) {
              missingSections.push({
                type: "subsection",
                id: subsection.id,
                title: subsection.title || "Untitled Subsection",
              });
            }
          }
        });
      }
    });

    if (missingSections.length > 0) {
      setValidationAlert({
        show: true,
        message:
          "Please provide importance ratings for all sections and subsections before completing the protocol.",
        missingItems: missingSections,
      });
    } else {
      // Success! All items have ratings
      alert(
        "Protocol complete! All sections and subsections have importance ratings.",
      );
      // Here you would typically save or submit the protocol
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="bg-white shadow-sm"></div>

      <main className="flex-1 overflow-y-auto">
        <ProtocolEditor
          protocol={protocol}
          onProtocolChange={handleProtocolChange}
        />
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
