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
  CheckCircle,
  Lock,
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

  const filteredProjects = projects.filter((project) =>
    project.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="container mx-auto max-w-6xl">
        <Card className="bg-linear-to-br from-white to-blue-50 px-4 py-4  border border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl mb-6">
          <CardHeader className="bg-linear-to-r from-blue-50 to-indigo-50 border-b border-blue-100 rounded-t-2xl">
            <CardTitle className="text-2xl font-bold bg-linear-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
              إنشاء مشروع جديد
            </CardTitle>
            <CardDescription className="text-blue-600 text-lg">
              ارفع ملف Excel جديد لبدء فحص جودة البيانات
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showUploader ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-blue-700 mb-2">
                    أسم النشرة <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="أدخل اسم النشرة..."
                    value={publicationName}
                    onChange={(e) => setPublicationName(e.target.value)}
                    className="bg-white border-blue-300 text-gray-900 placeholder:text-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 shadow-sm transition-all duration-200"
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
                  className="w-full bg-linear-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400 shadow-md hover:shadow-lg transition-all duration-200"
                  disabled={isProcessing || isBackendProcessing}
                >
                  إلغاء
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowUploader(true)}
                className="w-full bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
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

        <Card className="bg-linear-to-br  from-white to-blue-50 px-4 py-4 border border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl mb-6">
          <CardHeader className="bg-linear-to-r from-blue-50 to-indigo-50  border-b border-blue-100 rounded-t-2xl">
            <CardTitle className="text-2xl font-bold bg-linear-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
              المشاريع المحفوظة
            </CardTitle>
            <CardDescription className="text-blue-600 text-lg font-medium">
              ({projects.length}) مشروع
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5" />
              <Input
                placeholder="ابحث عن مشروع..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-12 bg-linear-to-r from-white to-blue-50 border-blue-300 text-gray-900 placeholder:text-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 shadow-sm transition-all duration-200 text-lg py-3"
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
          <Card className="bg-linear-to-br from-white to-blue-50 border border-blue-200 shadow-xl rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-full bg-linear-to-r from-blue-100 to-indigo-100 flex items-center justify-center mb-6 shadow-lg">
                <FolderOpen className="w-10 h-10 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-800 mb-3">
                {searchQuery
                  ? "لا توجد مشاريع مطابقة للبحث"
                  : "لا توجد مشاريع محفوظة"}
              </p>
              <p className="text-blue-600 text-lg">
                {searchQuery
                  ? "جرب كلمات بحث أخرى"
                  : "ابدأ بإنشاء مشروع جديد من الأعلى"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProjects.map((project) => {
              return (
                <Card
                  key={project.id}
                  className={`transition-all duration-300 rounded-2xl group ${
                    project.status === "ended"
                      ? "bg-linear-to-br from-green-50 to-emerald-50 border border-green-200 shadow-lg opacity-90"
                      : "bg-linear-to-br from-white to-blue-50 border border-blue-200 shadow-xl hover:shadow-2xl hover:scale-105"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4 flex-1">
                        <Button
                          variant="ghost"
                          size="lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectToDelete(project.id);
                          }}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full p-2 transition-all duration-200"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold bg-linear-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent truncate">
                            اسم النشرة : {project.publicationName}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center gap-3 p-3 bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <div className="w-8 h-8 rounded-full bg-linear-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                          <Calendar className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-blue-600 font-medium">
                            تاريخ الرفع
                          </p>
                          <p className="text-gray-800 font-semibold">
                            {formatDate(project.uploadDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-linear-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                        <div className="w-8 h-8 rounded-full bg-linear-to-r from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
                          <Clock className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-purple-600 font-medium">
                            آخر تعديل
                          </p>
                          <p className="text-gray-800 font-semibold">
                            {formatDate(project.lastModified)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-6">
                      {project.status === "ended" && (
                        <Badge className="bg-linear-to-r from-green-500 to-emerald-600 text-white shadow-md px-3 py-1">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          تم إنهاء التدقيق
                        </Badge>
                      )}
                      {project.status === "active" && (
                        <Badge className="bg-linear-to-r from-blue-500 to-indigo-600 text-white shadow-md px-3 py-1">
                          نشط
                        </Badge>
                      )}
                      {project.qaResults &&
                        project.qaResults.issues &&
                        project.qaResults.issues.length > 0 && (
                          <Badge className="bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-md px-3 py-1">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            {project.qaResults.issues.length} مشكلة
                          </Badge>
                        )}
                    </div>

                    {project.status === "ended" ? (
                      <div className="space-y-3">
                        <div className="w-full bg-linear-to-r from-green-100 to-emerald-100 border-2 border-green-300 text-green-700 font-semibold py-3 rounded-xl shadow-md flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 mr-2" />
                          تم إنهاء التدقيق من قبل الإدارة
                        </div>
                        <Button
                          disabled
                          className="w-full bg-gray-300 text-gray-500 cursor-not-allowed font-semibold py-3 rounded-xl shadow-md"
                        >
                          <Lock className="w-5 h-5 mr-2" />
                          المشروع مغلق
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => onProjectSelect(project)}
                        className="w-full bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
                      >
                        <FolderOpen className="w-5 h-5 mr-2" />
                        فتح المشروع
                      </Button>
                    )}
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
        <AlertDialogContent className="bg-linear-to-br from-white to-red-50 border-red-300 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold bg-linear-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
              تأكيد الحذف
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 text-lg leading-relaxed">
              هل أنت متأكد من حذف هذا المشروع؟ سيتم حذف جميع البيانات والتعديلات
              وسجل التدقيق المرتبط به. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-linear-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400 shadow-md hover:shadow-lg transition-all duration-200">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                projectToDelete && handleDeleteProject(projectToDelete)
              }
              className="bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
