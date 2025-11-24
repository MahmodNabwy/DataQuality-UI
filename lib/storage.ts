export interface ReviewedIndicator {
  name: string
  timestamp: number
  notes?: string
}

export interface WorkSession {
  fileName: string
  reviewedIndicators: ReviewedIndicator[]
  lastUpdated: number
}

const STORAGE_KEY = "qa_system_work_session"

function getUserKey(baseKey: string, userEmail?: string): string {
  if (!userEmail) {
    const session = typeof window !== "undefined" ? loadAuthSession() : null
    userEmail = session?.email
  }
  if (!userEmail) return baseKey
  return `${baseKey}_${userEmail}`
}

function getProjectKey(baseKey: string, projectId?: string): string {
  if (!projectId) return getUserKey(baseKey)
  return `${getUserKey(baseKey)}_project_${projectId}`
}

export function saveWorkSession(session: WorkSession, projectId?: string): void {
  try {
    const key = projectId ? getProjectKey(STORAGE_KEY, projectId) : getUserKey(STORAGE_KEY)
    localStorage.setItem(key, JSON.stringify(session))
  } catch (error) {
    console.error("[v0] Failed to save work session:", error)
  }
}

export function loadWorkSession(projectId?: string): WorkSession | null {
  try {
    const key = projectId ? getProjectKey(STORAGE_KEY, projectId) : getUserKey(STORAGE_KEY)
    const data = localStorage.getItem(key)
    if (!data) return null
    return JSON.parse(data) as WorkSession
  } catch (error) {
    console.error("[v0] Failed to load work session:", error)
    return null
  }
}

export function clearWorkSession(projectId?: string): void {
  try {
    const key = projectId ? getProjectKey(STORAGE_KEY, projectId) : getUserKey(STORAGE_KEY)
    localStorage.removeItem(key)
  } catch (error) {
    console.error("[v0] Failed to clear work session:", error)
  }
}

export interface DataEdit {
  indicatorName: string
  filterName: string
  year: number
  month?: number
  quarter?: number
  oldValue: number
  newValue: number
  timestamp: number
  tableNumber?: string
  comment?: string
}

export interface IndicatorEdit {
  oldName: string
  newName: string
  timestamp: number
}

export interface EditSession {
  fileName: string
  dataEdits: DataEdit[]
  indicatorEdits: IndicatorEdit[]
  lastUpdated: number
}

const EDIT_STORAGE_KEY = "qa_system_edit_session"

export function mergeDataEdits(existingEdits: DataEdit[], newEdits: DataEdit[]): DataEdit[] {
  // Create a map with unique keys for each edit including month/quarter
  const editMap = new Map<string, DataEdit>()

  // First, add all existing edits to the map
  existingEdits.forEach((edit) => {
    const period = edit.month ? `M${edit.month}` : edit.quarter ? `Q${edit.quarter}` : "Y"
    const key = `${edit.indicatorName}|${edit.filterName}|${edit.year}|${period}`
    editMap.set(key, edit)
  })

  // Then, merge new edits (will overwrite if same key exists)
  newEdits.forEach((edit) => {
    const period = edit.month ? `M${edit.month}` : edit.quarter ? `Q${edit.quarter}` : "Y"
    const key = `${edit.indicatorName}|${edit.filterName}|${edit.year}|${period}`
    editMap.set(key, {
      ...edit,
      timestamp: Date.now(), // Update timestamp for latest edit
    })
  })

  // Convert back to array
  return Array.from(editMap.values())
}

export function saveEditSession(session: EditSession, projectId?: string): void {
  try {
    const key = projectId ? getProjectKey(EDIT_STORAGE_KEY, projectId) : getUserKey(EDIT_STORAGE_KEY)
    localStorage.setItem(key, JSON.stringify(session))
  } catch (error) {
    console.error("[v0] Failed to save edit session:", error)
  }
}

export function loadEditSession(projectId?: string): EditSession | null {
  try {
    const key = projectId ? getProjectKey(EDIT_STORAGE_KEY, projectId) : getUserKey(EDIT_STORAGE_KEY)
    const data = localStorage.getItem(key)
    if (!data) return null
    return JSON.parse(data) as EditSession
  } catch (error) {
    console.error("[v0] Failed to load edit session:", error)
    return null
  }
}

export function clearEditSession(projectId?: string): void {
  try {
    const key = projectId ? getProjectKey(EDIT_STORAGE_KEY, projectId) : getUserKey(EDIT_STORAGE_KEY)
    localStorage.removeItem(key)
  } catch (error) {
    console.error("[v0] Failed to clear edit session:", error)
  }
}

export interface UserProfile {
  name: string
  createdAt: number
}

const USER_PROFILE_KEY = "qa_system_user_profile"

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(getUserKey(USER_PROFILE_KEY), JSON.stringify(profile))
  } catch (error) {
    console.error("[v0] Failed to save user profile:", error)
  }
}

export function loadUserProfile(): UserProfile | null {
  try {
    const data = localStorage.getItem(getUserKey(USER_PROFILE_KEY))
    if (!data) return null
    return JSON.parse(data) as UserProfile
  } catch (error) {
    console.error("[v0] Failed to load user profile:", error)
    return null
  }
}

export interface AuditLogEntry {
  id: string
  userName: string
  action: "data_edit" | "indicator_rename" | "value_add" | "issue_resolved" | "issue_dismissed"
  timestamp: number
  details: {
    indicatorName: string
    filterName?: string
    year?: number
    month?: number
    quarter?: number
    oldValue?: number | string
    newValue?: number | string
    description?: string
    tableNumber?: string
    comment?: string
    issueType?: string
    issueMessage?: string
  }
}

export interface AuditTrail {
  fileName: string
  logs: AuditLogEntry[]
  lastUpdated: number
}

const AUDIT_TRAIL_KEY = "qa_system_audit_trail"

export function addAuditLog(entry: Omit<AuditLogEntry, "id">, projectId?: string): void {
  try {
    const key = projectId ? getProjectKey(AUDIT_TRAIL_KEY, projectId) : getUserKey(AUDIT_TRAIL_KEY)
    const data = localStorage.getItem(key)
    const trail = data ? (JSON.parse(data) as AuditTrail) : { fileName: "", logs: [], lastUpdated: Date.now() }

    const newEntry: AuditLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }

    trail.logs.push(newEntry)
    trail.lastUpdated = Date.now()

    localStorage.setItem(key, JSON.stringify(trail))
  } catch (error) {
    console.error("[v0] Failed to add audit log:", error)
  }
}

export function loadAuditTrail(projectId?: string): AuditTrail | null {
  try {
    const key = projectId ? getProjectKey(AUDIT_TRAIL_KEY, projectId) : getUserKey(AUDIT_TRAIL_KEY)
    const data = localStorage.getItem(key)
    if (!data) return null
    return JSON.parse(data) as AuditTrail
  } catch (error) {
    console.error("[v0] Failed to load audit trail:", error)
    return null
  }
}

export function clearAuditTrail(projectId?: string): void {
  try {
    const key = projectId ? getProjectKey(AUDIT_TRAIL_KEY, projectId) : getUserKey(AUDIT_TRAIL_KEY)
    localStorage.removeItem(key)
  } catch (error) {
    console.error("[v0] Failed to clear audit trail:", error)
  }
}

export function setAuditTrailFileName(fileName: string, projectId?: string): void {
  try {
    const key = projectId ? getProjectKey(AUDIT_TRAIL_KEY, projectId) : getUserKey(AUDIT_TRAIL_KEY)
    const data = localStorage.getItem(key)
    const trail = data ? (JSON.parse(data) as AuditTrail) : { fileName: "", logs: [], lastUpdated: Date.now() }
    trail.fileName = fileName
    trail.lastUpdated = Date.now()
    localStorage.setItem(key, JSON.stringify(trail))
  } catch (error) {
    console.error("[v0] Failed to set audit trail file name:", error)
  }
}

export interface IssueStatus {
  issueId: string // Unique identifier for the issue
  status: "active" | "resolved" | "dismissed"
  timestamp: number
  userName: string
  metadata?: {
    tableNumber?: string
    comment?: string
    autoResolved?: boolean
  }
}

export interface Project {
  id: string
  fileName: string
  fileSize: number
  uploadedBy: string
  uploadDate: number
  lastModified: number
  status:string
  issueCount:number
  resolvedIssueCount:number,
  OriginalData : any[],
  ModifiedData:any[]
  qaResults: {
    processedAt: number,
    summary:any,
    issues: any[]
    qualityScore: any
    
  }
  
}

const PROJECTS_KEY = "qa_system_projects"

interface ProjectsList {
  projects: Project[]
  lastUpdated: number
}

export function saveProject(project: Omit<Project, "id" | "uploadDate" | "lastModified">): string {
  try {
    // Validate project data before saving
    if (!project.fileName) {
      console.error("[v0] Invalid project data")
      return ""
    }

    const projectsList = loadProjectsList() || { projects: [], lastUpdated: Date.now() }

    const MAX_PROJECTS = 50
    if (projectsList.projects.length >= MAX_PROJECTS) {
      console.warn("[v0] Maximum projects limit reached, removing oldest")
      projectsList.projects.sort((a, b) => a.lastModified - b.lastModified)
      projectsList.projects.shift() // Remove oldest project
    }

    const projectId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = Date.now()

    const newProject: Project = {
      ...project,
      id: projectId,
      uploadDate: now,
      lastModified: now,
    }

    projectsList.projects.push(newProject)
    projectsList.lastUpdated = now

    try {
      localStorage.setItem(getUserKey(PROJECTS_KEY), JSON.stringify(projectsList))
    } catch (quotaError) {
      console.error("[v0] localStorage quota exceeded, trying to free space")
      // Remove oldest project and retry
      projectsList.projects.shift()
      localStorage.setItem(getUserKey(PROJECTS_KEY), JSON.stringify(projectsList))
    }

    return projectId
  } catch (error) {
    console.error("[v0] Failed to save project:", error)
    return ""
  }
}

export function updateProject(projectId: string, updates: Partial<Omit<Project, "id" | "uploadDate">>): void {
  try {
    const projectsList = loadProjectsList()
    if (!projectsList) {
      console.error("[v0] No projects list found")
      return
    }

    const projectIndex = projectsList.projects.findIndex((p) => p.id === projectId)
    if (projectIndex === -1) {
      console.error("[v0] Project not found:", projectId)
      return
    }

    projectsList.projects[projectIndex] = {
      ...projectsList.projects[projectIndex],
      ...updates,
      lastModified: Date.now(),
    }
    projectsList.lastUpdated = Date.now()

    localStorage.setItem(getUserKey(PROJECTS_KEY), JSON.stringify(projectsList))

    console.log("[v0] Project updated:", projectId)
  } catch (error) {
    console.error("[v0] Failed to update project:", error)
  }
}

export function loadProjectsList(): ProjectsList | null {
  try {
    const data = localStorage.getItem(getUserKey(PROJECTS_KEY))
    if (!data) return null
    return JSON.parse(data) as ProjectsList
  } catch (error) {
    console.error("[v0] Failed to load projects list:", error)
    return null
  }
}

export function loadProject(projectId: string): Project | null {
  try {
    const projectsList = loadProjectsList()
    if (!projectsList) return null

    const project = projectsList.projects.find((p) => p.id === projectId)
    return project || null
  } catch (error) {
    console.error("[v0] Failed to load project:", error)
    return null
  }
}

export function deleteProject(projectId: string): void {
  try {
    const projectsList = loadProjectsList()
    if (!projectsList) return

    projectsList.projects = projectsList.projects.filter((p) => p.id !== projectId)
    projectsList.lastUpdated = Date.now()

    localStorage.setItem(getUserKey(PROJECTS_KEY), JSON.stringify(projectsList))

    const activeProjectId = getActiveProjectId()
    if (activeProjectId === projectId) {
      clearActiveProject()
    }

    console.log("[v0] Project deleted completely:", projectId)
  } catch (error) {
    console.error("[v0] Failed to delete project:", error)
  }
}

const ACTIVE_PROJECT_KEY = "qa_system_active_project"

export function setActiveProject(projectId: string): void {
  try {
    localStorage.setItem(getUserKey(ACTIVE_PROJECT_KEY), projectId)
  } catch (error) {
    console.error("[v0] Failed to set active project:", error)
  }
}

export function getActiveProjectId(): string | null {
  try {
    return localStorage.getItem(getUserKey(ACTIVE_PROJECT_KEY))
  } catch (error) {
    console.error("[v0] Failed to get active project:", error)
    return null
  }
}

export function clearActiveProject(): void {
  try {
    localStorage.removeItem(getUserKey(ACTIVE_PROJECT_KEY))
  } catch (error) {
    console.error("[v0] Failed to clear active project:", error)
  }
}

import { loadAuthSession } from "./auth"
