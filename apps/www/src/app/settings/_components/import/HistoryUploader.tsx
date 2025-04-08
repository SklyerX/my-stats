"use client";

import { cn } from "@workspace/ui/lib/utils";
import { UploadCloud } from "lucide-react";
import { useCallback, useRef, useState, type DragEvent } from "react";

import { convert } from "@sklyerx/size-convertor";
import { toast } from "@workspace/ui/components/sonner";
import { Progress } from "@workspace/ui/components/progress";
import { Button } from "@workspace/ui/components/button";

const MAX_FILE_SIZE = convert("40mb", "b");

export default function HistoryUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return;

      const file = selectedFiles[0];

      if (!file) return;

      if (file.size > MAX_FILE_SIZE) {
        toast.error("File cannot be larger than 40mb");
        return;
      }

      if (file.type !== "application/zip" && file.type !== "application/gzip") {
        toast.error("Only zip files are accepted");
        return;
      }

      setFile(file);
    },
    [file],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      const droppedFiles = e.dataTransfer.files;
      handleFileChange(droppedFiles);
    },
    [handleFileChange],
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setUploadProgress(0);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round(
            (event.loaded / event.total) * 100,
          );
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(100);
          toast.success("File has been queued for uploading.");
          setFile(null);
        } else {
          toast.error(`Upload failed: ${xhr.statusText}`);
          setIsUploading(false);
        }
      });

      xhr.addEventListener("error", () => {
        toast.error("Upload failed due to a network error");
        setIsUploading(false);
      });

      xhr.open("POST", "/api/upload/history", true);
      xhr.send(formData);
    } catch (error) {
      toast.error(
        `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragStart={() => setIsDragActive(true)}
        onDragExit={() => setIsDragActive(false)}
        onClick={handleClick}
        className={cn(
          "w-full border border-dashed rounded-md flex flex-col items-center justify-center py-10 bg-card relative cursor-pointer",
          {
            "border-sky-400": isDragActive,
          },
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          disabled={isUploading}
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files)}
          multiple={false}
          accept=".zip,.gzip"
        />
        <UploadCloud className="size-8" />
        <h3 className="text-lg font-semibold mt-2">
          Drag & Drop or{" "}
          <span className="font-medium text-primary">choose</span> to upload
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          we accept zip files from Spotify up to 40mb
        </p>
        {isDragActive ? (
          <div className="absolute top-0 left-0 w-full h-full bg-card/95 flex items-center justify-center rounded-md">
            <h3 className="text-xl font-semibold">
              You can drop the file anywhere in the dropzone!
            </h3>
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between my-5">
        <h3 className="text-xl font-semibold">File waiting to be uploaded</h3>
        <Button
          size="sm"
          disabled={!file || isUploading}
          onClick={handleUpload}
        >
          Upload
        </Button>
      </div>
      {file ? (
        <div className="mt-5">
          <h3 className="text-xl font-semibold">{file.name}</h3>
          <Progress value={uploadProgress} className="mt-2" />
        </div>
      ) : null}
    </div>
  );
}
