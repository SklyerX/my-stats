package main

import (
	"log"
	"os"
	"path/filepath"
	"sync"

	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type Job struct {
	S3Key     string
	ProcessID string
	UserID    string
}

type Queue struct {
	jobs       chan *Job
	wg         sync.WaitGroup
	workers    int
	s3Client   *s3.Client
	bucketName string
}

func NewJobQueue(workers int, s3Client *s3.Client, bucketName string) *Queue {
	return &Queue{
		jobs:       make(chan *Job, 100),
		workers:    workers,
		s3Client:   s3Client,
		bucketName: bucketName,
	}
}

func (q *Queue) Start() {
	for i := 0; i < q.workers; i++ {
		q.wg.Add(1)
		go q.worker(i)
	}

	log.Printf("Started %d workers", q.workers)
}

func (q *Queue) worker(id int) {
	defer q.wg.Done()

	log.Printf("Worker %d started", id)

	for job := range q.jobs {
		log.Printf("Worker %d processing job: %s", id, job.ProcessID)

		func(job *Job) {
			tempDir, err := os.MkdirTemp("", "listening-history-*")
			if err != nil {
				log.Printf("Failed to create temp directory: %v", err)
				return
			}

			defer os.RemoveAll(tempDir)

			zipPath := filepath.Join(tempDir, "archive.zip")
			err = DownloadFromS3(q.s3Client, q.bucketName, job.S3Key, zipPath)
			if err != nil {
				log.Printf("Failed to download file from S3: %v", err)
				return
			}

			log.Printf("Successfully downloaded file for job: %s", job.ProcessID)

			extractDir := filepath.Join(tempDir, "extracted")
			if err := os.Mkdir(extractDir, 0755); err != nil {
				log.Printf("Failed to create extraction directory: %v", err)
				return
			}

			jsonFilePaths, err := ExtractAndFindAudioHistoryFiles(zipPath, extractDir)
			if err != nil {
				log.Printf("Failed to extract or find JSON file: %v", err)
				return
			}

			log.Printf("Found JSON file at: %s", jsonFilePaths)

			result, err := ProcessListeningHistoryFiles(jsonFilePaths, job.ProcessID)
			if err != nil {
				log.Printf("Failed to process listening history: %v", err)
				return
			}

			err = SendToBackend(result)

			if err != nil {
				log.Printf("Something went wrong while sending results back to the backend")
				return
			}

			log.Fatalf("Result Timing Message: %s", result.TimeMessage)

			log.Printf("Worker %d completed job: %s", id, job.ProcessID)
		}(job)
	}
}

func (q *Queue) AddJob(job *Job) {
	q.jobs <- job
}
