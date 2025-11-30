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

    setActiveTab("summary");
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

  return (
    <div className="min-h-screen bg-[#1D546C]  from-[#0986ed] via-[#0986ed]/20 to-[#0986ed]">
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
                      onClick={() => (
                        setActiveTab("projects"), setCurrentProject(null)
                      )}
                      className="gap-3 bg-linear-to-r from-[#0986ed] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
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
                      onClick={() => (
                        setActiveTab("projects"), setCurrentProject(null)
                      )}
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
                userName={authSession?.name || "مستخدم"}
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
                      onClick={() => (
                        setActiveTab("projects"), setCurrentProject(null)
                      )}
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
                      onClick={() => (
                        setActiveTab("projects"), setCurrentProject(null)
                      )}
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
