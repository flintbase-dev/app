package controller

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/internal/testdb"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type tokenAPIResponse struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}

type tokenPageResponse struct {
	Items []tokenResponseItem `json:"items"`
}

type tokenResponseItem struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Key    string `json:"key"`
	Status int    `json:"status"`
}

func openTokenControllerTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	gin.SetMode(gin.TestMode)
	common.RedisEnabled = false

	db := testdb.OpenAndReset(t)
	model.DB = db
	model.LOG_DB = db

	return db
}

func initTokenControllerTestDB(t *testing.T, db *gorm.DB) {
	t.Helper()
}

func setupTokenControllerTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db := openTokenControllerTestDB(t)
	initTokenControllerTestDB(t, db)
	return db
}

func seedToken(t *testing.T, db *gorm.DB, userID string, name string, rawKey string) *model.Token {
	t.Helper()

	token := &model.Token{
		UserId:         userID,
		Name:           name,
		Status:         common.TokenStatusEnabled,
		CreatedTime:    1,
		AccessedTime:   1,
		ExpiredTime:    -1,
		RemainQuota:    100,
		UnlimitedQuota: true,
		Group:          "default",
	}
	token.SetAPIKey(rawKey)
	if err := db.Create(token).Error; err != nil {
		t.Fatalf("failed to create token: %v", err)
	}
	return token
}

func newAuthenticatedContext(t *testing.T, method string, target string, body any, userID string) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()

	var requestBody *bytes.Reader
	if body != nil {
		payload, err := common.Marshal(body)
		if err != nil {
			t.Fatalf("failed to marshal request body: %v", err)
		}
		requestBody = bytes.NewReader(payload)
	} else {
		requestBody = bytes.NewReader(nil)
	}

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(method, target, requestBody)
	if body != nil {
		ctx.Request.Header.Set("Content-Type", "application/json")
	}
	ctx.Set("id", userID)
	return ctx, recorder
}

func decodeAPIResponse(t *testing.T, recorder *httptest.ResponseRecorder) tokenAPIResponse {
	t.Helper()

	var response tokenAPIResponse
	if err := common.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to decode api response: %v", err)
	}
	return response
}

func TestGetAllTokensMasksKeyInResponse(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	token := seedToken(t, db, "usr_TokenTest01", "list-token", "abcd1234efgh5678")
	seedToken(t, db, "usr_TokenTest02", "other-user-token", "zzzz1234yyyy5678")

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/token/?p=1&size=10", nil, "usr_TokenTest01")
	GetAllTokens(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected success response, got message: %s", response.Message)
	}

	var page tokenPageResponse
	if err := common.Unmarshal(response.Data, &page); err != nil {
		t.Fatalf("failed to decode token page response: %v", err)
	}
	if len(page.Items) != 1 {
		t.Fatalf("expected exactly one token, got %d", len(page.Items))
	}
	if page.Items[0].Key != token.GetMaskedKey() {
		t.Fatalf("expected masked key %q, got %q", token.GetMaskedKey(), page.Items[0].Key)
	}
	if strings.Contains(recorder.Body.String(), token.Key) {
		t.Fatalf("list response leaked raw token key: %s", recorder.Body.String())
	}
}

func TestSearchTokensMasksKeyInResponse(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	token := seedToken(t, db, "usr_TokenTest01", "searchable-token", "ijkl1234mnop5678")

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/token/search?keyword=searchable-token&p=1&size=10", nil, "usr_TokenTest01")
	SearchTokens(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected success response, got message: %s", response.Message)
	}

	var page tokenPageResponse
	if err := common.Unmarshal(response.Data, &page); err != nil {
		t.Fatalf("failed to decode search response: %v", err)
	}
	if len(page.Items) != 1 {
		t.Fatalf("expected exactly one search result, got %d", len(page.Items))
	}
	if page.Items[0].Key != token.GetMaskedKey() {
		t.Fatalf("expected masked search key %q, got %q", token.GetMaskedKey(), page.Items[0].Key)
	}
	if strings.Contains(recorder.Body.String(), token.Key) {
		t.Fatalf("search response leaked raw token key: %s", recorder.Body.String())
	}
}

func TestGetTokenMasksKeyInResponse(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	token := seedToken(t, db, "usr_TokenTest01", "detail-token", "qrst1234uvwx5678")

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/token/"+token.Id, nil, "usr_TokenTest01")
	ctx.Params = gin.Params{{Key: "id", Value: token.Id}}
	GetToken(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected success response, got message: %s", response.Message)
	}

	var detail tokenResponseItem
	if err := common.Unmarshal(response.Data, &detail); err != nil {
		t.Fatalf("failed to decode token detail response: %v", err)
	}
	if detail.Key != token.GetMaskedKey() {
		t.Fatalf("expected masked detail key %q, got %q", token.GetMaskedKey(), detail.Key)
	}
	if strings.Contains(recorder.Body.String(), token.Key) {
		t.Fatalf("detail response leaked raw token key: %s", recorder.Body.String())
	}
}

func TestUpdateTokenMasksKeyInResponse(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	token := seedToken(t, db, "usr_TokenTest01", "editable-token", "yzab1234cdef5678")

	body := map[string]any{
		"id":                token.Id,
		"name":              "updated-token",
		"expired_time":      -1,
		"remain_quota":      100,
		"unlimited_quota":   true,
		"group":             "default",
		"cross_group_retry": false,
	}

	ctx, recorder := newAuthenticatedContext(t, http.MethodPut, "/api/token/", body, "usr_TokenTest01")
	UpdateToken(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected success response, got message: %s", response.Message)
	}

	var detail tokenResponseItem
	if err := common.Unmarshal(response.Data, &detail); err != nil {
		t.Fatalf("failed to decode token update response: %v", err)
	}
	if detail.Key != token.GetMaskedKey() {
		t.Fatalf("expected masked update key %q, got %q", token.GetMaskedKey(), detail.Key)
	}
	if strings.Contains(recorder.Body.String(), token.Key) {
		t.Fatalf("update response leaked raw token key: %s", recorder.Body.String())
	}
}

func TestAddTokenReturnsFullAPIKeyOnceAndStoresOnlyHash(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	body := map[string]any{
		"name":              "created-api-key",
		"expired_time":      -1,
		"remain_quota":      100,
		"unlimited_quota":   true,
		"group":             "default",
		"cross_group_retry": false,
	}

	ctx, recorder := newAuthenticatedContext(t, http.MethodPost, "/api/token/", body, "usr_TokenTest01")
	AddToken(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected create to succeed, got message: %s", response.Message)
	}
	var data struct {
		APIKey string            `json:"api_key"`
		Item   tokenResponseItem `json:"item"`
	}
	if err := common.Unmarshal(response.Data, &data); err != nil {
		t.Fatalf("failed to decode create response: %v", err)
	}
	if !common.IsAPIKey(data.APIKey) {
		t.Fatalf("created API key has invalid format: %q", data.APIKey)
	}
	if data.Item.Key != common.MaskAPIKey(data.APIKey) {
		t.Fatalf("created item key = %q, want %q", data.Item.Key, common.MaskAPIKey(data.APIKey))
	}

	var stored model.Token
	if err := db.First(&stored, "id = ?", data.Item.ID).Error; err != nil {
		t.Fatalf("failed to load stored token: %v", err)
	}
	if stored.APIKeyHash == "" {
		t.Fatal("stored API key hash is empty")
	}
	if stored.APIKeyHash != common.APIKeyHash(data.APIKey) {
		t.Fatal("stored API key hash does not match created key")
	}
	if stored.Key != "" {
		t.Fatalf("raw API key should not be stored, got %q", stored.Key)
	}
}
