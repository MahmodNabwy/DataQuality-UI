"use client";

import { useState, useEffect } from "react";
import {
  FolderOpen,
  Trash2,
  FileSpreadsheet,
  Calendar,
  Clock,
  AlertCircle,
  Search,
  X,
  UploadIcon,
  Cloud,
  Database,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import FileUploader from "@/components/file-uploader";
import {
  loadProjectsList,
  deleteProject,
  type Project as LocalProject,
} from "@/lib/storage";
import {
  ProjectService,
  AuthService,
  useBackendIntegration,
  type BackendProject,
} from "@/lib/backend-service";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProjectsManagerProps {
  onProjectSelect: (
    project: LocalProject | BackendProject,
    isBackendProject?: boolean
  ) => void;
  onFileUpload: (file: File) => Promise<void>;
  isProcessing: boolean;
}

export default function BackendProjectsManager({
  onProjectSelect,
  onFileUpload,
  isProcessing,
}: ProjectsManagerProps) {
  const [localProjects, setLocalProjects] = useState<LocalProject[]>([]);
  const [backendProjects, setBackendProjects] = useState<BackendProject[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectToDelete, setProjectToDelete] = useState<{
    id: string;
    type: "local" | "backend";
  } | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [isBackendMode, setIsBackendMode] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);

  const { isBackendAvailable } = useBackendIntegration();
  const { toast } = useToast();

  useEffect(() => {
    loadLocalProjects();
    checkBackendConnection();

    // Poll for project updates
    const interval = setInterval(() => {
      loadLocalProjects();
      if (isBackendConnected && AuthService.getTokenFromSession()) {
        loadBackendProjects();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isBackendConnected]);

  const checkBackendConnection = async () => {
    try {
      const available = await isBackendAvailable();
      const hasAuth = AuthService.getTokenFromSession() !== null;
      setIsBackendConnected(available && hasAuth);

      if (available && hasAuth) {
        loadBackendProjects();
      }
    } catch (error) {
      console.error("Error checking backend connection:", error);
      setIsBackendConnected(false);
    }
  };

  const loadLocalProjects = () => {
    const projectsList = loadProjectsList();
    if (projectsList) {
      const sorted = [...projectsList.projects].sort(
        (a, b) => b.lastModified - a.lastModified
      );
      setLocalProjects(sorted);
    }
  };

  const loadBackendProjects = async () => {
    if (!AuthService.getTokenFromSession()) return;

    try {
      setIsLoadingBackend(true);
      const result = await ProjectService.getProjects();

      if (result.success && result.data) {
        const sorted = [...result.data].sort(
          (a, b) =>
            new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
        );
        setBackendProjects(sorted);
      } else {
        console.error("Failed to load backend projects:", result.error);
      }
    } catch (error) {
      console.error("Error loading backend projects:", error);
    } finally {
      setIsLoadingBackend(false);
    }
  };

  const handleDeleteProject = async (
    projectId: string,
    type: "local" | "backend"
  ) => {
    try {
      if (type === "local") {
        console.log("[Projects] Deleting local project:", projectId);
        deleteProject(projectId);
        loadLocalProjects();

        toast({
          title: "تم الحذف",
          description: "تم حذف المشروع المحلي بنجاح",
          variant: "default",
        });
      } else if (type === "backend") {
        console.log("[Projects] Deleting backend project:", projectId);
        const result = await ProjectService.deleteProject(projectId);

        if (result.success) {
          loadBackendProjects();
          toast({
            title: "تم الحذف",
            description: "تم حذف المشروع من الخادم بنجاح",
            variant: "default",
          });
        } else {
          toast({
            title: "خطأ في الحذف",
            description: result.error || "فشل في حذف المشروع",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف المشروع",
        variant: "destructive",
      });
    }

    setProjectToDelete(null);
  };

  const handleFileUploadWrapper = async (file: File) => {
    await onFileUpload(file);
    setShowUploader(false);
  };

  const handleProjectSelect = (
    project: LocalProject | BackendProject,
    isBackend: boolean
  ) => {
    onProjectSelect(project, isBackend);
  };

  const toggleBackendMode = () => {
    if (!isBackendConnected && !isBackendMode) {
      toast({
        title: "غير متصل",
        description: "يرجى التأكد من تسجيل الدخول والاتصال بالخادم",
        variant: "destructive",
      });
      return;
    }

    setIsBackendMode(!isBackendMode);

    toast({
      title: isBackendMode ? "الوضع المحلي" : "وضع الخادم",
      description: isBackendMode
        ? "سيتم عرض المشاريع المحلية"
        : "سيتم عرض مشاريع الخادم",
      variant: "default",
    });
  };

  const currentProjects = isBackendMode ? backendProjects : localProjects;
  const filteredProjects = currentProjects.filter((project) =>
    (isBackendMode
      ? (project as BackendProject).fileName
      : (project as LocalProject).fileName
    )
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (timestamp: number | string) => {
    const date = new Date(
      typeof timestamp === "string" ? timestamp : timestamp
    );
    return new Intl.DateTimeFormat("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Backend Connection Status */}
      <Card className="border-blue-800/50 bg-[#0986ed] backdrop-blur">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isBackendConnected ? (
                <Wifi className="h-5 w-5 text-green-400" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-400" />
              )}
              <span className="text-blue-100">
                {isBackendConnected ? "متصل بالخادم" : "غير متصل بالخادم"}
              </span>
              {isLoadingBackend && (
                <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full" />
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-blue-300">
                {isBackendMode ? "وضع الخادم" : "الوضع المحلي"}
              </span>
              <Switch
                checked={isBackendMode}
                onCheckedChange={toggleBackendMode}
                disabled={!isBackendConnected}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Section */}
      <Card className="border-blue-800/50 bg-[#0986ed] backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl text-blue-100 flex items-center gap-2">
            {isBackendMode ? (
              <Cloud className="h-6 w-6" />
            ) : (
              <Database className="h-6 w-6" />
            )}
            إنشاء مشروع جديد
          </CardTitle>
          <CardDescription className="text-blue-300">
            {isBackendMode
              ? "ارفع ملف Excel وسيتم حفظه في الخادم"
              : "ارفع ملف Excel للتحليل المحلي"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showUploader ? (
            <div className="space-y-4">
              <FileUploader
                onFileUpload={handleFileUploadWrapper}
                isProcessing={isProcessing}
              />
              <Button
                variant="outline"
                onClick={() => setShowUploader(false)}
                className="w-full border-blue-700/50 bg-[#0986ed] hover:bg-blue-900/40 text-blue-200"
                disabled={isProcessing}
              >
                إلغاء
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setShowUploader(true)}
              className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white h-16 text-lg"
            >
              <UploadIcon className="h-6 w-6" />
              رفع ملف جديد
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Projects List */}
      <Card className="border-blue-800/50 bg-blue-900/30 backdrop-blur">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl text-blue-100 flex items-center gap-2">
              <FolderOpen className="h-6 w-6" />
              المشاريع المحفوظة
              <Badge variant="outline" className="ml-2">
                {filteredProjects.length}
              </Badge>
            </CardTitle>
          </div>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 h-4 w-4" />
              <Input
                placeholder="البحث في المشاريع..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#0986ed] border-blue-700/50 text-blue-100 placeholder-blue-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="h-16 w-16 text-blue-400 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-medium text-blue-200 mb-2">
                {searchQuery
                  ? "لا توجد مشاريع مطابقة"
                  : "لا توجد مشاريع محفوظة"}
              </h3>
              <p className="text-blue-400">
                {searchQuery
                  ? `لم يتم العثور على مشاريع تحتوي على "${searchQuery}"`
                  : "قم برفع ملف Excel لإنشاء مشروع جديد"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredProjects.map((project) => {
                const isBackendProject = isBackendMode;
                const projectName = isBackendProject
                  ? (project as BackendProject).fileName
                  : (project as LocalProject).fileName;
                const projectDate = isBackendProject
                  ? new Date((project as BackendProject).uploadDate).getTime()
                  : (project as LocalProject).lastModified;
                const projectSize = isBackendProject
                  ? (project as BackendProject).fileSize
                  : (project as LocalProject).fileSize;

                return (
                  <Card
                    key={project.id}
                    className="border-blue-700/30 bg-[#0986ed] hover:bg-blue-900/30 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <FileSpreadsheet className="h-5 w-5 text-green-400 flex-shrink-0" />
                            <h3 className="font-medium text-blue-100 truncate">
                              {projectName}
                            </h3>
                            {isBackendProject && (
                              <Badge variant="outline" className="text-xs">
                                <Cloud className="h-3 w-3 mr-1" />
                                خادم
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-blue-300">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(projectDate)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileSpreadsheet className="h-4 w-4" />
                              <span>{formatFileSize(projectSize)}</span>
                            </div>
                          </div>

                          {isBackendProject &&
                            (project as BackendProject).qaResults && (
                              <div className="mt-2 flex items-center gap-2 text-sm">
                                <AlertCircle className="h-4 w-4 text-amber-400" />
                                <span className="text-blue-300">
                                  {(project as BackendProject).qaResults.issues
                                    ?.length || 0}{" "}
                                  مشكلة
                                </span>
                              </div>
                            )}
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleProjectSelect(project, isBackendProject)
                            }
                            className="border-blue-700/50 bg-[#0986ed] hover:bg-blue-900/40 text-blue-200"
                          >
                            <FolderOpen className="h-4 w-4 mr-2" />
                            فتح
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setProjectToDelete({
                                id: project.id,
                                type: isBackendProject ? "backend" : "local",
                              })
                            }
                            className="border-red-700/50 bg-red-900/20 hover:bg-red-900/40 text-red-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={projectToDelete !== null}
        onOpenChange={() => setProjectToDelete(null)}
      >
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">
              تأكيد الحذف
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              هل أنت متأكد من حذف هذا المشروع؟ لا يمكن التراجع عن هذا الإجراء.
              {projectToDelete?.type === "backend" && (
                <div className="mt-2 p-2 bg-red-900/20 rounded border border-red-700/30">
                  <strong className="text-red-300">تحذير:</strong> سيتم حذف
                  المشروع من الخادم نهائياً
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-600">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                projectToDelete &&
                handleDeleteProject(projectToDelete.id, projectToDelete.type)
              }
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              حذف نهائياً
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
