package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"runtime"
	"sort"
	"sync"
	"time"
)

type Track struct {
	Ts                            string `json:"ts"`
	Platform                      string `json:"platform"`
	MsPlayed                      int    `json:"ms_played"`
	ConnCountry                   string `json:"conn_country"`
	MasterMetadataTrackName       string `json:"master_metadata_track_name"`
	MasterMetadataAlbumArtistName string `json:"master_metadata_album_artist_name"`
	MasterMetadataAlbumAlbumName  string `json:"master_metadata_album_album_name"`
	SpotifyTrackUri               string `json:"spotify_track_uri"`
	ReasonStart                   string `json:"reason_start"`
	ReasonEnd                     string `json:"reason_end"`
	Shuffle                       bool   `json:"shuffle"`
	Skipped                       bool   `json:"skipped"`
}

type SimplifiedTrack struct {
	Ts        string
	Artist    string
	Track     string
	AlbumName string
}

type ArtistData struct {
	Count  int    `json:"count"`
	Artist string `json:"artist"`
	Uri    string `json:"uri"`
}

type TrackData struct {
	Count  int    `json:"count"`
	Track  string `json:"track"`
	Uri    string `json:"uri"`
	Artist string `json:"artist"`
}

type ListeningInsight struct {
	SimplifiedTracks []SimplifiedTrack      `json:"tracks"`
	TotalMs          int                    `json:"total_ms"`
	TopArtists       []ArtistData           `json:"top_artists"`
	TopTracks        []TrackData            `json:"top_tracks"`
	TimeOfDay        map[int]int            `json:"time_of_day"`
	PeakHour         int                    `json:"peak_hour"`
	TimeMessage      string                 `json:"time_message"`
	CountryCodes     map[string]int         `json:"country_codes"`
	Platforms        map[string]int         `json:"platforms"`
	Stats            map[string]interface{} `json:"stats"`
}

type ListeningTime struct {
	Hours   int `json:"hours"`
	Minutes int `json:"minutes"`
}

type ProcessResult struct {
	ProcessID     string        `json:"processId"`
	TotalMs       int           `json:"totalMs"`
	TopArtists    []ArtistData  `json:"topArtists"`
	TopTracks     []TrackData   `json:"topTracks"`
	TimeMessage   string        `json:"timeMessage"`
	UniqueArtists int           `json:"uniqueArtists"`
	UniqueTracks  int           `json:"uniqueTracks"`
	TotalTracks   int           `json:"totalTracks"`
	ListeningTime ListeningTime `json:"listeningTime"`
	PeakHour      int           `json:"peakHour"`
}

func ProcessListeningHistoryFiles(jsonFilePaths []string, processId string) (*ProcessResult, error) {
	fmt.Println("Starting Parse")

	var allEntries []Track

	for _, jsonFilePath := range jsonFilePaths {
		fmt.Printf("Processing JSON file: %s", jsonFilePath)

		data, err := os.ReadFile(jsonFilePath)
		if err != nil {
			return nil, fmt.Errorf("error reading file: %w", err)
		}

		// Check for UTF-8 BOM and skip if present
		if len(data) >= 3 && data[0] == 0xEF && data[1] == 0xBB && data[2] == 0xBF {
			data = data[3:]
		}

		var entries []Track
		err = json.Unmarshal(data, &entries)
		if err != nil {
			log.Printf("Error parsing JSON in %s: %v", jsonFilePath, err)
			continue
		}

		log.Printf("Found %d tracks in file %s", len(entries), jsonFilePath)
		allEntries = append(allEntries, entries...)
	}

	if len(allEntries) == 0 {
		return nil, fmt.Errorf("no valid entries found in any of the JSON files")
	}

	log.Printf("Processing a total of %d tracks from all files", len(allEntries))

	var wg sync.WaitGroup
	var mutex sync.Mutex

	availableWorkers := runtime.NumCPU()
	chunkSize := len(allEntries) / availableWorkers

	totalMs := 0

	artists := make(map[string]*ArtistData)
	tracks := make(map[string]*TrackData)

	timeOfDayMap := make(map[int]int)
	countryCodes := make(map[string]int)
	platforms := make(map[string]int)

	simplifiedTracks := make([]SimplifiedTrack, 0, len(allEntries))

	for i := 0; i < availableWorkers; i++ {
		start := i * chunkSize
		end := (i + 1) * chunkSize

		if i == availableWorkers-1 {
			end = len(allEntries)
		}

		wg.Add(1)

		go worker(allEntries[start:end], &wg, &mutex, &totalMs, &timeOfDayMap, &simplifiedTracks, &artists,
			&tracks,
			&countryCodes,
			&platforms,
		)
	}

	wg.Wait()

	// Find peak listening hour
	peakHour := 0
	maxCount := 0

	// Dump the timeOfDayMap for debugging
	log.Printf("Time of day distribution: %v", timeOfDayMap)

	for hour, count := range timeOfDayMap {
		if count > maxCount {
			maxCount = count
			peakHour = hour
		}
	}

	log.Printf("Found peak hour %d with count %d", peakHour, maxCount)

	var timeMessage string

	if maxCount == 0 {
		timeMessage = "We couldn't determine your listening pattern from this data"
	} else {
		displayHour := peakHour
		suffix := "AM"

		if peakHour >= 12 {
			suffix = "PM"
			if peakHour > 12 {
				displayHour = peakHour - 12
			}
		}

		if peakHour == 0 {
			displayHour = 12
			suffix = "AM"
		}

		// Determine time category and set message
		if peakHour >= 5 && peakHour < 9 {
			timeMessage = fmt.Sprintf("You're an early bird! Kicking off the day at %d %s with some nice tunes", displayHour, suffix)
		} else if peakHour >= 9 && peakHour < 12 {
			timeMessage = fmt.Sprintf("Mid-morning is your jam time! Most active at %d %s", displayHour, suffix)
		} else if peakHour >= 12 && peakHour < 17 {
			timeMessage = fmt.Sprintf("Afternoon delight! You love listening to music at %d %s", displayHour, suffix)
		} else if peakHour >= 17 && peakHour < 21 {
			timeMessage = fmt.Sprintf("Evening relaxer! Winding down (or getting hyped?) at %d %s with your favourite tracks", displayHour, suffix)
		} else {
			// Both late night (21-23) and early morning (0-4)
			timeMessage = fmt.Sprintf("You're a night owl! Blasting music at %d %s", displayHour, suffix)
		}
	}

	log.Printf("Generated time message: '%s'", timeMessage)

	topArtists := getTopArtists(artists, 25)
	topTracks := getTopTracks(tracks, 50)

	listening_stats := calculateListeningStats(simplifiedTracks, totalMs)

	// insights := ListeningInsight{
	// 	TotalMs:      totalMs,
	// 	TopArtists:   topArtists,
	// 	TopTracks:    topTracks,
	// 	TimeOfDay:    timeOfDayMap,
	// 	PeakHour:     peakHour,
	// 	TimeMessage:  timeMessage,
	// 	CountryCodes: countryCodes,
	// 	Platforms:    platforms,
	// 	Stats:        listening_stats,
	// }

	stats := listening_stats["total_listening_time"].(struct {
		Minutes int
		Hours   int
	})

	// send all tracks?

	result := &ProcessResult{
		ProcessID:     processId,
		TotalMs:       totalMs,
		TopArtists:    topArtists[:min(10, len(topArtists))],
		TopTracks:     topTracks[:min(10, len(topTracks))],
		TimeMessage:   timeMessage,
		PeakHour:      peakHour,
		UniqueArtists: listening_stats["unique_artists"].(int),
		UniqueTracks:  listening_stats["unique_tracks"].(int),
		TotalTracks:   listening_stats["total_tracks_played"].(int),
		ListeningTime: ListeningTime{
			Hours:   stats.Hours,
			Minutes: stats.Minutes,
		},
	}

	return result, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}

	return b
}

func incrementMapValue(m map[string]int, key string) {
	m[key]++
}

func worker(entries []Track, wg *sync.WaitGroup, mutex *sync.Mutex, totalMs *int, timeOfDay *map[int]int, simplifiedTracks *[]SimplifiedTrack, artists *map[string]*ArtistData, tracks *map[string]*TrackData, countryCodes, platforms *map[string]int) {
	defer wg.Done()

	localTotalMs := 0
	localArtistsMap := make(map[string]*ArtistData)
	localTracksMap := make(map[string]*TrackData)
	localCountryCodes := make(map[string]int)
	localTimeOfDayForTracksMap := make(map[int]int)
	localPlatformMap := make(map[string]int)

	localSimplifiedTracks := make([]SimplifiedTrack, 0, len(entries))

	for _, track := range entries {
		localTotalMs += track.MsPlayed
		trackName := track.MasterMetadataTrackName
		artistName := track.MasterMetadataAlbumArtistName
		countryCode := track.ConnCountry
		platform := track.Platform

		incrementMapValue(localCountryCodes, countryCode)
		incrementMapValue(localPlatformMap, platform)

		if _, exists := localArtistsMap[artistName]; !exists {
			localArtistsMap[artistName] = &ArtistData{
				Count:  0,
				Artist: artistName,
				Uri:    track.SpotifyTrackUri,
			}
		}

		if _, exists := localTracksMap[trackName]; !exists {
			localTracksMap[trackName] = &TrackData{
				Count:  0,
				Track:  trackName,
				Uri:    track.SpotifyTrackUri,
				Artist: artistName,
			}
		}

		localArtistsMap[artistName].Count++
		localTracksMap[trackName].Count++

		dateString := track.Ts
		layout := "2006-01-02T15:04:05Z"

		timestamp, err := time.Parse(layout, dateString)
		if err != nil {
			fmt.Println("Error parsing date:", err)
			continue
		}

		hour := timestamp.Hour()
		localTimeOfDayForTracksMap[hour]++

		simplifiedTrack := SimplifiedTrack{
			Ts:        dateString,
			Artist:    artistName,
			Track:     trackName,
			AlbumName: track.MasterMetadataAlbumAlbumName,
		}

		localSimplifiedTracks = append(localSimplifiedTracks, simplifiedTrack)
	}

	mutex.Lock()
	*totalMs += localTotalMs

	for time, count := range localTimeOfDayForTracksMap {
		(*timeOfDay)[time] += count
	}

	for artist, data := range localArtistsMap {
		if _, exists := (*artists)[artist]; !exists {
			(*artists)[artist] = &ArtistData{
				Count:  0,
				Artist: artist,
				Uri:    data.Uri,
			}
		}
		(*artists)[artist].Count += data.Count
	}

	for track, data := range localTracksMap {
		if _, exists := (*tracks)[track]; !exists {
			(*tracks)[track] = &TrackData{
				Count:  0,
				Track:  track,
				Uri:    data.Uri,
				Artist: data.Artist,
			}
		}
		(*tracks)[track].Count += data.Count
	}

	for countryCode, count := range localCountryCodes {
		(*countryCodes)[countryCode] += count
	}

	for platform, count := range localPlatformMap {
		(*platforms)[platform] += count
	}

	*simplifiedTracks = append(*simplifiedTracks, localSimplifiedTracks...)

	mutex.Unlock()

}

func getTopArtists(artists map[string]*ArtistData, limit int) []ArtistData {
	artistsSlice := make([]ArtistData, 0, len(artists))

	for name, data := range artists {
		if name == "" {
			continue
		}
		artistsSlice = append(artistsSlice, ArtistData{
			Artist: name,
			Count:  data.Count,
			Uri:    data.Uri,
		})
	}

	sort.Slice(artistsSlice, func(i, j int) bool {
		return artistsSlice[i].Count > artistsSlice[j].Count
	})

	if len(artistsSlice) > limit {
		return artistsSlice[:limit]
	}

	return artistsSlice
}

func getTopTracks(tracks map[string]*TrackData, limit int) []TrackData {
	tracksSlice := make([]TrackData, 0, len(tracks))

	for name, data := range tracks {
		if name == "" {
			continue
		}

		tracksSlice = append(tracksSlice, TrackData{
			Track:  name,
			Count:  data.Count,
			Uri:    data.Uri,
			Artist: data.Artist,
		})
	}

	sort.Slice(tracksSlice, func(i, j int) bool {
		return tracksSlice[i].Count > tracksSlice[j].Count
	})

	if len(tracksSlice) > limit {
		return tracksSlice[:limit]
	}

	return tracksSlice
}

func calculateListeningStats(simplifiedTracks []SimplifiedTrack, totalMs int) map[string]interface{} {
	hours := totalMs / (1000 * 60 * 60)
	minutes := (totalMs % (1000 * 60 * 60)) / (1000 * 60)

	artists := make(map[string]bool)
	tracks := make(map[string]bool)

	for _, track := range simplifiedTracks {
		if track.Artist != "" {
			artists[track.Artist] = true
		}
		if track.Track != "" {
			tracks[track.Track] = true
		}
	}

	var earliestTimestamp, latestTimestamp time.Time
	firstRun := true

	layout := "2006-01-02T15:04:05Z"
	for _, track := range simplifiedTracks {
		timestamp, err := time.Parse(layout, track.Ts)
		if err != nil {
			continue
		}

		if firstRun {
			earliestTimestamp = timestamp
			latestTimestamp = timestamp
			firstRun = false
		} else {
			if timestamp.Before(earliestTimestamp) {
				earliestTimestamp = timestamp
			}
			if timestamp.After(latestTimestamp) {
				latestTimestamp = timestamp
			}
		}
	}

	dateRange := latestTimestamp.Sub(earliestTimestamp)
	daysInRange := int(dateRange.Hours() / 24)

	var dailyAvgMinutes float64
	if daysInRange > 0 {
		dailyAvgMinutes = float64(totalMs) / float64(daysInRange) / (1000 * 60)
	}

	return map[string]interface{}{
		"total_listening_time": struct {
			Minutes int
			Hours   int
		}{
			Minutes: minutes,
			Hours:   hours,
		},
		"unique_tracks":       len(tracks),
		"unique_artists":      len(artists),
		"total_tracks_played": len(simplifiedTracks),
		"avg_daily_listening": dailyAvgMinutes,
		"listening_period": struct {
			earliestTime time.Time
			latestTime   time.Time
			daysInRange  float64
		}{
			earliestTime: earliestTimestamp,
			latestTime:   latestTimestamp,
			daysInRange:  float64(daysInRange),
		},
	}

}
