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
import FileUploader from "@/components/file-uploader";
import { loadProjectsList, deleteProject, type Project } from "@/lib/storage";
import {
  FileAnalysisService,
  ProjectService,
  AuthService,
} from "@/lib/backend-service";
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
import { useToast } from "@/hooks/use-toast";

interface ProjectsManagerProps {
  onProjectSelect: (project: Project) => void;
  onFileUpload: (file: File) => Promise<void>;
  isProcessing: boolean;
  useBackendMode?: boolean;
}

export default function ProjectsManager({
  onProjectSelect,
  onFileUpload,
  isProcessing,
  useBackendMode = false,
}: ProjectsManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [isBackendProcessing, setIsBackendProcessing] = useState(false);
  const [publicationName, setPublicationName] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, [useBackendMode]);

  const loadProjects = async () => {
    // Load projects from backend
    try {
      const backendProjects = await ProjectService.getProjects();
      if (backendProjects && backendProjects.success && backendProjects.data) {
        // Convert backend projects to local project format
        const convertedProjects: Project[] = backendProjects.data.map(
          (result) => ({
            id: result.id,
            publicationName: result.publicationName || "",
            fileName: result.fileName,
            fileSize: result.fileSize,
            OriginalData: result.originalData,
            ModifiedData: result.modifiedData,
            uploadedBy: result.uploadedBy,
            uploadDate: new Date(result.uploadDate).getTime(),
            lastModified: new Date(result.lastModified).getTime(),
            status: result.status || "active",
            qaResults: result.qaResults
              ? {
                  processedAt: new Date(result.qaResults.processedAt).getTime(),
                  summary: result.qaResults.summary,
                  issues: result.qaResults.issues || [],
                  qualityScore: result.qaResults.qualityScore,
                }
              : {
                  processedAt: Date.now(),
                  summary: {},
                  issues: [],
                  qualityScore: null,
                },
            issueCount: result.issueCount,
            resolvedIssueCount: result.resolvedIssueCount,
          })
        );

        // Sort by last modified (newest first)
        const sorted = convertedProjects.sort(
          (a, b) => b.lastModified - a.lastModified
        );
        setProjects(sorted);
      } else {
        toast({
          title: "حدث خطا ما",
          description: "حدث خطأ ما اثناء جلب المشروعات",
          variant: "error",
        });
        setProjects([]);
      }
    } catch (error) {
      console.error("Error loading backend projects:", error);
      setProjects([]);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (useBackendMode) {
      // Delete from backend
      try {
        const result = await ProjectService.deleteProject(projectId);
        if (result.success) {
          toast({
            title: "تم حذف المشروع بنجاح",
            description: "تم حذف المشروع من الخادم",
            variant: "default",
          });
          loadProjects(); // Reload projects from backend
        } else {
          toast({
            title: "خطأ في حذف المشروع",
            description: result.error || "حدث خطأ أثناء حذف المشروع",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error deleting backend project:", error);
        toast({
          title: "خطأ في حذف المشروع",
          description: "حدث خطأ أثناء الاتصال بالخادم",
          variant: "destructive",
        });
      }
    } else {
      // Delete from local storage
      console.log("[v0] Deleting project and all its data:", projectId);
      deleteProject(projectId);
      loadProjects();
    }
    setProjectToDelete(null);
  };

  const handleFileUploadWrapper = async (file: File) => {
    if (!publicationName.trim()) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى إدخال اسم النشرة",
        variant: "error",
      });
      return;
    }

    setIsBackendProcessing(true);
    try {
      console.log(
        "Uploading file to backend:",
        file.name,
        "with publication:",
        publicationName
      );

      // Upload and analyze file via backend with publication name
      const analysisResult = await FileAnalysisService.uploadAndAnalyze(
        file,
        publicationName.trim()
      );

      if (analysisResult != null) {
        toast({
          title: "تم رفع الملف بنجاح",
          description: `تم تحليل الملف ${file.name} وإنشاء المشروع بنجاح`,
          variant: "success",
        });

        // Reload projects to show the new one
        loadProjects();
        setShowUploader(false);
        setPublicationName(""); // Clear publication name after success
      } else {
        toast({
          title: "خطأ في إنشاء المشروع",
          description: "حدث خطأ أثناء إنشاء المشروع",
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Backend upload error:", error);
      toast({
        title: "خطأ في رفع الملف",
        description: "حدث خطأ أثناء رفع الملف للخادم",
        variant: "error",
      });
    } finally {
      setIsBackendProcessing(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const filteredProjects = projects.filter((project) =>
    project.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen  from-[#0986ed] via-[#0986ed]/20 to-[#0986ed] p-6">
      <div className="container mx-auto max-w-6xl">
        <Card
          className="border border-blue-700/40 rounded-2xl 
  bg-linear-to-br from-[#053964] via-[#0986ed]/10 to-[#0b5fa8]/40 
  shadow-lg shadow-blue-900/30 backdrop-blur-sm mb-6"
        >
          <CardHeader>
            <CardTitle className="text-2xl text-white">
              إنشاء مشروع جديد
            </CardTitle>
            <CardDescription className="text-blue-300">
              ارفع ملف Excel جديد لبدء فحص جودة البيانات
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showUploader ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">
                    أسم النشرة <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="أدخل اسم النشرة..."
                    value={publicationName}
                    onChange={(e) => setPublicationName(e.target.value)}
                    className="bg-white border-blue-700/50 text-black placeholder:text-black"
                    required
                    disabled={isProcessing || isBackendProcessing}
                  />
                </div>
                <FileUploader
                  onFileUpload={handleFileUploadWrapper}
                  isProcessing={isProcessing || isBackendProcessing}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploader(false);
                    setPublicationName(""); // Clear publication name when canceling
                  }}
                  className="w-full bg-[#F4F4F4] text-black hover:text-white"
                  disabled={isProcessing || isBackendProcessing}
                >
                  إلغاء
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowUploader(true)}
                className=" w-full
  px-6 py-3 rounded-xl font-semibold
  bg-linear-to-br from-[#053964] via-[#0986ed]/20 to-[#0b5fa8]/50
  text-blue-100
  shadow-md shadow-blue-900/40
  backdrop-blur-sm
  border border-blue-700/30
  hover:from-[#064478] hover:via-[#0a8cf2]/20 hover:to-[#0c6abf]/50
  hover:shadow-blue-900/50
  active:scale-95
  transition-all duration-300
"
                disabled={isBackendProcessing}
              >
                <UploadIcon className="w-6 h-6" />
                {useBackendMode ? "رفع ملف جديد للخادم" : "رفع ملف جديد"}
                {isBackendProcessing && (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full ml-2" />
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card
          className="border border-blue-700/40 rounded-2xl 
  bg-linear-to-br from-[#053964] via-[#0986ed]/10 to-[#0b5fa8]/40 
  shadow-lg shadow-blue-900/30 backdrop-blur-sm mb-6"
        >
          <CardHeader>
            <CardTitle className="text-2xl text-white">
              المشاريع المحفوظة
            </CardTitle>
            <CardDescription className="text-blue-300">
              ({projects.length}) مشروع
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-4 h-4" />
              <Input
                placeholder="ابحث عن مشروع..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 bg-white border-blue-700/50 text-blue-100 placeholder:text-gray-600"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {filteredProjects.length === 0 ? (
          <Card
            className="border border-blue-700/40 rounded-2xl 
  bg-linear-to-br from-[#053964] via-[#0986ed]/10 to-[#0b5fa8]/40 
  shadow-lg shadow-blue-900/30 backdrop-blur-sm"
          >
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderOpen className="w-16 h-16 text-blue-400 mb-4" />
              <p className="text-xl text-white mb-2">
                {searchQuery
                  ? "لا توجد مشاريع مطابقة للبحث"
                  : "لا توجد مشاريع محفوظة"}
              </p>
              <p className="text-white">
                {searchQuery
                  ? "جرب كلمات بحث أخرى"
                  : "ابدأ بإنشاء مشروع جديد من الأعلى"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProjects.map((project) => {
              console.log("🚀 ~ ProjectsManager ~ project:", project);
              return (
                <Card
                  key={project.id}
                  className="border border-blue-700/40 rounded-2xl 
  bg-linear-to-br from-[#053964] via-[#0986ed]/10 to-[#0b5fa8]/40 
  shadow-lg shadow-blue-900/30 backdrop-blur-sm cursor-pointer group"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-3 bg-blue-600/20 rounded-lg">
                          <FileSpreadsheet className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-white truncate">
                            اسم النشرة : {project.publicationName}
                          </h3>
                          <h3 className="text-lg font-semibold text-white truncate">
                            اسم الملف : {project.fileName}
                          </h3>
                          <p className="text-sm text-white">
                            {formatFileSize(project.fileSize)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(project.id);
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-2 mb-4 flex justify-around">
                      <div className="flex items-center gap-2 text-sm text-white">
                        <Calendar className="w-4 h-4" />
                        <span>
                          تاريخ الرفع: {formatDate(project.uploadDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white">
                        <Clock className="w-4 h-4" />
                        <span>
                          آخر تعديل: {formatDate(project.lastModified)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      {project.qaResults &&
                        project.qaResults.issues &&
                        project.qaResults.issues.length > 0 && (
                          <Badge className="bg-amber-600 text-white">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {project.qaResults.issues.length} مشكلة
                          </Badge>
                        )}
                    </div>

                    <Button
                      onClick={() => onProjectSelect(project)}
                      className="w-full cursor-pointer bg-[#1f66a0] hover:bg-[#398cd0] text-white"
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      فتح المشروع
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog
        open={projectToDelete !== null}
        onOpenChange={() => setProjectToDelete(null)}
      >
        <AlertDialogContent className="bg-slate-900 border-red-800/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-100">
              تأكيد الحذف
            </AlertDialogTitle>
            <AlertDialogDescription className="text-red-300">
              هل أنت متأكد من حذف هذا المشروع؟ سيتم حذف جميع البيانات والتعديلات
              وسجل التدقيق المرتبط به. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 text-slate-100 hover:bg-slate-700">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                projectToDelete && handleDeleteProject(projectToDelete)
              }
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
