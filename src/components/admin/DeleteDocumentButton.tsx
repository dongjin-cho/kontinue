"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteDocumentButtonProps {
  documentId: string;
  title: string;
}

export function DeleteDocumentButton({ documentId, title }: DeleteDocumentButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/knowledge?id=${documentId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        router.refresh();
      } else {
        alert(data.error || "삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("서버 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>문서 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{title}&quot; 문서를 삭제하시겠습니까?
            <br />
            이 작업은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                삭제 중...
              </>
            ) : (
              "삭제"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
