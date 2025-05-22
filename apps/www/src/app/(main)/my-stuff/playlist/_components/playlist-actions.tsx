"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Loader2, MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";

import { BsFiletypeCsv, BsFiletypeJson } from "react-icons/bs";
import { SiRemovedotbg } from "react-icons/si";
import { trpc } from "@/server/trpc/client";
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
} from "@workspace/ui/components/alert-dialog";
import { useRouter } from "next/navigation";

interface Props {
  playlistId: string;
}

export default function PlaylistActions({ playlistId }: Props) {
  const {
    mutate: downloadMutate,
    status,
    data,
    variables,
  } = trpc.user.downloadPlaylist.useMutation();

  const { mutate: removeDuplicates, status: rmStatus } =
    trpc.user.removeDuplicates.useMutation();

  const isLoadingDownload = status === "loading";

  const [open, setOpen] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [downloadType, setDownloadType] = useState<"json" | "csv" | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (status === "success" && data.downloadUrl) {
      if (variables?.fileType) {
        const el = document.createElement("a");

        el.style.display = "hidden";
        el.href = data.downloadUrl;
        el.download = `${playlistId}-exported.${variables.fileType}`;

        document.body.appendChild(el);
        el.click();
        document.body.removeChild(el);
      } else {
        window.open(data.downloadUrl);
      }

      setOpen(false);
      setDownloadType(null);
    }
    if (rmStatus === "success") {
      setDialogOpen(false);
      router.refresh();
    }
  }, [status, data, rmStatus]);

  const handleDownloadClick = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    fileType: "json" | "csv",
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setDownloadType(fileType);

    downloadMutate({
      fileType,
      playlistId,
    });
  };

  const handleRemoveDuplicatesDelete = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    removeDuplicates({
      playlistId,
    });
  };

  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger>
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="left">
          <DropdownMenuItem
            className="flex items-center gap-2"
            disabled={isLoadingDownload}
            onClick={(e) => handleDownloadClick(e, "csv")}
          >
            {downloadType === "csv" && isLoadingDownload ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <BsFiletypeCsv className="size-4" />
            )}
            Download as CSV
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center gap-2"
            disabled={isLoadingDownload}
            onClick={(e) => handleDownloadClick(e, "json")}
          >
            {downloadType === "csv" && isLoadingDownload ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <BsFiletypeJson className="size-4" />
            )}
            Download as JSON
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              className="flex items-center gap-2"
              onSelect={(e) => e.preventDefault()}
            >
              <SiRemovedotbg className="size-4" />
              Remove Duplicates
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Warning: Remove Duplicates</AlertDialogTitle>
          <AlertDialogDescription>
            By continuing this will reset the playlist integrity meaning
            everything will be shown as recently added, add dates and history
            relating to the playlist may be lost. This is because Spotify does
            not allow us to directly remove individual tracks. We have to
            rebuild the playlist
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="flex items-center gap-2"
            disabled={rmStatus === "loading"}
            onClick={handleRemoveDuplicatesDelete}
          >
            {rmStatus === "loading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            {rmStatus === "loading" ? "Removing..." : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
