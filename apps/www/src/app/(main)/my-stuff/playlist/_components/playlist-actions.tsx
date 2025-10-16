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
import { MdOutlineSort } from "react-icons/md";
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
  playlistName: string
}

export default function PlaylistActions({ playlistId, playlistName }: Props) {
  const {
    mutate: downloadMutate,
    status,
    data,
    variables,
  } = trpc.user.downloadPlaylist.useMutation();

  const { mutate: removeDuplicates, status: rmStatus } =
    trpc.user.removeDuplicates.useMutation();

  const { mutate: sortByArtist, status: sortStatus } =
    trpc.user.sortPlaylistByArtist.useMutation();

  const isLoadingDownload = status === "loading";

  const [open, setOpen] = useState<boolean>(false);
  const [removeDuplicatesDialogOpen, setRemoveDuplicatesDialogOpen] = useState<boolean>(false);
  const [sortByArtistDialogOpen, setSortByArtistDialogOpen] = useState<boolean>(false);
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
      setRemoveDuplicatesDialogOpen(false);
      router.refresh();
    }
    if (sortStatus === "success") {
      setSortByArtistDialogOpen(false);
      router.refresh();
    }
  }, [status, data, rmStatus, sortStatus]);

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

  const handleSortByArtist = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    createNew: boolean,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    sortByArtist({
      playlistId,
      createNew,
      playlistName
    });
  };

  return (
    <>
      {/* Remove Duplicates Dialog */}
      <AlertDialog open={removeDuplicatesDialogOpen} onOpenChange={setRemoveDuplicatesDialogOpen}>
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
              {downloadType === "json" && isLoadingDownload ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BsFiletypeJson className="size-4" />
              )}
              Download as JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2"
              onClick={() => {
                setOpen(false);
                setSortByArtistDialogOpen(true);
              }}
            >
              <MdOutlineSort className="size-4" />
              Sort by Artist
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

      {/* Sort by Artist Dialog */}
      <AlertDialog open={sortByArtistDialogOpen} onOpenChange={setSortByArtistDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sort Playlist by Artist</AlertDialogTitle>
            <AlertDialogDescription>
              Choose how you'd like to sort your playlist. You can either rebuild
              the current playlist (which will reset add dates) or create a new sorted
              playlist and keep the original untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="flex items-center gap-2"
              disabled={sortStatus === "loading"}
              onClick={(e) => handleSortByArtist(e, true)}
            >
              {sortStatus === "loading" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Sort & Create New
            </AlertDialogAction>
            <AlertDialogAction
              className="flex items-center gap-2"
              disabled={sortStatus === "loading"}
              onClick={(e) => handleSortByArtist(e, false)}
            >
              {sortStatus === "loading" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Rebuild Current
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}