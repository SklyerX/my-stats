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
import { FaSoundcloud } from "react-icons/fa6";
import { trpc } from "@/server/trpc/client";

interface Props {
  playlistId: string;
}

export default function PlaylistActions({ playlistId }: Props) {
  const { mutate, status, data, variables } =
    trpc.user.downloadPlaylist.useMutation();

  const isLoadingDownload = status === "loading";

  const [open, setOpen] = useState<boolean>(false);
  const [downloadType, setDownloadType] = useState<"json" | "csv" | null>(null);

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
  }, [status, data]);

  const handleDownloadClick = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    fileType: "json" | "csv",
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setDownloadType(fileType);

    mutate({
      fileType,
      playlistId,
    });
  };

  return (
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
        <DropdownMenuItem className="flex items-center gap-2">
          <SiRemovedotbg className="size-4" />
          Remove Duplicates
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
