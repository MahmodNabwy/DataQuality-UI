// Backend API Integration Service
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
const AUTH_STORAGE_KEY = 'qa_system_auth_session'

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean,
  status?: string,
  data?: T
  message?: string
  error?: string
}

export interface BackendProject {
  id: string
  fileName: string
  fileSize: number
  uploadedBy: string
  uploadDate: string
  lastModified: string
  status: string // active, archived, deleted
  originalData: OriginalData[]
  modifiedData: OriginalData[]
  qaResults: BackendQAResults | null
  issueStatuses: IssueStatus[]
  metadata: Dictionary<string, any>
}

export interface Dictionary<TKey extends string, TValue> {
  [key: string]: TValue;
}

export interface IssueStatus {
  issueId: string
  status: string // active, resolved, dismissed
  timestamp: string
  updatedBy: string
  metadata: Dictionary<string, any>
}

export interface ProjectDto {
  id: string
  fileName: string
  fileSize: number
  uploadedBy: string
  uploadDate: string
  lastModified: string
  status: string
  qaResults: BackendQAResults | null
  originalData: OriginalData[],
  modifiedData: OriginalData[],
  issueCount: number
  resolvedIssueCount: number
  metadata: Dictionary<string, any>
}

export interface CreateProjectRequest {
  fileName: string
  fileSize: number
  data: OriginalData[]
//   metadata: Dictionary<string, any>
}

export interface UpdateProjectRequest {
  modifiedData?: OriginalData[]
  status?: string
  metadata?: Dictionary<string, any>
}

export interface BackendQAResults {
  summary: QASummary
  issues: QAIssue[]
  qualityScore: QualityScore | null
  processedAt: string
}

export interface QASummary {
  totalIndicators: number
  passedChecks: number
  failedChecks: number
  checksByType: Dictionary<string, CheckTypeResult>
}

export interface CheckTypeResult {
  passed: number
  failed: number
}

export interface QAIssue {
  id: string
  checkType: string
  indicatorName: string
  filterName?: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  details?: Dictionary<string, any>
  detectedAt: string
}

export interface QualityScore {
  overall: number
  rating: string // excellent, good, fair, poor
  breakdown: QualityBreakdown
}

export interface QualityBreakdown {
  completeness: number
  accuracy: number
  consistency: number
  validity: number
}
 
export interface BackendUser {
  id: string
  name: string
  email: string
  role: string
}

export interface BackendAuthResponse {
  success: boolean
  token?: string
  user?: BackendUser
  message?: string
}
export interface OriginalData {
    IndicatorName  :string
    IndicatorEngName  :string
    FilterName  :string
    FilterEngName  :string
    MeasureUnit  :string
    MeasureUnitEng :string 
    Value  :number
    Month :string 
    Quarter  :string
    Year  :number
   BulletinName:string
}

export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

export interface AuthSession {
  token: string;
  isAuthenticated: boolean;
  user: AuthUser;
}



// Authentication Service
export class AuthService {
  private static token: string | null = null

  static setToken(token: string) {
    this.token = token
    localStorage.setItem('backend_auth_token', token)
  }
 
static loadAuthSession(): AuthSession | null {
  try {
    const root = localStorage.getItem("persist:root");
    if (!root) return null;

    // First parse → root object
    const parsedRoot = JSON.parse(root);

    // Ensure "auth" slice exists
    if (!parsedRoot.auth) return null;

    // Second parse → actual auth data  
    const authData = JSON.parse(parsedRoot.auth);

    return authData as AuthSession;

  } catch (error) {
    console.error("[Auth] Failed to load auth session:", error);
    return null;
  }
}
 
static getTokenFromSession(): string | null {
  const token = localStorage.getItem('backend_auth_token');
    return token;
} 

static clearToken() {
    this.token = null
    localStorage.removeItem('backend_auth_token')
}

static async login(email: string, password: string): Promise<BackendAuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()
      
      if (response.status == 200 && data.token) {
        this.setToken(data.token)
      }

      return data
    } catch (error) {
      console.error('Backend login error:', error)
      return {
        success: false,
        message: 'خطأ في الاتصال بالخادم'
      }
    }
}

static async getCurrentUser(): Promise<BackendUser | null> {
    try {
      const token = this.getTokenFromSession()
      if (!token) return null

      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data.data
      }
      return null
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
}
}

// Project Service
export class ProjectService {
  static async createProject(
    fileName: string, 
    fileSize: number, 
    data: OriginalData[], 
    // metadata: Dictionary<string, any> = {}
  ): Promise<ApiResponse<BackendProject>> {
    try {
      const token = AuthService.getTokenFromSession()
      if (!token) {
        return { success: false, error: 'غير مسجل دخول' }
      }

      const request: CreateProjectRequest = {
        fileName,
        fileSize,
        data,
         
      }

      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      const responseData = await response.json()
      return {
        success: response.ok,
        data: responseData.data || responseData,
        message: responseData.message,
        error: response.ok ? undefined : responseData.message || 'فشل في إنشاء المشروع'
      }
    } catch (error) {
      console.error('Error creating project:', error)
      return { success: false, error: 'خطأ في إنشاء المشروع' }
    }
  }

  static async getProjects(myProjectsOnly: boolean = false): Promise<ApiResponse<ProjectDto[]>> {
    try {
      const token = AuthService.getTokenFromSession()
      if (!token) {
        return { success: false, error: 'غير مسجل دخول' }
      }

      const queryParam = myProjectsOnly ? '?myProjectsOnly=true' : ''
      const response = await fetch(`${API_BASE_URL}/projects${queryParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const responseData = await response.json()
      return {
        success: response.ok,
        data: responseData.data || [],
        message: responseData.message,
        error: response.ok ? undefined : responseData.message || 'فشل في تحميل المشاريع'
      }
    } catch (error) {
      console.error('Error getting projects:', error)
      return { success: false, error: 'خطأ في تحميل المشاريع' }
    }
  }

  static async getProject(projectId: string): Promise<ApiResponse<BackendProject>> {
    try {
      const token = AuthService.getTokenFromSession()
      if (!token) {
        return { success: false, error: 'غير مسجل دخول' }
      }

      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error getting project:', error)
      return { success: false, error: 'خطأ في تحميل المشروع' }
    }
  }

  static async updateProject(
    projectId: string, 
    updates: Partial<BackendProject>
  ): Promise<ApiResponse<BackendProject>> {
    try {
      const token = AuthService.getTokenFromSession()
      if (!token) {
        return { success: false, error: 'غير مسجل دخول' }
      }

      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error updating project:', error)
      return { success: false, error: 'خطأ في تحديث المشروع' }
    }
  }

  static async deleteProject(projectId: string): Promise<ApiResponse> {
    try {
      const token = AuthService.getTokenFromSession()
      if (!token) {
        return { success: false, error: 'غير مسجل دخول' }
      }

      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error deleting project:', error)
      return { success: false, error: 'خطأ في حذف المشروع' }
    }
  }
}

// File Analysis Service
export class FileAnalysisService {
  static async uploadAndAnalyze(file: File): Promise<ApiResponse<any>> {
    try {
      const token = AuthService.getTokenFromSession()
      if (!token) {
        return { success: false, error: 'غير مسجل دخول' }
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE_URL}/file/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      const responseData = await response.json()
      return {
        success: response.ok && responseData.success !== false,
        data: responseData,
        message: responseData.message,
        error: response.ok && responseData.success !== false ? undefined : responseData.errorMessage || responseData.message || 'فشل في رفع الملف'
      }
    } catch (error) {
      console.error('Error analyzing file:', error)
      return { success: false, error: 'خطأ في تحليل الملف' }
    }
  }

  static async analyzeData(projectData: OriginalData[]): Promise<ApiResponse<BackendQAResults>> {
    try {
      const token = AuthService.getTokenFromSession()
      if (!token) {
        return { success: false, error: 'غير مسجل دخول' }
      }

      const response = await fetch(`${API_BASE_URL}/qa/analyze-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: projectData }),
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error analyzing data:', error)
      return { success: false, error: 'خطأ في تحليل البيانات' }
    }
  }
}

// Migration Service for moving localStorage data to backend
export class MigrationService {
  static async migrateLocalProjects(): Promise<void> {
    try {
      console.log('[Migration] Starting local projects migration...')
      
      // Get current user session
      const { loadAuthSession } = await import('./auth')
      const authSession = loadAuthSession()
      if (!authSession) {
        console.log('[Migration] No auth session, skipping migration')
        return
      }

      // Try to authenticate with backend
      const backendAuth = await AuthService.login(authSession.email, 'temp_password')
      if (!backendAuth.success) {
        console.log('[Migration] Backend auth failed, skipping migration')
        return
      }

      // Load local projects
      const { loadProjectsList } = await import('./storage')
      const projectsList = loadProjectsList()
      if (!projectsList || projectsList.projects.length === 0) {
        console.log('[Migration] No local projects to migrate')
        return
      }

      console.log(`[Migration] Found ${projectsList.projects.length} local projects`)

      for (const localProject of projectsList.projects) {
        try {
          console.log(`[Migration] Migrating project: ${localProject.fileName}`)
          
          const result = await ProjectService.createProject(
            localProject.fileName,
            localProject.fileSize,
            localProject.projectData?.originalData || [],
            
          )

          if (result.success) {
            console.log(`[Migration] Successfully migrated: ${localProject.fileName}`)
          } else {
            console.error(`[Migration] Failed to migrate: ${localProject.fileName}`, result.error)
          }
        } catch (error) {
          console.error(`[Migration] Error migrating project ${localProject.fileName}:`, error)
        }
      }

      console.log('[Migration] Migration completed')
    } catch (error) {
      console.error('[Migration] Migration failed:', error)
    }
  }

  static async exportToProduction(projectId: string, productionApiUrl: string): Promise<ApiResponse> {
    try {
      const token = AuthService.getTokenFromSession()
      if (!token) {
        return { success: false, error: 'غير مسجل دخول' }
      }

      const response = await fetch(`${API_BASE_URL}/migration/export`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          productionApiUrl
        }),
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error exporting to production:', error)
      return { success: false, error: 'خطأ في التصدير للإنتاج' }
    }
  }
}

// Backend Integration Hook
export function useBackendIntegration() {
  const isBackendAvailable = async (): Promise<boolean> => {
    try {
      return true;
    } catch {
      return false
    }
  }

  const syncWithBackend = async (localProject: any): Promise<string | null> => {
    try {
      const result = await ProjectService.createProject(
        localProject.fileName,
        localProject.fileSize,
        localProject.projectData.originalData,
        
      )

      return result.success ? result.data?.id || null : null
    } catch (error) {
      console.error('Sync with backend failed:', error)
      return null
    }
  }

  return {
    isBackendAvailable,
    syncWithBackend,
    AuthService,
    ProjectService,
    FileAnalysisService,
    MigrationService
  }
}