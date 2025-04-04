package main

import (
	"archive/zip"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
)

const SPOTIFY_FOLDER_NAME = "Spotify Extended Streaming History"

func ExtractAndFindAudioHistoryFiles(zipPath, destDir string) ([]string, error) {

	reader, err := zip.OpenReader(zipPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open zip file: %w", err)
	}
	defer reader.Close()

	for _, file := range reader.File {
		path := filepath.Join(destDir, file.Name)

		if !strings.HasPrefix(path, filepath.Clean(destDir)+string(os.PathSeparator)) {
			return nil, fmt.Errorf("illegal file path: %s", file.Name)
		}

		if file.FileInfo().IsDir() {
			os.MkdirAll(path, file.Mode())
			continue
		}

		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			return nil, err
		}

		destFile, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.Mode())
		if err != nil {
			return nil, err
		}

		srcFile, err := file.Open()
		if err != nil {
			destFile.Close()
			return nil, err
		}

		_, err = io.Copy(destFile, srcFile)
		srcFile.Close()
		destFile.Close()
		if err != nil {
			return nil, err
		}
	}

	spotifyFolder := filepath.Join(destDir, SPOTIFY_FOLDER_NAME)

	if _, err := os.Stat(spotifyFolder); !os.IsNotExist(err) {
		log.Printf("Found Spotify folder: %s", spotifyFolder)

		var folderJsonFiles []string

		files, err := os.ReadDir(spotifyFolder)
		if err == nil {
			for _, file := range files {
				if file.IsDir() {
					continue
				}

				fileNameLowercased := strings.ToLower(file.Name())

				if filepath.Ext(file.Name()) == ".json" && strings.Contains(fileNameLowercased, "history") && strings.Contains(fileNameLowercased, "audio") {
					jsonPath := filepath.Join(spotifyFolder, file.Name())
					log.Printf("Found JSON file: %s", jsonPath)
					folderJsonFiles = append(folderJsonFiles, jsonPath)
				}
			}
		}

		if len(folderJsonFiles) > 0 {
			return folderJsonFiles, nil
		}
	}

	var jsonFiles []string

	err = filepath.Walk(destDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !info.IsDir() && filepath.Ext(path) == ".json" {
			jsonFiles = append(jsonFiles, path)
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("error searching for JSON file: %w", err)
	}

	if len(jsonFiles) > 0 {
		log.Printf("Found JSON file through fallback search: %d", len(jsonFiles))
		return jsonFiles, nil
	}

	return nil, fmt.Errorf("no JSON file found in the archive")
}
