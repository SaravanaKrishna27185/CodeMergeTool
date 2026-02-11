interface FileCopyRequest {
  sourceDirectory: string;
  targetDirectory: string;
  selectedFiles: Array<{
    name: string;
    path: string;
    type: "file" | "folder";
    size?: number;
  }>;
}

interface FileCopyResponse {
  success: boolean;
  copiedFiles: number;
  skippedFiles: number;
  errors: string[];
}

interface BrowseFilesResponse {
  files: Array<{
    name: string;
    path: string;
    type: "file" | "folder";
    size?: number;
  }>;
}

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

class FileCopyService {
  private apiUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:1021/api"}/file-copy`;

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = this.getAuthToken();

      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`File Copy API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  private getAuthToken(): string | null {
    // Try to get token from localStorage first (for compatibility)
    let token = localStorage.getItem("authToken");

    // If not found, try to get from cookies
    if (!token) {
      const cookies = document.cookie.split(";");
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split("=");
        if (name === "authToken") {
          token = value;
          break;
        }
      }
    }

    return token;
  }

  /**
   * Copy files from source to target directory
   */
  async copyFiles(
    data: FileCopyRequest
  ): Promise<ApiResponse<FileCopyResponse>> {
    return this.makeRequest<FileCopyResponse>("/copy", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Browse files in a directory
   */
  async browseFiles(
    directory: string
  ): Promise<ApiResponse<BrowseFilesResponse>> {
    const params = new URLSearchParams({ directory });
    return this.makeRequest<BrowseFilesResponse>(`/browse?${params}`, {
      method: "GET",
    });
  }
}

const fileCopyService = new FileCopyService();
export default fileCopyService;
