package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type TestPayload struct {
	URL           string      `json:"url"`
	CategoryID    interface{} `json:"category_id"`
	UpdateAccess  bool        `json:"update_access"`
	AccessToken   string      `json:"access_token"`
}

type PerformanceResult struct {
	URL           string        `json:"url"`
	ResponseTime  time.Duration `json:"response_time"`
	StatusCode    int           `json:"status_code"`
	Success       bool          `json:"success"`
	Error         string        `json:"error,omitempty"`
}

func testAPI(endpoint string, payload TestPayload) PerformanceResult {
	start := time.Now()
	
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return PerformanceResult{
			URL:          payload.URL,
			ResponseTime: time.Since(start),
			Success:      false,
			Error:        fmt.Sprintf("JSON marshal error: %v", err),
		}
	}

	resp, err := http.Post(endpoint, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return PerformanceResult{
			URL:          payload.URL,
			ResponseTime: time.Since(start),
			Success:      false,
			Error:        fmt.Sprintf("HTTP error: %v", err),
		}
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	
	return PerformanceResult{
		URL:          payload.URL,
		ResponseTime: time.Since(start),
		StatusCode:   resp.StatusCode,
		Success:      resp.StatusCode >= 200 && resp.StatusCode < 300,
		Error:        string(body),
	}
}

func main() {
	// Test URLs
	testURLs := []string{
		"https://github.com",
		"https://stackoverflow.com",
		"https://medium.com",
		"https://dev.to",
		"https://www.youtube.com",
	}

	// API endpoints
	typescriptEndpoint := "http://localhost:3000/api/bookmark/add-bookmark-min-data"
	goEndpoint := "https://recollect-go-api.vercel.app/api/bookmark/add-bookmark-min-data"

	fmt.Println("🚀 Starting Performance Test...")
	fmt.Println("=" * 50)

	// Test TypeScript version
	fmt.Println("📊 Testing TypeScript Version...")
	tsResults := []PerformanceResult{}
	
	for _, testURL := range testURLs {
		payload := TestPayload{
			URL:          testURL,
			CategoryID:   nil,
			UpdateAccess: true,
			AccessToken:  "test-token",
		}
		
		result := testAPI(typescriptEndpoint, payload)
		tsResults = append(tsResults, result)
		
		fmt.Printf("URL: %s | Time: %v | Status: %d | Success: %t\n", 
			result.URL, result.ResponseTime, result.StatusCode, result.Success)
		
		time.Sleep(1 * time.Second) // Rate limiting
	}

	// Test Go version
	fmt.Println("\n📊 Testing Go Version...")
	goResults := []PerformanceResult{}
	
	for _, testURL := range testURLs {
		payload := TestPayload{
			URL:          testURL,
			CategoryID:   nil,
			UpdateAccess: true,
			AccessToken:  "test-token",
		}
		
		result := testAPI(goEndpoint, payload)
		goResults = append(goResults, result)
		
		fmt.Printf("URL: %s | Time: %v | Status: %d | Success: %t\n", 
			result.URL, result.ResponseTime, result.StatusCode, result.Success)
		
		time.Sleep(1 * time.Second) // Rate limiting
	}

	// Calculate averages
	var tsTotalTime, goTotalTime time.Duration
	var tsSuccessCount, goSuccessCount int

	for _, result := range tsResults {
		tsTotalTime += result.ResponseTime
		if result.Success {
			tsSuccessCount++
		}
	}

	for _, result := range goResults {
		goTotalTime += result.ResponseTime
		if result.Success {
			goSuccessCount++
		}
	}

	tsAvgTime := tsTotalTime / time.Duration(len(tsResults))
	goAvgTime := goTotalTime / time.Duration(len(goResults))

	// Results
	fmt.Println("\n" + "=" * 50)
	fmt.Println("📈 PERFORMANCE COMPARISON RESULTS")
	fmt.Println("=" * 50)
	
	fmt.Printf("TypeScript Version:\n")
	fmt.Printf("  Average Response Time: %v\n", tsAvgTime)
	fmt.Printf("  Success Rate: %d/%d (%.1f%%)\n", tsSuccessCount, len(tsResults), float64(tsSuccessCount)/float64(len(tsResults))*100)
	
	fmt.Printf("\nGo Version:\n")
	fmt.Printf("  Average Response Time: %v\n", goAvgTime)
	fmt.Printf("  Success Rate: %d/%d (%.1f%%)\n", goSuccessCount, len(goResults), float64(goSuccessCount)/float64(len(goResults))*100)
	
	fmt.Printf("\n🏆 PERFORMANCE WINNER:\n")
	if goAvgTime < tsAvgTime {
		improvement := float64(tsAvgTime-goAvgTime) / float64(tsAvgTime) * 100
		fmt.Printf("  Go is %.1f%% faster than TypeScript!\n", improvement)
	} else {
		improvement := float64(goAvgTime-tsAvgTime) / float64(goAvgTime) * 100
		fmt.Printf("  TypeScript is %.1f%% faster than Go!\n", improvement)
	}
}
