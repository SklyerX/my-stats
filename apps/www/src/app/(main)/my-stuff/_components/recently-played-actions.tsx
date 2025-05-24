"use client";

import RecentlyPlayedTrack from "@/components/RecentlyPlayedTrack";
import type { RecentlyPlayed } from "@/server/trpc/routers/user/types";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { useEffect, useState } from "react";
import { RiPlayListAddLine } from "react-icons/ri";
import { FaHeart, FaPlus } from "react-icons/fa6";
import { FiEdit2 } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@workspace/ui/components/command";
import { trpc } from "@/server/trpc/client";
import { toast } from "@workspace/ui/components/sonner";

interface Props {
  tracks: RecentlyPlayed[];
  playlists: { name: string; id: string }[];
}

function RecentlyPlayedActions({ tracks, playlists }: Props) {
  const [selectedTracks, setSelectedTracks] = useState<Array<string>>([]);
  const [editMode, setEditMode] = useState<boolean>(false);

  const [playlistOpen, setPlaylistOpen] = useState<boolean>(false);

  const { mutate, status, error } =
    trpc.user.recentlyPlayedActions.useMutation();

  const handleTrackSelection = (trackId: string) => {
    if (selectedTracks.includes(trackId)) {
      setSelectedTracks((prev) => prev.filter((id) => id !== trackId));
    } else {
      setSelectedTracks((prev) => [...prev, trackId]);
    }
  };

  const toggleEditMode = () => setEditMode((prev) => !prev);

  useEffect(() => {
    if (status === "success") {
      setEditMode(false);
      setSelectedTracks([]);
      setPlaylistOpen(false);

      toast.success("Action completed successfully", {
        description: "Your action has been completed successfully.",
      });
    }
    if (status === "error") {
      toast.error("Action failed", {
        description: error.message,
      });
    }
  }, [status]);

  return (
    <div className="w-full relative">
      <div className="mb-5">
        <div className="flex items-center justify-between ">
          <h3 className="text-2xl font-semibold">Recently Played</h3>
          {editMode ? (
            <IoClose className="size-5" onClick={toggleEditMode} />
          ) : (
            <FiEdit2 className="size-5" onClick={toggleEditMode} />
          )}
        </div>
        <p className="text-muted-foreground">
          A curated list of your recently played (duplicates are removed from
          the view for convenience)
        </p>
      </div>
      {tracks.map((track, i) => (
        <motion.div
          layout
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex items-center gap-4"
          key={`${track.id}-${track.playedAt}-${i}`}
        >
          {editMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Checkbox
                checked={selectedTracks.includes(track.id)}
                onCheckedChange={() => handleTrackSelection(track.id)}
              />
            </motion.div>
          )}
          <motion.div
            layout
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full"
          >
            <RecentlyPlayedTrack track={track} />
          </motion.div>
        </motion.div>
      ))}
      <AnimatePresence mode="wait">
        {selectedTracks.length > 0 && (
          <motion.div
            initial={{
              opacity: 0,
              y: 100,
            }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-5 max-w-fit w-full flex items-center gap-5 translate-x-[-50%] left-[50%] bg-black border rounded-full px-4 py-2"
          >
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <Popover open={playlistOpen} onOpenChange={setPlaylistOpen}>
                  <PopoverTrigger asChild>
                    <TooltipTrigger>
                      <RiPlayListAddLine className="size-5 text-primary" />
                    </TooltipTrigger>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Command>
                      <CommandInput
                        placeholder="Search playlists..."
                        className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>No playlists found.</CommandEmpty>
                        <CommandGroup>
                          {playlists.map((playlist) => (
                            <CommandItem
                              key={playlist.id}
                              value={playlist.name}
                              onSelect={() => {
                                setPlaylistOpen(false);

                                mutate({
                                  action: "add-to-playlist",
                                  playlistId: playlist.id,
                                  trackIds: selectedTracks,
                                });
                              }}
                            >
                              {playlist.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <TooltipContent>
                  <p className="text-sm">Add to a playlist</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <FaHeart
                    className="size-5 text-red-500"
                    onClick={() =>
                      mutate({
                        action: "add-to-likes",
                        trackIds: selectedTracks,
                      })
                    }
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">Add to liked songs</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <FaPlus
                    className="size-5"
                    onClick={() =>
                      mutate({
                        action: "create-playlist",
                        trackIds: selectedTracks,
                      })
                    }
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">Create a playlist</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RecentlyPlayedActions;
