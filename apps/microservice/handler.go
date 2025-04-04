package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

func SendToBackend(payload *ProcessResult) error {

	appUrl := os.Getenv("MAIN_APP_URL")
	fmt.Printf("Sending data back to main app with the url of: %s", appUrl)

	url := fmt.Sprintf("%s/api/processors/%s/results", appUrl, payload.ProcessID)

	jsonData, err := json.Marshal(payload)
	if err != nil {
		fmt.Println("Error creating JSON payload:", err)
		return err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Println("Error creating HTTP request:", err)
		return err
	}

	authKey := os.Getenv("APP_AUTH_KEY")

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", authKey)

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

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

		fmt.Println("Request successful! Response:", string(body))
	} else {
		body, _ := io.ReadAll(resp.Body)
		fmt.Printf("Request failed with status %d: %s\n", resp.StatusCode, string(body))
	}

	return nil
}
