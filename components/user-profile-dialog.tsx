"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User } from 'lucide-react'

interface UserProfileDialogProps {
  open: boolean
  onUserSet: (name: string) => void
}

export function UserProfileDialog({ open, onUserSet }: UserProfileDialogProps) {
  const [name, setName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onUserSet(name.trim())
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-blue-800" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-blue-100 flex items-center gap-2">
            <User className="w-5 h-5" />
            مرحباً بك في نظام فحص جودة البيانات
          </DialogTitle>
          <DialogDescription className="text-blue-300">
            الرجاء إدخال اسمك لتسجيل التعديلات التي ستقوم بها
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userName" className="text-blue-200">
              الاسم
            </Label>
            <Input
              id="userName"
              placeholder="أدخل اسمك..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-800 border-blue-700 text-blue-100"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={!name.trim()}
          >
            متابعة
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
