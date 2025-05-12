package main

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type RequestBody struct {
	Success    bool   `json:"success"`
	UploadSize int    `json:"upload_size"`
	S3Key      string `json:"s3_key"`
}

func SendToBackend(s3Client *s3.Client, bucketName string, payload *ProcessResult) error {

	appUrl := os.Getenv("MAIN_APP_URL")

	url := fmt.Sprintf("%s/api/processors/%s/results", appUrl, payload.ProcessID)

	fmt.Println("APP URL:", url)

	compressedData, err := compressJson(payload)
	if err != nil {
		fmt.Printf("Failed to compress json. Error %v", err)
	}

	s3Key := fmt.Sprintf("data-transfers/%s.json.gz", payload.ProcessID)

	uploadInput := &s3.PutObjectInput{
		Bucket:      aws.String(bucketName),
		Key:         aws.String(s3Key),
		Body:        bytes.NewReader(compressedData),
		ContentType: aws.String("application/gzip"),
		Metadata: map[string]string{
			"created-at":   time.Now().Format(time.RFC3339),
			"content-type": "spotify-data",
		},
	}

	_, err = s3Client.PutObject(context.TODO(), uploadInput)
	if err != nil {
		return fmt.Errorf("error uploading to S3: %w", err)
	}

	requestBody := RequestBody{
		Success:    true,
		UploadSize: len(compressedData),
		S3Key:      s3Key,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return fmt.Errorf("Could not marshal json data: %w", err)
	}

	client := &http.Client{
		Timeout: 20 * time.Second,
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("Error creating request: %v", err)
	}

	authKey := os.Getenv("APP_AUTH_KEY")

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", authKey)

	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error sending HTTP request:", err)
		return err
	}

	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		body, err := io.ReadAll(resp.Body)

		if err != nil {
			fmt.Println("Error reading response:", err)
			return err
		}

		fmt.Printf("Request successful! Status: %d, Response length: %d bytes\n", resp.StatusCode, len(body))
	} else {
		body, _ := io.ReadAll(resp.Body)
		fmt.Printf("Request failed with status %d: %s\n", resp.StatusCode, string(body))
	}

	return nil
}

func compressJson(data interface{}) ([]byte, error) {
	jsonData, err := json.Marshal(data)

	if err != nil {
		return nil, fmt.Errorf("error marshaling JSON: %w", err)

	}

	var compressedBuffer bytes.Buffer

	gzipWriter := gzip.NewWriter(&compressedBuffer)

	_, err = gzipWriter.Write(jsonData)
	if err != nil {
		return nil, fmt.Errorf("error writing to gzip writer: %w", err)
	}

	if err := gzipWriter.Close(); err != nil {
		return nil, fmt.Errorf("error closing gzip writer: %w", err)
	}

	return compressedBuffer.Bytes(), nil
}
