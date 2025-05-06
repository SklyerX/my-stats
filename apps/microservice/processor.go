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

type TimesOfDay struct {
	Count int `json:"count"`
	Hour  int `json:"hour"`
}

type DateCount struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type HeatmapData struct {
	DailyCounts []DateCount `json:"dailyCounts"`
	Years       []int       `json:"years"`
	MaxCount    int         `json:"maxCount"`
}

type WeekdayAnalysis struct {
	DayCountMap   map[time.Weekday]int `json:"dayCountMap"`   // Count by day name for visualization
	WeekdayAvg    int                  `json:"weekdayAvg"`    // Average for Mon-Fri
	WeekendAvg    int                  `json:"weekendAvg"`    // Average for Sat-Sun
	MostActiveDay string               `json:"mostActiveDay"` // Day with most activity
}

type ArtistMinutes struct {
	Name string `json:"name"`
	Ms   int    `json:"ms"`
	Uri  string `json:"uri"`
}

type AlbumPlays struct {
	Name     string `json:"name"`
	Count    int    `json:"count"`
	TrackURI string `json:"track_uri"`
}

type AggregatedData struct {
	ArtistPlays         []ArtistData    `json:"artist_plays"`
	ArtistMinutes       []ArtistMinutes `json:"artist_minutes"`
	GlobalUniqueArtists int             `json:"global_unique_artists"`
	GlobalUniqueTracks  int             `json:"global_unique_tracks"`
	AlbumPlays          []AlbumPlays    `json:"album_plays"`
	TrackPlays          []TrackData     `json:"track_plays"`
}

type ProcessResult struct {
	ProcessID       string                 `json:"processId"`
	TotalMs         int                    `json:"totalMs"`
	TopArtists      []ArtistData           `json:"topArtists"`
	TopTracks       []TrackData            `json:"topTracks"`
	TimeMessage     string                 `json:"timeMessage"`
	UniqueArtists   int                    `json:"uniqueArtists"`
	UniqueTracks    int                    `json:"uniqueTracks"`
	TotalTracks     int                    `json:"totalTracks"`
	ListeningTime   ListeningTime          `json:"listeningTime"`
	PeakHour        int                    `json:"peakHour"`
	TimesOfDay      []TimesOfDay           `json:"times_of_day"`
	TravelerMessage string                 `json:"traveler_message"`
	Heatmap         HeatmapData            `json:"heatmap"`
	WeekdayAnalysis WeekdayAnalysis        `json:"weekday_analysis"`
	LongestSession  map[string]interface{} `json:"longest_session"`
	AggregatedData  AggregatedData         `json:"aggregated_data"`
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

	artistsPlaysMap := make(map[string]ArtistData)
	artistsMinutesMap := make(map[string]ArtistMinutes)
	albumPlaysMap := make(map[string]AlbumPlays)
	trackPlaysMap := make(map[string]TrackData)

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
			&artistsPlaysMap,
			&artistsMinutesMap,
			&albumPlaysMap,
			&trackPlaysMap,
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

	stats := listening_stats["total_listening_time"].(struct {
		Minutes int
		Hours   int
	})

	timesOfDay := make([]TimesOfDay, 0, len(timeOfDayMap))

	for hour, count := range timeOfDayMap {
		timesOfDay = append(timesOfDay, TimesOfDay{
			Count: count,
			Hour:  hour,
		})
	}

	var travelerMessage string

	if len(countryCodes) > 1 {
		travelerMessage = fmt.Sprintf("Your music has traveled %d countries with you!", len(countryCodes))
	}

	heatmapData := processHeatmapData(simplifiedTracks)
	weekdayAnalysis := getWeekdayAnalysis(simplifiedTracks)
	longestSession := getLongestSession(simplifiedTracks)

	artistPlays := make([]ArtistData, 0, len(artistsPlaysMap))
	for _, v := range artistsPlaysMap {
		if v.Count >= 10 {
			artistPlays = append(artistPlays, v)
		}
	}

	artistMinutes := make([]ArtistMinutes, 0, len(artistsMinutesMap))
	for _, v := range artistsMinutesMap {
		if v.Ms >= 1000 {
			artistMinutes = append(artistMinutes, v)
		}
	}

	albumPlays := make([]AlbumPlays, 0, len(albumPlaysMap))
	for _, v := range albumPlaysMap {
		if v.Count >= 10 {
			albumPlays = append(albumPlays, v)
		}
	}

	trackPlays := make([]TrackData, 0, len(trackPlaysMap))
	for _, v := range trackPlaysMap {
		if v.Count >= 10 {
			trackPlays = append(trackPlays, v)
		}
	}

	sort.Slice(artistPlays, func(i, j int) bool {
		return artistPlays[i].Count > artistPlays[j].Count
	})

	sort.Slice(artistMinutes, func(i, j int) bool {
		return artistMinutes[i].Ms > artistMinutes[j].Ms
	})

	sort.Slice(albumPlays, func(i, j int) bool {
		return albumPlays[i].Count > albumPlays[j].Count
	})

	sort.Slice(trackPlays, func(i, j int) bool {
		return trackPlays[i].Count > trackPlays[j].Count
	})

	result := &ProcessResult{
		ProcessID:       processId,
		TotalMs:         totalMs,
		TopArtists:      topArtists[:min(10, len(topArtists))],
		TopTracks:       topTracks[:min(25, len(topTracks))],
		TimeMessage:     timeMessage,
		PeakHour:        peakHour,
		UniqueArtists:   listening_stats["unique_artists"].(int),
		UniqueTracks:    listening_stats["unique_tracks"].(int),
		TotalTracks:     listening_stats["total_tracks_played"].(int),
		TimesOfDay:      timesOfDay,
		TravelerMessage: travelerMessage,
		Heatmap:         heatmapData,
		WeekdayAnalysis: weekdayAnalysis,
		LongestSession:  longestSession,
		ListeningTime: ListeningTime{
			Hours:   stats.Hours,
			Minutes: stats.Minutes,
		},
		AggregatedData: AggregatedData{
			ArtistPlays:   artistPlays,
			ArtistMinutes: artistMinutes,
			AlbumPlays:    albumPlays,
			TrackPlays:    trackPlays,
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

func worker(entries []Track, wg *sync.WaitGroup, mutex *sync.Mutex, totalMs *int, timeOfDay *map[int]int, simplifiedTracks *[]SimplifiedTrack, artists *map[string]*ArtistData, tracks *map[string]*TrackData, countryCodes, platforms *map[string]int,
	artistsPlaysMap *map[string]ArtistData,
	artistsMinutesMap *map[string]ArtistMinutes,
	albumPlaysMap *map[string]AlbumPlays,
	trackPlaysMap *map[string]TrackData) {

	defer wg.Done()

	localTotalMs := 0
	localArtistsMap := make(map[string]*ArtistData)
	localTracksMap := make(map[string]*TrackData)
	localCountryCodes := make(map[string]int)
	localTimeOfDayForTracksMap := make(map[int]int)
	localPlatformMap := make(map[string]int)

	localArtistsPlaysMap := make(map[string]ArtistData)
	localArtistsMinutesMap := make(map[string]ArtistMinutes)
	localAlbumPlaysMap := make(map[string]AlbumPlays)
	localTrackPlaysMap := make(map[string]TrackData)

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

		artistData := localArtistsPlaysMap[artistName]
		artistData.Count++
		artistData.Artist = artistName
		artistData.Uri = track.SpotifyTrackUri
		localArtistsPlaysMap[artistName] = artistData

		artistMinutes := localArtistsMinutesMap[artistName]
		artistMinutes.Name = artistName
		artistMinutes.Ms += track.MsPlayed
		artistMinutes.Uri = track.SpotifyTrackUri
		localArtistsMinutesMap[artistName] = artistMinutes

		albumName := track.MasterMetadataAlbumAlbumName
		albumData := localAlbumPlaysMap[albumName]
		albumData.Name = albumName
		albumData.Count++
		albumData.TrackURI = track.SpotifyTrackUri
		localAlbumPlaysMap[albumName] = albumData

		trackData := localTrackPlaysMap[trackName]
		trackData.Count++
		trackData.Track = trackName
		trackData.Uri = track.SpotifyTrackUri
		trackData.Artist = artistName
		localTrackPlaysMap[trackName] = trackData
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

	for artistName, data := range localArtistsPlaysMap {
		globalData := (*artistsPlaysMap)[artistName]
		globalData.Count += data.Count
		globalData.Artist = data.Artist
		globalData.Uri = data.Uri
		(*artistsPlaysMap)[artistName] = globalData
	}

	for artistName, data := range localArtistsMinutesMap {
		globalData := (*artistsMinutesMap)[artistName]
		globalData.Name = data.Name
		globalData.Ms += data.Ms
		globalData.Uri = data.Uri
		(*artistsMinutesMap)[artistName] = globalData
	}

	for albumName, data := range localAlbumPlaysMap {
		globalData := (*albumPlaysMap)[albumName]
		globalData.Name = data.Name
		globalData.Count += data.Count
		globalData.TrackURI = data.TrackURI
		(*albumPlaysMap)[albumName] = globalData
	}

	for trackName, data := range localTrackPlaysMap {
		globalData := (*trackPlaysMap)[trackName]
		globalData.Count += data.Count
		globalData.Track = data.Track
		globalData.Uri = data.Uri
		globalData.Artist = data.Artist
		(*trackPlaysMap)[trackName] = globalData
	}

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

func processHeatmapData(simplifiedTrack []SimplifiedTrack) HeatmapData {
	dateCountMap := make(map[string]int)
	yearSet := make(map[int]bool)

	for _, track := range simplifiedTrack {
		datePart := track.Ts[:10]

		dateCountMap[datePart]++

		year, _ := time.Parse("2006-01-02", datePart)
		yearSet[year.Year()] = true
	}

	var dailyCounts []DateCount
	for date, count := range dateCountMap {
		dailyCounts = append(dailyCounts, DateCount{
			Date:  date,
			Count: count,
		})
	}

	sort.Slice(dailyCounts, func(i, j int) bool {
		return dailyCounts[i].Date < dailyCounts[j].Date
	})

	var years []int
	for year := range yearSet {
		years = append(years, year)
	}
	sort.Ints(years)

	maxCount := 0
	for _, count := range dateCountMap {
		if count > maxCount {
			maxCount = count
		}
	}

	return HeatmapData{
		DailyCounts: dailyCounts,
		Years:       years,
		MaxCount:    maxCount,
	}
}

type Days struct {
	Count int          `json:"count"`
	Day   time.Weekday `json:"day"`
}

func getWeekdayAnalysis(simplifiedTracks []SimplifiedTrack) WeekdayAnalysis {
	daysMap := make(map[time.Weekday]int)

	for _, track := range simplifiedTracks {
		datePart := track.Ts[:10]

		day, err := time.Parse("2006-01-02", datePart)

		if err != nil {
			continue
		}

		daysMap[day.Weekday()]++
	}

	weekends := make([]Days, 0)
	weekdays := make([]Days, 0)

	for day, count := range daysMap {
		if day == time.Sunday || day == time.Saturday {
			weekends = append(weekends, Days{
				Count: count,
				Day:   day,
			})
		} else {
			weekdays = append(weekdays, Days{
				Count: count,
				Day:   day,
			})
		}
	}

	var weekdayTotal, weekendTotal int
	for _, day := range weekdays {
		weekdayTotal += day.Count
	}
	for _, day := range weekends {
		weekendTotal += day.Count
	}

	weekdayAvg := 0
	if len(weekdays) > 0 {
		weekdayAvg = weekdayTotal / len(weekdays)
	}

	weekendAvg := 0
	if len(weekends) > 0 {
		weekendAvg = weekendTotal / len(weekends)
	}

	// Find most active day
	var mostActiveDay time.Weekday
	var mostActiveCount int

	for day, count := range daysMap {
		if count > mostActiveCount {
			mostActiveCount = count
			mostActiveDay = day
		}
	}

	return WeekdayAnalysis{
		DayCountMap:   daysMap,
		WeekdayAvg:    weekdayAvg,
		WeekendAvg:    weekendAvg,
		MostActiveDay: mostActiveDay.String(),
	}
}

func getLongestSession(simplifiedTracks []SimplifiedTrack) map[string]interface{} {
	var currentSessionStart,
		currentSessionEnd,
		longestSessionStart,
		longestSessionEnd,
		previousTimestamp time.Time

	var currentSessionDuration,
		longestSessionDuration time.Duration

	totalSessions := 0

	currentArtistsMap := make(map[string]int)
	currentTracksMap := make(map[string]int)

	longestArtistsMap := make(map[string]int)
	longestTracksMap := make(map[string]int)

	sort.Slice(simplifiedTracks, func(i, j int) bool {
		return simplifiedTracks[i].Ts < simplifiedTracks[j].Ts
	})

	layout := "2006-01-02T15:04:05Z"

	for index, track := range simplifiedTracks {
		currentDate, err := time.Parse(layout, track.Ts)

		if err != nil {
			fmt.Printf("Could not parse time for track at index: %d", index)
			continue
		}

		if index == 0 {
			currentSessionStart = currentDate
			previousTimestamp = currentDate
			totalSessions = 1

			currentArtistsMap[track.Artist]++
			currentTracksMap[track.Track]++

			continue
		}

		diff := currentDate.Sub(previousTimestamp)
		gap := diff.Minutes()

		if gap >= 60 {
			currentSessionEnd = previousTimestamp
			currentSessionDuration = time.Duration(currentSessionEnd.Sub(currentSessionStart))

			if currentSessionDuration > longestSessionDuration {
				longestSessionDuration = currentSessionDuration
				longestSessionStart = currentSessionStart
				longestSessionEnd = currentSessionEnd

				longestArtistsMap = make(map[string]int)
				longestTracksMap = make(map[string]int)

				// Copy current session data to longest
				for k, v := range currentArtistsMap {
					longestArtistsMap[k] = v
				}
				for k, v := range currentTracksMap {
					longestTracksMap[k] = v
				}
			}

			currentSessionStart = currentDate
			totalSessions++

			currentArtistsMap = make(map[string]int)
			currentTracksMap = make(map[string]int)

			currentArtistsMap[track.Artist]++
			currentTracksMap[track.Track]++
		} else {
			currentArtistsMap[track.Artist]++
			currentTracksMap[track.Track]++
		}

		previousTimestamp = currentDate
	}

	currentSessionEnd = previousTimestamp
	currentSessionDuration = currentSessionEnd.Sub(currentSessionStart)

	if currentSessionDuration > longestSessionDuration {
		longestSessionStart = currentSessionStart
		longestSessionEnd = currentSessionEnd
		longestSessionDuration = currentSessionDuration

		longestArtistsMap = currentArtistsMap
		longestTracksMap = currentTracksMap
	}

	return map[string]interface{}{
		"sessionStart":    longestSessionStart,
		"sessionEnd":      longestSessionEnd,
		"duration":        longestSessionDuration,
		"durationMinutes": longestSessionDuration.Minutes(),
		"totalSessions":   totalSessions,
		"session_insights": struct {
			TotalTracks   int `json:"total_tracks"`
			UniqueTracks  int `json:"unique_tracks"`
			TotalArtists  int `json:"total_artists"`
			UniqueArtists int `json:"unique_artists"`
		}{
			TotalTracks:   sumValues(longestTracksMap),
			UniqueTracks:  len(longestTracksMap),
			TotalArtists:  sumValues(longestArtistsMap),
			UniqueArtists: len(longestArtistsMap),
		},
	}
}

func sumValues(m map[string]int) int {
	sum := 0
	for _, v := range m {
		sum += v
	}
	return sum
}
