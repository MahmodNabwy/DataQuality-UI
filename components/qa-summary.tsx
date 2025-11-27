"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QAResults } from "@/lib/qa-engine";
import { Clock, FileCheck, BarChart3, TrendingUp } from "lucide-react";

interface QASummaryProps {
  results: QAResults;
  data: any;
  processingDuration?: number | null;
  reviewedCount?: number;
}

export default function QASummary({
  results,
  data,
  processingDuration,
  reviewedCount = 0,
}: QASummaryProps) {
  const totalRows = data?.length || 0;
  const passedRate =
    (results.summary.passedChecks /
      (results.summary.passedChecks + results.summary.failedChecks)) *
    100;

  const qualityScore = results.qualityScore;

  const getRatingConfig = (rating: string) => {
    switch (rating) {
      case "excellent":
        return {
          label: "ممتاز",
          color: "text-white",
          bgColor: "from-green-600/30 to-green-700/30",
          borderColor: "border-green-600/50",
        };
      case "good":
        return {
          label: "جيد",
          color: "text-blue-400",
          bgColor: "from-blue-600/30 to-blue-700/30",
          borderColor: "border-blue-600/50",
        };
      case "fair":
        return {
          label: "متوسط",
          color: "text-yellow-400",
          bgColor: "from-yellow-600/30 to-yellow-700/30",
          borderColor: "border-yellow-600/50",
        };
      case "poor":
        return {
          label: "ضعيف",
          color: "text-red-400",
          bgColor: "from-red-600/30 to-red-700/30",
          borderColor: "border-red-600/50",
        };
      default:
        return {
          label: "غير محدد",
          color: "text-gray-400",
          bgColor: "from-gray-600/30 to-gray-700/30",
          borderColor: "border-gray-600/50",
        };
    }
  };

  const stats = [
    {
      label: "إجمالي الصفوف",
      value: totalRows,
      icon: "📊",
      color: "from-blue-600/30 to-blue-700/30 border-blue-600/50",
      textColor: "text-white",
    },
    {
      label: "عدد المؤشرات",
      value: results.summary.totalIndicators,
      icon: "📈",
      color: "from-cyan-600/30 to-cyan-700/30 border-cyan-600/50",
      textColor: "text-white",
    },
    {
      label: "معدل النجاح",
      value: `${passedRate.toFixed(1)}%`,
      icon: "✅",
      color:
        passedRate >= 95
          ? "from-green-600/30 to-green-700/30 border-green-600/50"
          : "from-yellow-600/30 to-yellow-700/30 border-yellow-600/50",
      textColor: passedRate >= 95 ? "text-white" : "text-yellow-300",
    },
    {
      label: "المشاكل المكتشفة",
      value: results.summary.failedChecks,
      icon: "⚠️",
      color: "from-red-600/30 to-red-700/30 border-red-600/50",
      textColor: "text-white",
    },
  ];

  const advancedStats = [
    {
      label: "وقت الفحص",
      value: results.processedAt
        ? new Date(results.processedAt).toLocaleString()
        : null,
      icon: <Clock className="w-8 h-8" />,
      color: "from-purple-600/30 to-purple-700/30",
      borderColor: "border-purple-600/50",
      textColor: "text-purple-300",
    },
    {
      label: "المؤشرات المراجعة",
      value: `${reviewedCount} / ${results.summary.totalIndicators}`,
      subValue: `${(
        (reviewedCount / results.summary.totalIndicators) *
        100
      ).toFixed(1)}%`,
      icon: <FileCheck className="w-8 h-8" />,
      color: "from-teal-600/30 to-teal-700/30",
      borderColor: "border-teal-600/50",
      textColor: "text-teal-300",
    },
    {
      label: "معدل جودة البيانات",
      value: qualityScore ? `${qualityScore.overall}/100` : "غير متاح",
      subValue: qualityScore ? getRatingConfig(qualityScore.rating).label : "",
      icon: <BarChart3 className="w-8 h-8" />,
      color: qualityScore
        ? qualityScore.overall >= 95
          ? "from-green-600/30 to-green-700/30"
          : qualityScore.overall >= 80
          ? "from-blue-600/30 to-blue-700/30"
          : qualityScore.overall >= 60
          ? "from-yellow-600/30 to-yellow-700/30"
          : "from-red-600/30 to-red-700/30"
        : "from-gray-600/30 to-gray-700/30",
      borderColor: qualityScore
        ? qualityScore.overall >= 95
          ? "border-green-600/50"
          : qualityScore.overall >= 80
          ? "border-blue-600/50"
          : qualityScore.overall >= 60
          ? "border-yellow-600/50"
          : "border-red-600/50"
        : "border-gray-600/50",
      textColor: qualityScore
        ? qualityScore.overall >= 95
          ? "text-green-300"
          : qualityScore.overall >= 80
          ? "text-blue-300"
          : qualityScore.overall >= 60
          ? "text-yellow-300"
          : "text-red-300"
        : "text-gray-300",
    },
  ];

  return (
    <div className="space-y-8">
      {qualityScore && (
        <Card
          className="border border-blue-700/40 rounded-2xl 
  bg-linear-to-br from-[#053964] via-[#0986ed]/10 to-[#0b5fa8]/40 
  shadow-lg shadow-blue-900/30 backdrop-blur-sm"
        >
          <CardContent className="pt-10 pb-10">
            <p className="text-2xl text-blue-200 mb-3 text-center font-medium tracking-wide">
              درجة جودة البيانات الشاملة
            </p>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Left Section */}
              <div className="text-center md:text-right flex-1 pl-8">
                <div className="flex items-center justify-center md:justify-start gap-5">
                  <div className="text-7xl font-extrabold bg-linear-to-br from-white to-blue-200 bg-clip-text text-transparent drop-shadow-sm">
                    {qualityScore.overall}
                  </div>

                  <div className="text-right leading-tight">
                    <div className="text-sm text-blue-300 mb-1">من 100</div>

                    <div
                      className={`text-2xl font-bold tracking-wide ${
                        getRatingConfig(qualityScore.rating).color
                      }`}
                    >
                      {getRatingConfig(qualityScore.rating).label}
                    </div>
                  </div>
                </div>
              </div>

              {/* Gauge */}
              <div className="relative w-52 h-52 pr-8">
                <svg className="transform -rotate-90 w-52 h-52">
                  {/* Background circle */}
                  <circle
                    cx="104"
                    cy="104"
                    r="85"
                    stroke="currentColor"
                    strokeWidth="14"
                    fill="none"
                    className="text-blue-900/40"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="104"
                    cy="104"
                    r="85"
                    stroke="currentColor"
                    strokeWidth="14"
                    fill="none"
                    strokeDasharray={`${
                      (qualityScore.overall / 100) * 534
                    } 534`}
                    strokeLinecap="round"
                    className={
                      qualityScore.rating === "excellent"
                        ? "text-green-400"
                        : qualityScore.rating === "good"
                        ? "text-blue-400"
                        : qualityScore.rating === "fair"
                        ? "text-yellow-400"
                        : "text-red-400"
                    }
                  />
                </svg>

                {/* Emoji badge */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl drop-shadow-sm">
                    {qualityScore.rating === "excellent"
                      ? "🏆"
                      : qualityScore.rating === "good"
                      ? "✨"
                      : qualityScore.rating === "fair"
                      ? "⚡"
                      : "⚠️"}
                  </span>
                </div>
              </div>
            </div>

            {/* Breakdown Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10 pt-6 border-t border-white/20">
              {[
                {
                  label: "الاكتمال",
                  value: qualityScore.breakdown.completeness,
                },
                { label: "الدقة", value: qualityScore.breakdown.accuracy },
                { label: "الاتساق", value: qualityScore.breakdown.consistency },
                { label: "الصحة", value: qualityScore.breakdown.validity },
              ].map((item, idx) => (
                <div key={idx} className="text-center">
                  <p className="text-lg text-blue-100/80 mb-2">{item.label}</p>
                  <p className="text-2xl font-bold text-blue-50 drop-shadow-sm">
                    {item.value}%
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <Card
            key={idx}
            className={`
        relative overflow-hidden 
        border rounded-2xl
        bg-linear-to-br ${stat.color} 
        backdrop-blur-sm
        shadow-sm
        hover:shadow-xl hover:scale-[1.02]
        transition-all duration-300
      `}
          >
            <CardContent className="p-2">
              <div className="flex items-start justify-between">
                <span className="text-2xl opacity-90 drop-shadow-sm">
                  {stat.icon}
                </span>
                <div className="space-y-2">
                  <p className="text-sm text-white/80 font-medium tracking-wide">
                    {stat.label}
                  </p>

                  <p
                    className={`text-[16px] pr-4 font-extrabold leading-tight ${stat.textColor}`}
                  >
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-blue-700/50 bg-linear-to-br from-blue-900/40 to-purple-900/40 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-blue-100 flex justify-between items-center  gap-2">
            <TrendingUp className="w-6 h-6" />
            <span className="text-white text-xl">إحصائيات متقدمة</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {advancedStats.map((stat, idx) => (
              <div
                key={idx}
                className={`p-2 bg-linear-to-br ${stat.color} rounded-lg border ${stat.borderColor} hover:border-opacity-80 transition-all`}
              >
                <div className="flex justify-between items-center gap-3 mb-3">
                  <div className={stat.textColor}>{stat.icon}</div>
                  <p className="text-xm text-white">{stat.label}</p>
                </div>
                <p className={`text-xl font-bold ${stat.textColor}`}>
                  {stat.value}
                </p>
                {stat.subValue && (
                  <p className="text-sm text-blue-300 mt-1">{stat.subValue}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Details Card */}
      <Card className="border-blue-700/50 bg-linear-to-br from-blue-900/40 to-blue-950/40 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-blue-100">
            ملخص الفحوصات التفصيلي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-linear-to-br from-green-600/20 to-green-700/20 rounded-lg border border-green-600/40 hover:border-green-500/60 transition-colors">
              <p className="text-sm text-green-200">الفحوصات الناجحة</p>
              <p className="text-3xl font-bold text-green-400 mt-2">
                {results.summary.passedChecks}
              </p>
            </div>
            <div className="p-4 bg-linear-to-br from-red-600/20 to-red-700/20 rounded-lg border border-red-600/40 hover:border-red-500/60 transition-colors">
              <p className="text-sm text-red-200">الفحوصات الفاشلة</p>
              <p className="text-3xl font-bold text-red-400 mt-2">
                {results.summary.failedChecks}
              </p>
            </div>
          </div>

          {/* Check Types */}
          <div className="mt-6 space-y-3 border-t border-blue-700/30 pt-6">
            <p className="font-semibold text-blue-100">
              : تفاصيل أنواع الفحوصات
            </p>
            <div className="grid gap-2">
              {Object.entries(results.summary.checksByType || {}).map(
                ([type, count]: [string, any]) => (
                  <div
                    key={type}
                    className="flex justify-between items-center p-3 bg-blue-900/40 rounded-lg border border-blue-700/30 hover:border-blue-600/50 transition-colors"
                  >
                    <span className="text-blue-200">{type}</span>
                    <div className="flex gap-4 font-mono text-sm">
                      <span className="text-green-400">{count.passed} ✓</span>
                      <span className="text-red-400">{count.failed} ✗</span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6 space-y-2 border-t border-blue-700/30 pt-6">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold text-blue-100">
                نسبة جودة البيانات
              </p>
              <p
                className={`text-2xl font-bold ${
                  passedRate >= 95
                    ? "text-green-400"
                    : passedRate >= 80
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {passedRate.toFixed(1)}%
              </p>
            </div>
            <div className="w-full bg-blue-900/60 rounded-full h-3 overflow-hidden border border-blue-700/40">
              <div
                className={`h-full transition-all ${
                  passedRate >= 95
                    ? "bg-gradient-to-r from-green-500 to-green-400"
                    : passedRate >= 80
                    ? "bg-gradient-to-r from-yellow-500 to-yellow-400"
                    : "bg-gradient-to-r from-red-500 to-red-400"
                }`}
                style={{ width: `${passedRate}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
