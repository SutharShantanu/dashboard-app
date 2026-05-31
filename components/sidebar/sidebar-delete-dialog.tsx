import React from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

interface SidebarDeleteDialogProps {
  sheetToDelete: { spreadsheetId: string; title: string } | null
  isDeleting: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function SidebarDeleteDialog({
  sheetToDelete,
  isDeleting,
  onOpenChange,
  onConfirm
}: SidebarDeleteDialogProps) {
  return (
    <AlertDialog
      open={sheetToDelete !== null}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to remove &quot;{sheetToDelete?.title}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action will unbind the Google Sheet from the dashboard. Your
            underlying spreadsheet data in Google Sheets will remain intact.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            {isDeleting ? (
              <>
                <Spinner className="h-4 w-4" />
                Removing...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Remove
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
