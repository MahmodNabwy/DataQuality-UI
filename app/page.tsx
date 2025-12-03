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
import { Navigation } from "@/components/navigation";
import { ProjectDashboard } from "@/components/project-dashboard";
import { useQAProcessor } from "@/hooks/use-qa-processor";
import { useBackendQAProcessor } from "@/hooks/use-backend-qa-processor";
import { LoginForm } from "@/components/login-form";
import BackendLoginForm from "@/components/backend-login-form";
import BackendProjectsManager from "@/components/backend-projects-manager";
import { AuthGuard, useAuth } from "@/components/auth-wrapper";
import { Header } from "@/components/header";
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
  return (
    <AuthGuard fallback={<LoginForm onLogin={() => {}} />}>
      <MainPageContent />
    </AuthGuard>
  );
}

function MainPageContent() {
  const { authSession, isBackendAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("projects");

  // Backend Integration States
  const [isBackendMode, setIsBackendMode] = useState(false);
  const [showBackendLogin, setShowBackendLogin] = useState(false);

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
    if (authSession && authSession.token) {
      checkBackendAuth(authSession);
    }
  }, [authSession]);

  const checkBackendAuth = async (session: AuthSession) => {
    try {
      const available = await isBackendAvailable();
      if (available) {
        // Try to get current user to verify token
        const user = await AuthService.getCurrentUser();
        if (user) {
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

  const handleTabChange = (value: string) => {
    if (value === "projects") {
      // When clicking on projects tab, clear current project and go back to project list
      setCurrentProject(null);
      clearActiveProject();
      setHasUnsavedChanges(false);
    }
    setActiveTab(value);
  };

  const handleLogout = () => {
    clearActiveProject();
    setCurrentProject(null);
    setHasUnsavedChanges(false);
    setActiveTab("projects");
    logout();
  };

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project);
    setActiveProject(project.id);

    setActiveTab("dashboard");
    setHasUnsavedChanges(false);
  };

  const handleFileUpload = async (file: File) => {
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
      return;
    }
    setPendingProjectData({
      fileName,
      data: JSON.parse(JSON.stringify(data)),
      qaResults: JSON.parse(JSON.stringify(qaResults)),
    });
  }, [data, qaResults, lastProcessedFileName, currentProject]);

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
      return;
    }

    isCreatingProjectRef.current = true;

    // const projectId = saveProject({
    //   fileName,
    //   fileSize: 0,
    //   uploadedBy: authSession?.name || "local",
    //   status: "active",
    //   issueCount: projectQAResults?.issues?.length || 0,
    //   resolvedIssueCount: 0,
    //   OriginalData: projectData,
    //   ModifiedData: projectData,
    //   qaResults: projectQAResults,
    // });

    lastCreatedProjectRef.current = fileName;
    setPendingProjectData(null);
    setLastProcessedFileName(null);

    setActiveTab("projects");
    setCurrentProject(null);

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

  const handleDataUpdate = useCallback(
    (newData: any[]) => {
      if (!currentProject) return;

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

      setHasUnsavedChanges(true);
    },
    [currentProject]
  );

  const handleSaveProject = () => {
    if (!currentProject) {
      return;
    }

    updateProject(currentProject.id, {
      ModifiedData: currentProject.ModifiedData,
      qaResults: currentProject.qaResults,
    });

    setHasUnsavedChanges(false);
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

  const handleExportResults = () => {
    console.log("Exporting results for:", currentProject?.fileName);
  };

  const handleViewIndicators = () => {
    setActiveTab("indicators");
  };

  const handleViewSummary = () => {
    setActiveTab("summary");
  };

  const handleRefreshData = () => {
    // TODO: Implement data refresh logic
    console.log("Refreshing project data:", currentProject?.fileName);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header
        currentProject={currentProject}
        authSession={authSession}
        hasUnsavedChanges={hasUnsavedChanges}
        onSaveProject={handleSaveProject}
        onExportResults={handleExportResults}
        onLogout={handleLogout}
      />
      {currentProject && (
        <>
          <Navigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
            hasProject={!!currentProject}
          />
        </>
      )}

      <main className="container mx-auto px-6 pt-6">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsContent value="projects" className="space-y-6 p-6">
            <ProjectsManager
              onProjectSelect={handleOpenProject}
              onFileUpload={handleFileUpload}
              isProcessing={isProcessing}
              useBackendMode={isBackendMode}
            />
          </TabsContent>

          <TabsContent value="dashboard" className="">
            {currentProject ? (
              <ProjectDashboard
                project={currentProject}
                onViewIndicators={handleViewIndicators}
                onViewSummary={handleViewSummary}
                onExportData={handleExportResults}
                onRefreshData={handleRefreshData}
              />
            ) : (
              <Card className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl">
                <CardContent className="py-20">
                  <div className="text-center space-y-8">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center mx-auto shadow-lg">
                      <FolderOpen className="w-12 h-12 text-blue-500" />
                    </div>
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                      لا يوجد مشروع مفتوح
                    </h3>
                    <p className="text-blue-600 text-xl font-medium">
                      الرجاء فتح مشروع من قائمة المشاريع
                    </p>
                    <Button
                      onClick={() => (
                        setActiveTab("projects"), setCurrentProject(null)
                      )}
                      className="gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-4 px-10 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      <FolderOpen className="w-5 h-5" />
                      الذهاب إلى المشاريع
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
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
              <Card className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl">
                <CardContent className="py-20">
                  <div className="text-center space-y-8">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center mx-auto shadow-lg">
                      <FolderOpen className="w-12 h-12 text-blue-500" />
                    </div>
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                      لا يوجد مشروع مفتوح
                    </h3>
                    <p className="text-blue-600 text-xl font-medium">
                      الرجاء فتح مشروع من قائمة المشاريع
                    </p>
                    <Button
                      onClick={() => (
                        setActiveTab("projects"), setCurrentProject(null)
                      )}
                      className="gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-4 px-10 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
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
              <Card className="bg-linear-to-br from-white to-blue-50 border border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl">
                <CardContent className="py-20">
                  <div className="text-center space-y-8">
                    <div className="w-24 h-24 rounded-full bg-linear-to-r from-blue-100 to-indigo-100 flex items-center justify-center mx-auto shadow-lg">
                      <FolderOpen className="w-12 h-12 text-blue-500" />
                    </div>
                    <h3 className="text-3xl font-bold bg-linear-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                      لا يوجد مشروع مفتوح
                    </h3>
                    <p className="text-blue-600 text-xl font-medium">
                      الرجاء فتح مشروع من قائمة المشاريع
                    </p>
                    <Button
                      onClick={() => (
                        setActiveTab("projects"), setCurrentProject(null)
                      )}
                      className="gap-3 bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-4 px-10 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      <FolderOpen className="w-5 h-5" />
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
                userName={authSession?.name || "مستخدم"}
              />
            ) : (
              <Card className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl">
                <CardContent className="py-20">
                  <div className="text-center space-y-8">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center mx-auto shadow-lg">
                      <FolderOpen className="w-12 h-12 text-blue-500" />
                    </div>
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                      لا يوجد مشروع مفتوح
                    </h3>
                    <p className="text-blue-600 text-xl font-medium">
                      الرجاء فتح مشروع من قائمة المشاريع
                    </p>
                    <Button
                      onClick={() => (
                        setActiveTab("projects"), setCurrentProject(null)
                      )}
                      className="gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-4 px-10 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      <FolderOpen className="w-5 h-5" />
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
              <Card className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl">
                <CardContent className="py-20">
                  <div className="text-center space-y-8">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center mx-auto shadow-lg">
                      <FolderOpen className="w-12 h-12 text-blue-500" />
                    </div>
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                      لا يوجد مشروع مفتوح
                    </h3>
                    <p className="text-blue-600 text-xl font-medium">
                      الرجاء فتح مشروع من قائمة المشاريع
                    </p>
                    <Button
                      onClick={() => (
                        setActiveTab("projects"), setCurrentProject(null)
                      )}
                      className="gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-4 px-10 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      <FolderOpen className="w-5 h-5" />
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
