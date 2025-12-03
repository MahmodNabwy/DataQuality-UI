"use client";

import type React from "react";
import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploaderProps {
  onFileUpload: (file: File) => Promise<void>;
  isProcessing: boolean;
}

export default function FileUploader({
  onFileUpload,
  isProcessing,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files[0]) {
        onFileUpload(files[0]);
      }
    },
    [onFileUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.currentTarget.files;
      if (files?.[0]) {
        onFileUpload(files[0]);
      }
    },
    [onFileUpload]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 ${
        isDragging
          ? "border-blue-400 bg-blue-500/10 scale-105"
          : "border-blue-700/50 hover:border-blue-600 hover:bg-blue-500/5"
      }`}
    >
      <Upload
        className={`w-16 h-16 mx-auto mb-4 transition-colors ${
          isDragging ? "text-blue-400" : "text-blue-300"
        }`}
      />
      <p className="text-lg font-semibold mb-2 text-blue-500">
        اسحب الملف هنا أو انقر للاختيار
      </p>
      <p className="text-sm text-blue-400 mb-6">ملفات Excel (.xlsx, .xls)</p>

      <label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          disabled={isProcessing}
          className="hidden"
        />
        <Button
          disabled={isProcessing}
          asChild
          className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          <span>{isProcessing ? "جاري المعالجة..." : "اختر الملف"}</span>
        </Button>
      </label>
    </div>
  );
}
