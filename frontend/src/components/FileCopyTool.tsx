"use client";

import React, { useState, useEffect } from "react";
import { X, Folder, File, FolderOpen } from "lucide-react";
import { toast } from "react-hot-toast";
import fileCopyService from "@/services/file-copy-service";

interface FileCopyToolProps {
  isOpen: boolean;
  onClose: () => void;
  onCopy: (data: FileCopyData) => void;
}

export interface FileCopyData {
  sourceDirectory: string;
  targetDirectory: string;
  selectedFiles: FileItem[];
}

export interface FileItem {
  name: string;
  path: string;
  type: "file" | "folder";
  size?: number;
}

const FileCopyTool: React.FC<FileCopyToolProps> = ({
  isOpen,
  onClose,
  onCopy,
}) => {
  const [sourceDirectory, setSourceDirectory] = useState("");
  const [targetDirectory, setTargetDirectory] = useState("");
  const [sourceFiles, setSourceFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [expandedSelectedFolders, setExpandedSelectedFolders] = useState<
    Set<string>
  >(new Set());

  // Mock file data - in a real app, this would come from an API
  const mockFiles: FileItem[] = [
    { name: "src", path: "/src", type: "folder" },
    { name: "package.json", path: "/package.json", type: "file", size: 1024 },
    { name: "README.md", path: "/README.md", type: "file", size: 512 },
    { name: "components", path: "/src/components", type: "folder" },
    { name: "utils", path: "/src/utils", type: "folder" },
    { name: "App.tsx", path: "/src/App.tsx", type: "file", size: 2048 },
    { name: "index.ts", path: "/src/index.ts", type: "file", size: 256 },
  ];

  useEffect(() => {
    // Load files when source directory changes (for manually typed paths)
    const loadFiles = async () => {
      if (sourceDirectory && sourceDirectory.length > 0) {
        try {
          // Try to load files using the backend service
          const response = await fileCopyService.browseFiles(sourceDirectory);
          if (response.success && response.data) {
            setSourceFiles(response.data.files);
          } else {
            console.warn("Failed to load files from backend, using mock data");
            setSourceFiles(mockFiles);
          }
        } catch (error) {
          console.error("Error loading files:", error);
          // Fallback to mock files for demonstration
          setSourceFiles(mockFiles);
        }
      } else {
        setSourceFiles([]);
      }
    };

    // Debounce the loading to avoid too many API calls
    const timeoutId = setTimeout(loadFiles, 500);
    return () => clearTimeout(timeoutId);
  }, [sourceDirectory]);

  const handleBrowseSource = async () => {
    try {
      // Check if we're in an Electron environment or have extended file system access
      if ((window as any).electronAPI?.selectDirectory) {
        // Electron app - use native directory dialog
        try {
          const result = await (window as any).electronAPI.selectDirectory();
          if (result && !result.canceled && result.filePaths?.length > 0) {
            setSourceDirectory(result.filePaths[0]);
            toast.success("Source directory selected!");
            return;
          }
        } catch (error) {
          console.error("Electron directory selection error:", error);
        }
      }

      // Check if the File System Access API is supported (Chrome 86+)
      if ("showDirectoryPicker" in window) {
        try {
          const directoryHandle = await (window as any).showDirectoryPicker({
            mode: "read",
          });

          // Since we can't get the full path, we'll ask user to provide it
          const directoryName = directoryHandle.name || "selected folder";

          // Show a prompt for the user to enter the full path
          setTimeout(() => {
            const fullPath = prompt(
              `You selected the folder "${directoryName}".\n\n` +
                "Please enter the complete path to this folder:\n\n" +
                "Examples:\n" +
                "• Windows: C:\\Users\\YourName\\Documents\\MyFolder\n" +
                "• Mac: /Users/YourName/Documents/MyFolder\n" +
                "• Linux: /home/username/Documents/MyFolder",
              // Pre-fill with a common pattern
              navigator.platform.toLowerCase().includes("win")
                ? `C:\\Users\\${process.env.USERNAME || "YourName"}\\Documents\\${directoryName}`
                : `/Users/${process.env.USER || "username"}/Documents/${directoryName}`
            );

            if (fullPath && fullPath.trim()) {
              setSourceDirectory(fullPath.trim());
              toast.success("Source directory set successfully!");

              // Load files from the selected directory
              loadFilesFromDirectory(directoryHandle);
            }
          }, 500);

          return;
        } catch (error: any) {
          if (error.name !== "AbortError") {
            console.error("Directory picker error:", error);
            toast.error("Directory picker failed. Please enter path manually.");
          } else {
            // User cancelled
            return;
          }
        }
      }

      // Fallback: Direct prompt for manual entry
      const userPath = prompt(
        "Enter the full path to the source directory:\n\n" +
          "Examples:\n" +
          "• Windows: C:\\Users\\YourName\\Documents\\SourceFolder\n" +
          "• Mac: /Users/username/Documents/SourceFolder\n" +
          "• Linux: /home/username/Documents/SourceFolder"
      );

      if (userPath && userPath.trim()) {
        setSourceDirectory(userPath.trim());
        toast.success("Source directory set!");
      }
    } catch (error: any) {
      console.error("Browse source directory error:", error);
      toast.error(
        "Unable to open directory browser. Please enter the path manually."
      );

      // Focus on the input field
      const inputElement = document.querySelector(
        'input[placeholder="Select source directory"]'
      ) as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
        inputElement.select();
      }
    }
  };

  const handleBrowseTarget = async () => {
    try {
      // Check if we're in an Electron environment or have extended file system access
      if ((window as any).electronAPI?.selectDirectory) {
        // Electron app - use native directory dialog
        try {
          const result = await (window as any).electronAPI.selectDirectory();
          if (result && !result.canceled && result.filePaths?.length > 0) {
            setTargetDirectory(result.filePaths[0]);
            toast.success("Target directory selected!");
            return;
          }
        } catch (error) {
          console.error("Electron directory selection error:", error);
        }
      }

      // Check if the File System Access API is supported (Chrome 86+)
      if ("showDirectoryPicker" in window) {
        try {
          const directoryHandle = await (window as any).showDirectoryPicker({
            mode: "readwrite",
          });

          // Since we can't get the full path, we'll ask user to provide it
          const directoryName = directoryHandle.name || "selected folder";

          // Show a prompt for the user to enter the full path
          setTimeout(() => {
            const fullPath = prompt(
              `You selected the folder "${directoryName}".\n\n` +
                "Please enter the complete path to this folder:\n\n" +
                "Examples:\n" +
                "• Windows: C:\\Users\\YourName\\Documents\\MyFolder\n" +
                "• Mac: /Users/YourName/Documents/MyFolder\n" +
                "• Linux: /home/username/Documents/MyFolder",
              // Pre-fill with a common pattern
              navigator.platform.toLowerCase().includes("win")
                ? `C:\\Users\\${process.env.USERNAME || "YourName"}\\Documents\\${directoryName}`
                : `/Users/${process.env.USER || "username"}/Documents/${directoryName}`
            );

            if (fullPath && fullPath.trim()) {
              setTargetDirectory(fullPath.trim());
              toast.success("Target directory set successfully!");
            }
          }, 500);

          return;
        } catch (error: any) {
          if (error.name !== "AbortError") {
            console.error("Directory picker error:", error);
            toast.error("Directory picker failed. Please enter path manually.");
          } else {
            // User cancelled
            return;
          }
        }
      }

      // Fallback: Direct prompt for manual entry
      const userPath = prompt(
        "Enter the full path to the target directory:\n\n" +
          "Examples:\n" +
          "• Windows: C:\\Users\\YourName\\Documents\\TargetFolder\n" +
          "• Mac: /Users/username/Documents/TargetFolder\n" +
          "• Linux: /home/username/Documents/TargetFolder"
      );

      if (userPath && userPath.trim()) {
        setTargetDirectory(userPath.trim());
        toast.success("Target directory set!");
      }
    } catch (error: any) {
      console.error("Browse target directory error:", error);
      toast.error(
        "Unable to open directory browser. Please enter the path manually."
      );

      // Focus on the input field
      const inputElement = document.querySelector(
        'input[placeholder="Select target directory"]'
      ) as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
        inputElement.select();
      }
    }
  };

  const loadFilesFromDirectory = async (directoryHandle: any) => {
    const fileItems: FileItem[] = [];

    try {
      for await (const [name, handle] of directoryHandle.entries()) {
        if (handle.kind === "file") {
          const file = await handle.getFile();
          fileItems.push({
            name: name,
            path: `/${name}`,
            type: "file",
            size: file.size,
          });
        } else if (handle.kind === "directory") {
          fileItems.push({
            name: name,
            path: `/${name}`,
            type: "folder",
          });

          // Recursively load files from subdirectories
          const subFiles = await loadSubdirectoryFiles(handle, `/${name}`);
          fileItems.push(...subFiles);
        }
      }

      setSourceFiles(fileItems);
    } catch (error) {
      console.error("Error loading files from directory:", error);
      // Fallback to mock files
      setSourceFiles(mockFiles);
    }
  };

  const loadSubdirectoryFiles = async (
    directoryHandle: any,
    basePath: string
  ): Promise<FileItem[]> => {
    const fileItems: FileItem[] = [];

    try {
      for await (const [name, handle] of directoryHandle.entries()) {
        const fullPath = `${basePath}/${name}`;

        if (handle.kind === "file") {
          const file = await handle.getFile();
          fileItems.push({
            name: name,
            path: fullPath,
            type: "file",
            size: file.size,
          });
        } else if (handle.kind === "directory") {
          fileItems.push({
            name: name,
            path: fullPath,
            type: "folder",
          });

          // Recursively load files from subdirectories
          const subFiles = await loadSubdirectoryFiles(handle, fullPath);
          fileItems.push(...subFiles);
        }
      }
    } catch (error) {
      console.error("Error loading subdirectory files:", error);
    }

    return fileItems;
  };

  // Helper functions for tree structure
  const toggleFolderExpansion = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(folderPath)) {
        newExpanded.delete(folderPath);
      } else {
        newExpanded.add(folderPath);
      }
      return newExpanded;
    });
  };

  const getIndentationLevel = (path: string): number => {
    return path.split("/").length - 2; // -2 because path starts with '/' and we want 0-based indentation
  };

  const buildTreeStructure = (files: FileItem[]) => {
    const treeItems: FileItem[] = [];
    const addedPaths = new Set<string>();

    // Sort files to ensure folders come before their contents
    const sortedFiles = [...files].sort((a, b) => {
      if (a.type === "folder" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "folder") return 1;
      return a.path.localeCompare(b.path);
    });

    for (const file of sortedFiles) {
      const pathParts = file.path.split("/").filter((part) => part !== "");
      let currentPath = "";

      // Add parent folders if they don't exist
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentPath += "/" + pathParts[i];
        if (!addedPaths.has(currentPath)) {
          const parentFolder: FileItem = {
            name: pathParts[i],
            path: currentPath,
            type: "folder",
          };
          treeItems.push(parentFolder);
          addedPaths.add(currentPath);
        }
      }

      // Add the current file/folder
      if (!addedPaths.has(file.path)) {
        treeItems.push(file);
        addedPaths.add(file.path);
      }
    }

    return treeItems;
  };

  const shouldShowItem = (item: FileItem): boolean => {
    const pathParts = item.path.split("/").filter((part) => part !== "");
    if (pathParts.length === 1) return true; // Root level items are always shown

    // Check if all parent folders are expanded
    let currentPath = "";
    for (let i = 0; i < pathParts.length - 1; i++) {
      currentPath += "/" + pathParts[i];
      if (!expandedFolders.has(currentPath)) {
        return false;
      }
    }
    return true;
  };

  // Helper functions for Selected Files tree structure
  const toggleSelectedFolderExpansion = (folderPath: string) => {
    setExpandedSelectedFolders((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(folderPath)) {
        newExpanded.delete(folderPath);
      } else {
        newExpanded.add(folderPath);
      }
      return newExpanded;
    });
  };

  const shouldShowSelectedItem = (item: FileItem): boolean => {
    const pathParts = item.path.split("/").filter((part) => part !== "");
    if (pathParts.length === 1) return true; // Root level items are always shown

    // Check if all parent folders are expanded
    let currentPath = "";
    for (let i = 0; i < pathParts.length - 1; i++) {
      currentPath += "/" + pathParts[i];
      if (!expandedSelectedFolders.has(currentPath)) {
        return false;
      }
    }
    return true;
  };

  const handleAddFile = (file: FileItem) => {
    if (!selectedFiles.find((f) => f.path === file.path)) {
      if (file.type === "folder") {
        // When adding a folder, include all its subfolders and files
        const folderAndContents = sourceFiles.filter(
          (f) => f.path === file.path || f.path.startsWith(file.path + "/")
        );

        // Add all files that aren't already selected
        const newFiles = folderAndContents.filter(
          (f) => !selectedFiles.find((selected) => selected.path === f.path)
        );

        setSelectedFiles((prev) => [...prev, ...newFiles]);
      } else {
        // Adding a single file
        setSelectedFiles((prev) => [...prev, file]);
      }
    }
  };

  const handleAddAll = () => {
    setSelectedFiles([...sourceFiles]);
  };

  const handleRemoveFile = (file: FileItem) => {
    if (file.type === "folder") {
      // When removing a folder, remove it and all its contents
      setSelectedFiles((prev) =>
        prev.filter(
          (f) => f.path !== file.path && !f.path.startsWith(file.path + "/")
        )
      );
    } else {
      // Removing a single file
      setSelectedFiles((prev) => prev.filter((f) => f.path !== file.path));
    }
  };

  const handleRemoveAll = () => {
    setSelectedFiles([]);
  };

  const handleCopy = async () => {
    if (!sourceDirectory || !targetDirectory || selectedFiles.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      // Use the actual file copy service
      const response = await fileCopyService.copyFiles({
        sourceDirectory,
        targetDirectory,
        selectedFiles,
      });

      if (response.success && response.data) {
        const { copiedFiles, skippedFiles, errors } = response.data;

        // Show success/error messages
        if (errors.length > 0) {
          console.error("File copy errors:", errors);
          // You could show these errors in a toast or modal
        }

        // Call the parent onCopy handler
        await onCopy({
          sourceDirectory,
          targetDirectory,
          selectedFiles,
        });

        onClose();
      } else {
        console.error("File copy failed:", response.message);
        throw new Error(response.message || "File copy operation failed");
      }
    } catch (error) {
      console.error("Error copying files:", error);
      throw error; // Re-throw to be handled by the calling component
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4 h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center">
              <span className="text-white text-xs">📁</span>
            </div>
            <h2 className="text-lg font-medium">File & Folder Copy Tool</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Directory Selection */}
        <div className="p-4 border-b bg-gray-50">
          <div className="grid grid-cols-2 gap-4">
            {/* Source Directory */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Source Directory
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sourceDirectory}
                  onChange={(e) => setSourceDirectory(e.target.value)}
                  placeholder="Select source directory"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleBrowseSource}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Browse...
                </button>
              </div>
            </div>

            {/* Target Directory */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Target Directory
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetDirectory}
                  onChange={(e) => setTargetDirectory(e.target.value)}
                  placeholder="Select target directory"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleBrowseTarget}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Browse...
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* File Lists */}
        <div className="flex-1 flex min-h-0">
          {/* Source Files */}
          <div className="flex-1 p-4 border-r flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Source Files</h3>
            </div>
            <div className="flex-1 border border-gray-300 rounded overflow-hidden">
              {sourceFiles.length === 0 ? (
                <div className="p-4 text-gray-500 text-center">
                  Select source directory to view files
                </div>
              ) : (
                <div className="h-full overflow-y-auto">
                  <div className="divide-y divide-gray-100">
                    {buildTreeStructure(sourceFiles)
                      .filter(shouldShowItem)
                      .map((file) => {
                        const indentLevel = getIndentationLevel(file.path);
                        const isExpanded = expandedFolders.has(file.path);
                        const hasChildren =
                          file.type === "folder" &&
                          sourceFiles.some((f) =>
                            f.path.startsWith(file.path + "/")
                          );

                        return (
                          <div
                            key={file.path}
                            className="flex items-center py-1 hover:bg-gray-50 cursor-pointer"
                            style={{ paddingLeft: `${8 + indentLevel * 16}px` }}
                          >
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              {file.type === "folder" && hasChildren && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFolderExpansion(file.path);
                                  }}
                                  className="p-0.5 hover:bg-gray-200 rounded"
                                >
                                  {isExpanded ? (
                                    <span className="text-sm">▼</span>
                                  ) : (
                                    <span className="text-sm">▶</span>
                                  )}
                                </button>
                              )}
                              {file.type === "folder" && !hasChildren && (
                                <span className="w-4"></span>
                              )}
                              {file.type === "file" && (
                                <span className="w-4"></span>
                              )}

                              <div
                                className="flex items-center gap-1.5 min-w-0 flex-1"
                                onClick={() => handleAddFile(file)}
                              >
                                {file.type === "folder" ? (
                                  isExpanded ? (
                                    <FolderOpen
                                      size={16}
                                      className="text-blue-500 flex-shrink-0"
                                    />
                                  ) : (
                                    <Folder
                                      size={16}
                                      className="text-blue-500 flex-shrink-0"
                                    />
                                  )
                                ) : (
                                  <File
                                    size={16}
                                    className="text-gray-500 flex-shrink-0"
                                  />
                                )}
                                <span
                                  className="text-sm truncate max-w-xs"
                                  title={file.name}
                                >
                                  {file.name}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="w-32 flex flex-col justify-center items-center gap-2 p-4">
            <button
              onClick={() =>
                selectedFiles.length > 0 && handleAddFile(sourceFiles[0])
              }
              disabled={sourceFiles.length === 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add →
            </button>
            <button
              onClick={handleAddAll}
              disabled={sourceFiles.length === 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add All →
            </button>
            <button
              onClick={() =>
                selectedFiles.length > 0 && handleRemoveFile(selectedFiles[0])
              }
              disabled={selectedFiles.length === 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Remove
            </button>
            <button
              onClick={handleRemoveAll}
              disabled={selectedFiles.length === 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Remove All
            </button>
          </div>

          {/* Selected Files */}
          <div className="flex-1 p-4 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Selected Files</h3>
            </div>
            <div className="flex-1 border border-gray-300 rounded overflow-hidden">
              {selectedFiles.length === 0 ? (
                <div className="p-4 text-gray-500 text-center">
                  No files selected
                </div>
              ) : (
                <div className="h-full overflow-y-auto">
                  <div className="divide-y divide-gray-100">
                    {buildTreeStructure(selectedFiles)
                      .filter(shouldShowSelectedItem)
                      .map((file) => {
                        const indentLevel = getIndentationLevel(file.path);
                        const isExpanded = expandedSelectedFolders.has(
                          file.path
                        );
                        const hasChildren =
                          file.type === "folder" &&
                          selectedFiles.some((f) =>
                            f.path.startsWith(file.path + "/")
                          );

                        return (
                          <div
                            key={file.path}
                            className="flex items-center justify-between py-1 hover:bg-gray-50 pr-2"
                            style={{ paddingLeft: `${8 + indentLevel * 16}px` }}
                          >
                            <div className="flex items-center gap-1 min-w-0 flex-1 mr-2">
                              {file.type === "folder" && hasChildren && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectedFolderExpansion(file.path);
                                  }}
                                  className="p-0.5 hover:bg-gray-200 rounded"
                                >
                                  {isExpanded ? (
                                    <span className="text-sm">▼</span>
                                  ) : (
                                    <span className="text-sm">▶</span>
                                  )}
                                </button>
                              )}
                              {file.type === "folder" && !hasChildren && (
                                <span className="w-4"></span>
                              )}
                              {file.type === "file" && (
                                <span className="w-4"></span>
                              )}

                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                {file.type === "folder" ? (
                                  isExpanded ? (
                                    <FolderOpen
                                      size={16}
                                      className="text-blue-500 flex-shrink-0"
                                    />
                                  ) : (
                                    <Folder
                                      size={16}
                                      className="text-blue-500 flex-shrink-0"
                                    />
                                  )
                                ) : (
                                  <File
                                    size={16}
                                    className="text-gray-500 flex-shrink-0"
                                  />
                                )}
                                <span
                                  className="text-sm truncate"
                                  title={file.name}
                                >
                                  {file.name}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveFile(file)}
                              className="text-red-500 hover:text-red-700 text-sm flex-shrink-0 px-2 py-1"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Copy Preview */}
        <div className="border-t p-4 bg-gray-50">
          <div className="mb-3">
            <h4 className="font-medium mb-2">Copy Preview</h4>
            <textarea
              value={`Select source and target directories to begin.\n${
                selectedFiles.length > 0
                  ? `Selected ${selectedFiles.length} items for copying:\n${selectedFiles.map((f) => `- ${f.name}`).join("\n")}`
                  : "No files selected."
              }`}
              readOnly
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm resize-none"
            />
          </div>

          {/* Warning about deleting existing files */}
          {selectedFiles.length > 0 && targetDirectory && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-3">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-amber-600 font-medium">⚠️</span>
                </div>
                <div className="ml-2">
                  <p className="text-sm text-amber-800">
                    <strong>Important:</strong> If any files or folders with the
                    same names already exist in the target directory, they will
                    be <strong>permanently deleted</strong> before copying the
                    new ones.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            disabled={
              isLoading ||
              !sourceDirectory ||
              !targetDirectory ||
              selectedFiles.length === 0
            }
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? "Copying..." : "Copy Files"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileCopyTool;
