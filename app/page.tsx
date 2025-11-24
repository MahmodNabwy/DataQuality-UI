"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Download,
  Save,
  UserIcon,
  LogOut,
  FolderOpen,
  Cloud,
  Database,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import QASummary from "@/components/qa-summary";
import IndicatorsList from "@/components/indicators-list";
import IssuesReport from "@/components/issues-report";
import { AuditTrailViewer } from "@/components/audit-trail-viewer";
import { useQAProcessor } from "@/hooks/use-qa-processor";
import { useBackendQAProcessor } from "@/hooks/use-backend-qa-processor";
import { LoginForm } from "@/components/login-form";
import BackendLoginForm from "@/components/backend-login-form";
import BackendProjectsManager from "@/components/backend-projects-manager";
import {
  saveUserProfile,
  saveProject,
  updateProject,
  setActiveProject,
  clearActiveProject,
  type UserProfile,
  type Project,
  type IssueStatus,
} from "@/lib/storage";
import {
  AuthService,
  ProjectService,
  type BackendProject,
  useBackendIntegration,
} from "@/lib/backend-service";
import { recalculateQualityWithFilteredIssues } from "@/lib/qa-engine";
import {
  loadAuthSession,
  clearAuthSession,
  type AuthSession,
} from "@/lib/auth";
import ProjectsManager from "@/components/projects-manager";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function Page() {
  const [activeTab, setActiveTab] = useState("projects");

  // Backend Integration States
  const [isBackendMode, setIsBackendMode] = useState(false);
  const [showBackendLogin, setShowBackendLogin] = useState(false);
  const [isBackendAuthenticated, setIsBackendAuthenticated] = useState(false);

  // Use both processors - local and backend
  const localProcessor = useQAProcessor();
  const backendProcessor = useBackendQAProcessor();

  // Current active processor based on mode
  const currentProcessor = isBackendMode ? backendProcessor : localProcessor;
  const {
    data,
    qaResults,
    isProcessing,
    processFile,
    exportResults,
    processingDuration,
    setProcessedData,
  } = currentProcessor;

  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [pendingProjectData, setPendingProjectData] = useState<{
    fileName: string;
    data: any[];
    qaResults: any;
  } | null>(null);
  const [lastProcessedFileName, setLastProcessedFileName] = useState<
    string | null
  >(null);
  const lastCreatedProjectRef = useRef<string | null>(null);
  const isCreatingProjectRef = useRef(false);

  const { isBackendAvailable } = useBackendIntegration();
  const { toast } = useToast();

  // Check backend status and authentication
  useEffect(() => {
    const session = loadAuthSession();
    if (session) {
      setAuthSession(session);
      setIsAuthenticated(true);

      // Check if backend is available and try to authenticate
    }
  }, []);

  const checkBackendAuth = async (session: AuthSession) => {
    try {
      const available = await isBackendAvailable();
      if (available) {
        // Try to get current user to verify token
        const user = await AuthService.getCurrentUser();
        if (user) {
          setIsBackendAuthenticated(true);
          setIsBackendMode(true);
          toast({
            title: "متصل بالخادم",
            description: `تم تسجيل الدخول كـ ${user.name}`,
            variant: "default",
          });
        } else {
          // Token invalid or expired, show backend login
          setShowBackendLogin(true);
        }
      }
    } catch (error) {
      console.error("Backend auth check failed:", error);
    }
  };

  const handleLogin = (
    name: string,
    role: "admin" | "user",
    isBackendAuth?: boolean
  ) => {
    const profile: UserProfile = {
      name,
      createdAt: Date.now(),
    };
    saveUserProfile(profile);

    const session = loadAuthSession();
    if (session) {
      setAuthSession(session);
      setIsAuthenticated(true);

      // Set backend mode if authenticated via backend
      if (isBackendAuth) {
        setIsBackendAuthenticated(true);
        setIsBackendMode(true);
      }

      console.log(
        `[Auth] User logged in: ${name} (${role}) - Backend: ${
          isBackendAuth ? "Yes" : "No"
        }`
      );
    }
  };

  const handleLogout = () => {
    clearActiveProject();
    clearAuthSession();
    setAuthSession(null);
    setIsAuthenticated(false);
    setCurrentProject(null);
    setHasUnsavedChanges(false);
    setActiveTab("projects");
  };

  const handleOpenProject = (project: Project) => {
    console.log("[v0] Opening project manually:", project.fileName);

    setCurrentProject(project);
    setActiveProject(project.id);

    // if (setProcessedData && project.id) {
    //   setProcessedData(

    //     project.data.qaResults
    //   );
    // }

    setActiveTab("summary");
    setHasUnsavedChanges(false);

    console.log("[v0] Project opened successfully");
  };

  const handleFileUpload = async (file: File) => {
    console.log("[v0] Processing new file:", file.name);

    setLastProcessedFileName(file.name);
    setPendingProjectData(null);
    clearActiveProject();
    setCurrentProject(null);
    lastCreatedProjectRef.current = null;
    isCreatingProjectRef.current = false;

    console.log(
      "[v0] Cleared all previous data, starting fresh processing for:",
      file.name
    );

    await processFile(file);

    console.log("[v0] File processed, will create project when data is ready");
  };

  useEffect(() => {
    if (!data || !qaResults || data.length === 0 || !lastProcessedFileName) {
      return;
    }

    const fileName = lastProcessedFileName;

    if (lastCreatedProjectRef.current === fileName) {
      console.log("[v0] Project already created for:", fileName);
      return;
    }
    setPendingProjectData({
      fileName,
      data: JSON.parse(JSON.stringify(data)),
      qaResults: JSON.parse(JSON.stringify(qaResults)),
    });
  }, [data, qaResults, lastProcessedFileName]);

  useEffect(() => {
    if (!pendingProjectData || currentProject || isCreatingProjectRef.current) {
      return;
    }

    const {
      fileName,
      data: projectData,
      qaResults: projectQAResults,
    } = pendingProjectData;

    if (lastCreatedProjectRef.current === fileName) {
      console.log("[v0] Project already created for:", fileName);
      return;
    }

    isCreatingProjectRef.current = true;

    const projectId = saveProject({
      fileName,
      fileSize: 0,
      uploadedBy: authSession?.name || "local",
      status: "active",
      issueCount: projectQAResults?.issues?.length || 0,
      resolvedIssueCount: 0,
      OriginalData: projectData,
      ModifiedData: projectData,
      qaResults: projectQAResults,
    });

    console.log("[v0] Project created successfully with ID:", projectId);

    lastCreatedProjectRef.current = fileName;
    setPendingProjectData(null);
    setLastProcessedFileName(null);

    setActiveTab("projects");
    window.dispatchEvent(new Event("storage"));

    setTimeout(() => {
      isCreatingProjectRef.current = false;
    }, 500);
  }, [pendingProjectData, currentProject]);
  console.log("🚀 ~ Page ~ currentProject:", currentProject);
  const currentData = useMemo(
    () => currentProject?.ModifiedData || null,
    [currentProject?.ModifiedData]
  );

  const currentQAResults = useMemo(
    () => currentProject?.qaResults || null,
    [currentProject?.qaResults]
  );

  // const currentAuditLogs = useMemo(
  //   () => currentProject.auditTrail.logs || [],
  //   [currentProject.auditTrail.logs]
  // );

  // const currentIssueStatuses = useMemo(
  //   () => currentProject?.issueStatuses || [],
  //   [currentProject?.data.issueStatuses]
  // );

  const handleDataUpdate = useCallback(
    (newData: any[]) => {
      if (!currentProject) return;

      console.log(
        "[v0] Data updated. Original data:",
        currentProject.OriginalData
      );
      console.log("[v0] New modified data:", newData);

      setCurrentProject({
        ...currentProject,
        ModifiedData: newData,
      });

      setHasUnsavedChanges(true);
    },
    [currentProject]
  );

  const handleAuditLogUpdate = useCallback(
    (logs: any[]) => {
      if (!currentProject) return;

      // Note: Audit trail is not part of the simplified Project interface
      // This function may need to be updated based on how audit logs are stored
      console.log("Audit logs update:", logs);
      setHasUnsavedChanges(true);
    },
    [currentProject]
  );

  const handleSaveProject = () => {
    if (!currentProject) {
      console.log("[v0] No project to save");
      return;
    }

    console.log("[v0] Saving project updates:", currentProject.id);
    console.log("[v0] Original data:", currentProject.OriginalData);
    console.log("[v0] Modified data:", currentProject.ModifiedData);
    console.log("[v0] QA Results:", currentProject.qaResults);

    updateProject(currentProject.id, {
      ModifiedData: currentProject.ModifiedData,
      qaResults: currentProject.qaResults,
    });

    setHasUnsavedChanges(false);
    console.log("[v0] Project saved successfully");
  };

  const handleIssueStatusChange = (
    issueId: string,
    status: "resolved" | "dismissed",
    metadata?: { tableNumber?: string; comment?: string }
  ) => {
    if (!currentProject || !authSession) return;

    // Simplified for new structure - just log the action
    console.log(`Issue ${status}:`, issueId, metadata);
    setHasUnsavedChanges(true);
  };

  const reviewedCount = 0; // Simplified for new structure

  if (!isAuthenticated || !authSession) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#1D546C]  from-[#0986ed] via-[#0986ed]/20 to-[#0986ed]">
      <header className="sticky top-0 z-50 border-b border-[#0986ed]/30 bg-[#1a4e67f2]/95 backdrop-blur-md shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#F4F4F4] drop-shadow-sm">
                {currentProject?.fileName || "نظام فحص جودة البيانات الإحصائية"}
              </h1>
              <p className="text-sm mt-1 text-[#F4F4F4]/80 font-medium">
                {currentProject
                  ? "Data Quality Control System"
                  : "الرجاء اختيار أو إنشاء مشروع"}
              </p>
            </div>
            <div className="flex gap-3 items-center">
              {currentProject && (
                <Button
                  onClick={handleSaveProject}
                  className={`gap-2 text-sm py-2.5 px-6 font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg ${
                    hasUnsavedChanges
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-none"
                      : "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white border-none"
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {hasUnsavedChanges ? "حفظ التغييرات" : "محفوظ"}
                </Button>
              )}

              <div className="flex items-center gap-3 px-4 py-2.5 bg-[#F1F3E0]/10 rounded-lg border border-[#F1F3E0]/20 backdrop-blur-sm">
                <UserIcon className="w-5 h-5 text-[#FFE08F]" />
                <div className="text-right">
                  <div className="text-sm font-semibold text-[#F1F3E0]">
                    {authSession.name}
                  </div>
                  <div className="text-xs text-[#F1F3E0]/70 font-medium">
                    {authSession.role === "admin" ? "مدير" : "مستخدم"}
                  </div>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                className="gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm py-2.5 px-6 font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg border-none"
              >
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </Button>
              {currentProject && (
                <Button
                  onClick={() => {
                    // Simplified export for new structure
                    console.log(
                      "Exporting results for:",
                      currentProject.fileName
                    );
                  }}
                  className="gap-2 bg-gradient-to-r from-[#0986ed] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg text-sm py-2.5 px-6 font-semibold rounded-lg transition-all duration-200 hover:shadow-xl border-none"
                >
                  <Download className="w-4 h-4" />
                  تحميل النتائج
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav className="sticky top-[72px] z-40 w-full border-b border-[#0986ed]/20 bg-[#fffffff2] backdrop-blur-sm leading-9 shadow-sm">
        <div className="container mx-auto px-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-5 bg-transparent border-0 p-0 h-auto gap-2">
              <TabsTrigger
                value="projects"
                className="py-3 px-6 data-[state=active]:bg-[#053964] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-semibold text-[#1f254b] hover:bg-white/80 transition-all duration-200"
              >
                <FolderOpen className="w-4 h-4 inline-block mr-2" />
                المشاريع
              </TabsTrigger>
              <TabsTrigger
                value="summary"
                disabled={!currentProject}
                className="py-3 px-6 data-[state=active]:bg-[#053964] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-semibold text-[#1f254b] hover:bg-white/80 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ملخص النتائج
              </TabsTrigger>
              <TabsTrigger
                value="indicators"
                disabled={!currentProject}
                className="py-3 px-6 data-[state=active]:bg-[#053964] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-semibold text-[#1f254b] hover:bg-white/80 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                المؤشرات
              </TabsTrigger>
              <TabsTrigger
                value="issues"
                disabled={!currentProject}
                className="py-3 px-6 data-[state=active]:bg-[#053964] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-semibold text-[#1f254b] hover:bg-white/80 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                المشاكل
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                disabled={!currentProject}
                className="py-3 px-6 data-[state=active]:bg-[#053964] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-semibold text-[#1f254b] hover:bg-white/80 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                سجل التدقيق
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </nav>

      <main className="container mx-auto px-6 pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="projects" className="space-y-6 p-6">
            <ProjectsManager
              onProjectSelect={handleOpenProject}
              onFileUpload={handleFileUpload}
              isProcessing={isProcessing}
              useBackendMode={isBackendMode}
            />
          </TabsContent>

          <TabsContent value="summary" className="space-y-6 p-6">
            {currentProject && currentQAResults ? (
              <QASummary
                results={currentQAResults}
                data={currentData}
                processingDuration={processingDuration}
                reviewedCount={reviewedCount}
              />
            ) : (
              <Card className="border-[#0986ed]/30 bg-white/95 backdrop-blur-sm shadow-lg">
                <CardContent className="py-16">
                  <div className="text-center space-y-6">
                    <FolderOpen className="w-20 h-20 text-[#0986ed]/60 mx-auto" />
                    <h3 className="text-2xl font-bold text-[#1f254b]">
                      لا يوجد مشروع مفتوح
                    </h3>
                    <p className="text-[#1f254b]/70 text-lg">
                      الرجاء فتح مشروع من قائمة المشاريع
                    </p>
                    <Button
                      onClick={() => setActiveTab("projects")}
                      className="gap-3 bg-gradient-to-r from-[#0986ed] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <FolderOpen className="w-5 h-5" />
                      الذهاب إلى المشاريع
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="indicators" className="space-y-6 p-6">
            {currentProject && currentData && currentQAResults ? (
              <IndicatorsList
                data={currentData}
                qaResults={currentProject.qaResults}
                fileName={currentProject.fileName}
                onDataUpdate={handleDataUpdate}
                onAuditLogUpdate={handleAuditLogUpdate}
                projectId={currentProject.id}
              />
            ) : (
              <Card className="border-blue-800/50 bg-blue-900/20">
                <CardContent className="py-12">
                  <div className="text-center space-y-4">
                    <FolderOpen className="w-16 h-16 text-blue-400 mx-auto" />
                    <h3 className="text-xl font-semibold text-blue-200">
                      لا يوجد مشروع مفتوح
                    </h3>
                    <p className="text-blue-300">
                      الرجاء فتح مشروع من قائمة المشاريع
                    </p>
                    <Button
                      onClick={() => setActiveTab("projects")}
                      className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <FolderOpen className="w-4 h-4" />
                      الذهاب إلى المشاريع
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="issues" className="space-y-6 p-6">
            {currentProject && currentQAResults ? (
              <IssuesReport
                results={currentQAResults}
                issueStatuses={[]}
                onIssueStatusChange={handleIssueStatusChange}
                userName={authSession.name}
              />
            ) : (
              <Card className="border-blue-800/50 bg-blue-900/20">
                <CardContent className="py-12">
                  <div className="text-center space-y-4">
                    <FolderOpen className="w-16 h-16 text-blue-400 mx-auto" />
                    <h3 className="text-xl font-semibold text-blue-200">
                      لا يوجد مشروع مفتوح
                    </h3>
                    <p className="text-blue-300">
                      الرجاء فتح مشروع من قائمة المشاريع
                    </p>
                    <Button
                      onClick={() => setActiveTab("projects")}
                      className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <FolderOpen className="w-4 h-4" />
                      الذهاب إلى المشاريع
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="audit" className="space-y-6 p-6">
            {currentProject ? (
              <AuditTrailViewer
                logs={[]}
                data={currentData || []}
                qaResults={currentProject.qaResults?.issues || []}
              />
            ) : (
              <Card className="border-blue-800/50 bg-blue-900/20">
                <CardContent className="py-12">
                  <div className="text-center space-y-4">
                    <FolderOpen className="w-16 h-16 text-blue-400 mx-auto" />
                    <h3 className="text-xl font-semibold text-blue-200">
                      لا يوجد مشروع مفتوح
                    </h3>
                    <p className="text-blue-300">
                      الرجاء فتح مشروع من قائمة المشاريع
                    </p>
                    <Button
                      onClick={() => setActiveTab("projects")}
                      className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <FolderOpen className="w-4 h-4" />
                      الذهاب إلى المشاريع
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
