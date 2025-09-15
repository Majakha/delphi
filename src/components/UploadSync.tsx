import React, { useState, useEffect } from "react";
import {
  Cloud,
  CloudOff,
  Upload,
  Download,
  RefreshCw,
  Check,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  protocolService,
  ProtocolUploadResult,
} from "../services/protocolService";
import { Protocol } from "../types";

interface UploadSyncProps {
  protocol: Protocol;
  onProtocolLoad?: (protocol: Protocol) => void;
}

const UploadSync: React.FC<UploadSyncProps> = ({
  protocol,
  onProtocolLoad,
}) => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingUploads, setIsLoadingUploads] = useState(false);
  const [uploadResult, setUploadResult] = useState<ProtocolUploadResult | null>(
    null,
  );
  const [syncStatus, setSyncStatus] = useState(protocolService.getSyncStatus());
  const [userUploads, setUserUploads] = useState<any[]>([]);
  const [showUploads, setShowUploads] = useState(false);

  useEffect(() => {
    setSyncStatus(protocolService.getSyncStatus());
  }, [protocol]);

  const handleUpload = async () => {
    if (!user) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const result = await protocolService.uploadToServer(
        user.password,
        protocol,
      );
      setUploadResult(result);
      setSyncStatus(protocolService.getSyncStatus());

      if (result.success) {
        // Auto-hide success message after 3 seconds
        setTimeout(() => setUploadResult(null), 3000);
      }
    } catch (error) {
      setUploadResult({
        success: false,
        error: "Network error occurred",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const loadUserUploads = async () => {
    if (!user) return;

    setIsLoadingUploads(true);
    try {
      const uploads = await protocolService.getUserUploads(user.password);
      setUserUploads(uploads);
      setShowUploads(true);
    } catch (error) {
      console.error("Failed to load uploads:", error);
    } finally {
      setIsLoadingUploads(false);
    }
  };

  const loadProtocolFromUpload = (upload: any) => {
    const protocolData = protocolService.parseProtocolFromUpload(upload);
    if (protocolData && onProtocolLoad) {
      // Confirm before loading
      if (
        window.confirm(
          `Load protocol "${upload.protocol_name}"? This will replace your current work.`,
        )
      ) {
        onProtocolLoad(protocolData);
        setShowUploads(false);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {/* Sync Status */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          {syncStatus.needsUpload ? (
            <CloudOff className="w-5 h-5 text-orange-500" />
          ) : syncStatus.hasLocalChanges ? (
            <Cloud className="w-5 h-5 text-blue-500" />
          ) : (
            <Check className="w-5 h-5 text-green-500" />
          )}

          <div>
            <div className="text-sm font-medium">
              {syncStatus.needsUpload
                ? "Not synced"
                : syncStatus.hasLocalChanges
                  ? "Saved locally"
                  : "Up to date"}
            </div>
            <div className="text-xs text-gray-500">
              {syncStatus.lastSaved &&
                `Saved: ${syncStatus.lastSaved.toLocaleTimeString()}`}
              {syncStatus.lastUploaded &&
                ` • Uploaded: ${syncStatus.lastUploaded.toLocaleTimeString()}`}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadUserUploads}
            disabled={isLoadingUploads}
            className="btn-secondary flex items-center gap-1 text-sm"
          >
            {isLoadingUploads ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Load
          </button>

          <button
            onClick={handleUpload}
            disabled={isUploading || !user}
            className="btn-primary flex items-center gap-1 text-sm"
          >
            {isUploading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div
          className={`p-4 rounded-lg ${
            uploadResult.success
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <div className="flex items-start space-x-3">
            {uploadResult.success ? (
              <Check className="w-5 h-5 text-green-500 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            )}
            <div className="flex-1">
              <div
                className={`font-medium ${
                  uploadResult.success ? "text-green-800" : "text-red-800"
                }`}
              >
                {uploadResult.success ? "Upload successful!" : "Upload failed"}
              </div>
              <div
                className={`text-sm mt-1 ${
                  uploadResult.success ? "text-green-600" : "text-red-600"
                }`}
              >
                {uploadResult.success
                  ? `Protocol uploaded successfully${uploadResult.size ? ` (${formatFileSize(uploadResult.size)})` : ""}`
                  : uploadResult.error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Uploads Modal */}
      {showUploads && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Your Uploaded Protocols</h3>
              <button
                onClick={() => setShowUploads(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto max-h-96">
              {userUploads.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Cloud className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No uploaded protocols found.</p>
                  <p className="text-sm mt-2">
                    Upload your current protocol to see it here.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {userUploads.map((upload) => (
                    <div key={upload.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {upload.protocol_name || "Untitled Protocol"}
                          </h4>
                          <div className="text-sm text-gray-500 mt-1">
                            Protocol ID: {upload.protocol_id}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Created: {formatDate(upload.created_at)}
                            {upload.updated_at !== upload.created_at && (
                              <span>
                                {" "}
                                • Updated: {formatDate(upload.updated_at)}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => loadProtocolFromUpload(upload)}
                          className="btn-primary text-sm ml-4"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowUploads(false)}
                className="btn-secondary w-full"
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

export default UploadSync;
