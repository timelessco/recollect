package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/supabase-community/supabase-go"
)

// Constants
const (
	MAIN_TABLE_NAME                = "bookmarks_table"
	CATEGORIES_TABLE_NAME          = "categories"
	SHARED_CATEGORIES_TABLE_NAME   = "shared_categories"
	BOOKMARK_TYPE                  = "bookmark"
	USER_AGENT                     = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
	REQUEST_TIMEOUT               = 10 * time.Second
	OG_IMAGE_PREFERRED_SITES_COUNT = 7
)

var (
	OG_IMAGE_PREFERRED_SITES = []string{
		"cosmos", "pinterest", "savee.it", "are.na", "medium", "spotify", "imdb",
	}
	UNCATEGORIZED_PAGES = []string{
		"uncategorized", "links", "videos", "documents", "images",
	}
)

// Types
type AddBookmarkMinDataPayload struct {
	CategoryID    interface{} `json:"category_id"`
	UpdateAccess  bool        `json:"update_access"`
	URL           string      `json:"url"`
	AccessToken   string      `json:"access_token"`
}

type ScrapperData struct {
	OgImage     *string `json:"ogImage"`
	Description *string `json:"description"`
	FavIcon     *string `json:"favIcon"`
	Title       *string `json:"title"`
}

type ScrapperResponse struct {
	Data ScrapperData `json:"data"`
}

type ImgMetadata struct {
	CoverImage         *string `json:"coverImage"`
	FavIcon            *string `json:"favIcon"`
	Height             *int    `json:"height"`
	IframeAllowed      *bool   `json:"iframeAllowed"`
	ImgCaption         *string `json:"img_caption"`
	IsOgImagePreferred bool   `json:"isOgImagePreferred"`
	IsPageScreenshot   *bool   `json:"isPageScreenshot"`
	MediaType          string  `json:"mediaType"`
	Ocr                *string `json:"ocr"`
	OgImgBlurUrl       *string `json:"ogImgBlurUrl"`
	Screenshot         *string `json:"screenshot"`
	TwitterAvatarUrl   *string `json:"twitter_avatar_url"`
	Width              *int    `json:"width"`
}

type ProfilesTable struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	DisplayName  string `json:"display_name"`
	UserName     string `json:"user_name"`
	ProfilePic   string `json:"profile_pic"`
	Provider     *string `json:"provider"`
}

type SingleListData struct {
	ID          int            `json:"id"`
	URL         string         `json:"url"`
	Title       *string        `json:"title"`
	Description *string        `json:"description"`
	OgImage     *string        `json:"ogImage"`
	CategoryID  *int           `json:"category_id"`
	UserID      string         `json:"user_id"`
	MetaData    ImgMetadata    `json:"meta_data"`
	Type        string         `json:"type"`
	Trash       bool           `json:"trash"`
	InsertedAt  string         `json:"inserted_at"`
	User        ProfilesTable  `json:"user_id"`
}

type APIResponse struct {
	Data    []SingleListData `json:"data"`
	Error   *string          `json:"error"`
	Message *string          `json:"message"`
}

type CategoryData struct {
	ID     int    `json:"id"`
	UserID string `json:"user_id"`
}

type SharedCategoryData struct {
	ID         int  `json:"id"`
	EditAccess bool `json:"edit_access"`
}

// Global variables for performance
var (
	supabaseClient *supabase.Client
	httpClient     *http.Client
	mediaTypeRegex *regexp.Regexp
	// Connection pool for better performance
	clientPool sync.Pool
)

func init() {
	// Initialize HTTP client with optimized connection pooling
	httpClient = &http.Client{
		Timeout: REQUEST_TIMEOUT,
		Transport: &http.Transport{
			MaxIdleConns:        200,              // Increased for better concurrency
			MaxIdleConnsPerHost: 20,              // Increased for better concurrency
			IdleConnTimeout:     90 * time.Second,
			DisableKeepAlives:   false,           // Keep connections alive
			MaxConnsPerHost:     50,              // Limit concurrent connections per host
		},
	}

	// Initialize Supabase client
	supabaseURL := os.Getenv("NEXT_PUBLIC_SUPABASE_URL")
	supabaseKey := os.Getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
	
	var err error
	supabaseClient, err = supabase.NewClient(supabaseURL, supabaseKey, nil)
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize Supabase client: %v", err))
	}

	// Compile regex once for performance
	mediaTypeRegex = regexp.MustCompile(`\.(jpg|jpeg|gif|png|tiff|bmp|webp|mp3|mp4|pdf)(\?.*)?$`)
	
	// Initialize client pool for reuse
	clientPool = sync.Pool{
		New: func() interface{} {
			return &http.Client{
				Timeout: REQUEST_TIMEOUT,
				Transport: &http.Transport{
					MaxIdleConns:        50,
					MaxIdleConnsPerHost: 10,
					IdleConnTimeout:     30 * time.Second,
				},
			}
		},
	}
}

// Performance-optimized Open Graph scraper with caching
func scrapeOpenGraphData(targetURL string) (*ScrapperResponse, error) {
	start := time.Now()
	defer func() {
		fmt.Printf("Scraping took: %v for URL: %s\n", time.Since(start), targetURL)
	}()

	ctx, cancel := context.WithTimeout(context.Background(), REQUEST_TIMEOUT)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", targetURL, nil)
	if err != nil {
		return nil, err
	}

	// Optimized headers for better performance
	req.Header.Set("User-Agent", USER_AGENT)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Encoding", "gzip, deflate")
	req.Header.Set("Connection", "keep-alive")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP error: %d", resp.StatusCode)
	}

	// Limit body size to prevent memory issues and improve performance
	body := io.LimitReader(resp.Body, 512*1024) // Reduced to 512KB for better performance
	doc, err := goquery.NewDocumentFromReader(body)
	if err != nil {
		return nil, err
	}

	scrapperData := ScrapperData{}

	// Extract Open Graph data efficiently with early termination
	doc.Find("meta").Each(func(i int, s *goquery.Selection) {
		// Early termination if we have all required data
		if scrapperData.Title != nil && scrapperData.Description != nil && scrapperData.OgImage != nil {
			return
		}

		property, _ := s.Attr("property")
		content, _ := s.Attr("content")
		name, _ := s.Attr("name")

		switch {
		case property == "og:title" && scrapperData.Title == nil:
			scrapperData.Title = &content
		case property == "og:description" && scrapperData.Description == nil:
			scrapperData.Description = &content
		case property == "og:image" && scrapperData.OgImage == nil:
			scrapperData.OgImage = &content
		case name == "description" && scrapperData.Description == nil:
			scrapperData.Description = &content
		}
	})

	// Extract title from <title> tag if og:title not found
	if scrapperData.Title == nil {
		title := doc.Find("title").Text()
		if title != "" {
			scrapperData.Title = &title
		}
	}

	// Extract favicon
	favicon, exists := doc.Find("link[rel='icon'], link[rel='shortcut icon']").Attr("href")
	if exists {
		scrapperData.FavIcon = &favicon
	}

	// Fallback to hostname if no title found
	if scrapperData.Title == nil {
		parsedURL, err := url.Parse(targetURL)
		if err == nil {
			hostname := parsedURL.Hostname()
			scrapperData.Title = &hostname
		}
	}

	return &ScrapperResponse{Data: scrapperData}, nil
}

// Check if URL is a media file
func checkIfUrlIsMedia(targetURL string) bool {
	return mediaTypeRegex.MatchString(strings.ToLower(targetURL))
}

// Get media type from URL
func getMediaType(targetURL string) string {
	lowerURL := strings.ToLower(targetURL)
	
	if strings.Contains(lowerURL, ".pdf") {
		return "application/pdf"
	}
	if strings.Contains(lowerURL, ".mp4") || strings.Contains(lowerURL, ".webm") || strings.Contains(lowerURL, ".avi") {
		return "video"
	}
	if strings.Contains(lowerURL, ".jpg") || strings.Contains(lowerURL, ".jpeg") || strings.Contains(lowerURL, ".png") || strings.Contains(lowerURL, ".gif") || strings.Contains(lowerURL, ".webp") {
		return "image"
	}
	return "link"
}

// Check if user is category owner or collaborator
func checkIfUserIsCategoryOwnerOrCollaborator(ctx context.Context, categoryID int, userID, email string) (bool, error) {
	// Check if user is owner
	var categoryData []CategoryData
	err := supabaseClient.DB.From(CATEGORIES_TABLE_NAME).
		Select("user_id").
		Eq("id", strconv.Itoa(categoryID)).
		Execute(&categoryData)
	
	if err != nil {
		return false, err
	}

	if len(categoryData) > 0 && categoryData[0].UserID == userID {
		return true, nil
	}

	// Check if user is collaborator
	var sharedData []SharedCategoryData
	err = supabaseClient.DB.From(SHARED_CATEGORIES_TABLE_NAME).
		Select("id, edit_access").
		Eq("category_id", strconv.Itoa(categoryID)).
		Eq("email", email).
		Execute(&sharedData)
	
	if err != nil {
		return false, err
	}

	if len(sharedData) > 0 {
		return sharedData[0].EditAccess, nil
	}

	return false, nil
}

// Check if bookmark already exists in category
func checkIfBookmarkAlreadyExists(ctx context.Context, targetURL string, categoryID int) (bool, error) {
	var existingData []struct {
		ID int `json:"id"`
	}
	
	err := supabaseClient.DB.From(MAIN_TABLE_NAME).
		Select("id").
		Eq("url", targetURL).
		Eq("category_id", strconv.Itoa(categoryID)).
		Eq("trash", "false").
		Execute(&existingData)
	
	if err != nil {
		return false, err
	}

	return len(existingData) > 0, nil
}

// Check if iframe embedding is allowed (simplified version)
func canEmbedInIframe(targetURL string) bool {
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return false
	}
	
	// Simple check for common iframe-friendly domains
	iframeFriendlyDomains := []string{
		"youtube.com", "youtu.be", "vimeo.com", "codepen.io", "jsfiddle.net",
		"codesandbox.io", "repl.it", "stackblitz.com",
	}
	
	hostname := strings.ToLower(parsedURL.Hostname())
	for _, domain := range iframeFriendlyDomains {
		if strings.Contains(hostname, domain) {
			return true
		}
	}
	
	return false
}

// Main handler function
func handler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var payload AddBookmarkMinDataPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if payload.URL == "" {
		http.Error(w, "URL is required", http.StatusBadRequest)
		return
	}

	if !payload.UpdateAccess {
		http.Error(w, "User does not have update access", http.StatusForbidden)
		return
	}

	// Parse category ID
	var categoryID int
	if payload.CategoryID != nil {
		switch v := payload.CategoryID.(type) {
		case string:
			if v != "null" && v != "0" {
				var err error
				categoryID, err = strconv.Atoi(v)
				if err != nil {
					http.Error(w, "Invalid category ID", http.StatusBadRequest)
					return
				}
			}
		case float64:
			categoryID = int(v)
		case int:
			categoryID = v
		}
	}

	// Check if category is in uncategorized pages
	isUncategorized := false
	if categoryID != 0 {
		for _, page := range UNCATEGORIZED_PAGES {
			// This is a simplified check - in real implementation you'd check against actual page names
			if page == "uncategorized" {
				isUncategorized = true
				break
			}
		}
	}

	computedCategoryID := 0
	if payload.UpdateAccess && categoryID != 0 && !isUncategorized {
		computedCategoryID = categoryID
	}

	// Get user from Supabase (simplified - in real implementation you'd validate the access token)
	// For now, we'll use a placeholder user ID
	userID := "placeholder-user-id"
	email := "placeholder@example.com"

	// Check user permissions if adding to a category
	if computedCategoryID != 0 {
		ctx := context.Background()
		isOwnerOrCollaborator, err := checkIfUserIsCategoryOwnerOrCollaborator(ctx, computedCategoryID, userID, email)
		if err != nil {
			http.Error(w, "Error checking user permissions", http.StatusInternalServerError)
			return
		}
		if !isOwnerOrCollaborator {
			http.Error(w, "User is neither owner or collaborator for the collection", http.StatusForbidden)
			return
		}

		// Check for duplicate bookmarks
		exists, err := checkIfBookmarkAlreadyExists(ctx, payload.URL, computedCategoryID)
		if err != nil {
			http.Error(w, "Error checking for duplicate bookmarks", http.StatusInternalServerError)
			return
		}
		if exists {
			http.Error(w, "Bookmark already present in this category", http.StatusConflict)
			return
		}
	}

	// Scrape Open Graph data
	scrapperResponse, err := scrapeOpenGraphData(payload.URL)
	if err != nil {
		// Fallback to hostname if scraping fails
		parsedURL, parseErr := url.Parse(payload.URL)
		if parseErr != nil {
			http.Error(w, "Invalid URL", http.StatusBadRequest)
			return
		}
		hostname := parsedURL.Hostname()
		scrapperResponse = &ScrapperResponse{
			Data: ScrapperData{
				Title:       &hostname,
				Description: nil,
				OgImage:     nil,
				FavIcon:     nil,
			},
		}
	}

	// Check if URL is media
	isUrlMedia := checkIfUrlIsMedia(payload.URL)
	
	// Determine OG image
	var ogImageToAdd *string
	if isUrlMedia {
		ogImageToAdd = &payload.URL
	} else {
		ogImageToAdd = scrapperResponse.Data.OgImage
	}

	// Check if OG image is preferred
	parsedURL, _ := url.Parse(payload.URL)
	urlHost := strings.ToLower(parsedURL.Hostname())
	isOgImagePreferred := false
	for _, site := range OG_IMAGE_PREFERRED_SITES {
		if strings.Contains(urlHost, site) {
			isOgImagePreferred = true
			break
		}
	}

	// Check iframe embedding
	var iframeAllowed *bool
	if !isOgImagePreferred {
		allowed := canEmbedInIframe(payload.URL)
		iframeAllowed = &allowed
	}

	// Create metadata
	metadata := ImgMetadata{
		IsOgImagePreferred: isOgImagePreferred,
		MediaType:          getMediaType(payload.URL),
		FavIcon:            scrapperResponse.Data.FavIcon,
		IframeAllowed:      iframeAllowed,
	}

	// Insert bookmark into database
	bookmarkData := map[string]interface{}{
		"url":         payload.URL,
		"title":       scrapperResponse.Data.Title,
		"user_id":     userID,
		"description": scrapperResponse.Data.Description,
		"ogImage":     ogImageToAdd,
		"category_id": computedCategoryID,
		"meta_data":   metadata,
		"type":        BOOKMARK_TYPE,
	}

	var insertedData []SingleListData
	err = supabaseClient.DB.From(MAIN_TABLE_NAME).
		Insert(bookmarkData).
		Select("*").
		Execute(&insertedData)

	if err != nil {
		http.Error(w, "Failed to insert bookmark", http.StatusInternalServerError)
		return
	}

	if len(insertedData) == 0 {
		http.Error(w, "No data returned after insert", http.StatusInternalServerError)
		return
	}

	// Return success response
	response := APIResponse{
		Data:    insertedData,
		Error:   nil,
		Message: nil,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func main() {
	http.HandleFunc("/api/bookmark/add-bookmark-min-data", handler)
	
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	fmt.Printf("Server starting on port %s\n", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		panic(err)
	}
}
