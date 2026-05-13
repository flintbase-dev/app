package router

import (
	"compress/gzip"
	"embed"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

//go:embed testdata/classic/dist
var testClassicFS embed.FS

//go:embed testdata/classic/dist/index.html
var testClassicIndex []byte

func TestWebRouterDefaultsToNewFrontend(t *testing.T) {
	gin.SetMode(gin.TestMode)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("new:" + r.URL.Path))
	}))
	defer upstream.Close()

	router := gin.New()
	SetWebRouter(router, WebAssets{
		ClassicBuildFS:   testClassicFS,
		ClassicIndexPage: testClassicIndex,
		NewFrontendURL:   upstream.URL,
	})
	server := httptest.NewServer(router)
	defer server.Close()

	response, body := getTestServerPath(t, server.URL, "/console", nil)

	require.Equal(t, http.StatusOK, response.StatusCode)
	require.Equal(t, "new:/console", body)
}

func TestWebRouterServesAdminOnlyRoutesFromClassic(t *testing.T) {
	gin.SetMode(gin.TestMode)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("new:" + r.URL.Path))
	}))
	defer upstream.Close()

	router := gin.New()
	SetWebRouter(router, WebAssets{
		ClassicBuildFS:   testClassicFS,
		ClassicIndexPage: testClassicIndex,
		NewFrontendURL:   upstream.URL,
	})

	for _, path := range []string{
		"/console/channel",
		"/console/models",
		"/console/redemption",
		"/console/user",
		"/console/subscription",
		"/console/message-management",
		"/console/setting",
		"/console/channel/edit",
	} {
		recorder := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodGet, path, nil)
		router.ServeHTTP(recorder, request)

		require.Equal(t, http.StatusOK, recorder.Code, path)
		require.Contains(t, recorder.Body.String(), "classic", path)
	}
}

func TestWebRouterUISwitchTogglesCookie(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	SetWebRouter(router, WebAssets{
		ClassicBuildFS:   testClassicFS,
		ClassicIndexPage: testClassicIndex,
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/.actions/uiswitch?return_to=/console", nil)
	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusFound, recorder.Code)
	require.Equal(t, "/console", recorder.Header().Get("Location"))
	require.True(t, hasCookieValue(recorder.Header().Values("Set-Cookie"), "flint_ui=classic"))

	recorder = httptest.NewRecorder()
	request = httptest.NewRequest(http.MethodGet, "/.actions/uiswitch", nil)
	request.AddCookie(&http.Cookie{Name: uiCookieName, Value: "classic"})
	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusFound, recorder.Code)
	require.True(t, hasCookieValue(recorder.Header().Values("Set-Cookie"), "flint_ui=new"))
}

func TestWebRouterClassicCookieDoesNotHijackFileRequests(t *testing.T) {
	gin.SetMode(gin.TestMode)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("new:" + r.URL.Path))
	}))
	defer upstream.Close()

	router := gin.New()
	SetWebRouter(router, WebAssets{
		ClassicBuildFS:   testClassicFS,
		ClassicIndexPage: testClassicIndex,
		NewFrontendURL:   upstream.URL,
	})
	server := httptest.NewServer(router)
	defer server.Close()

	response, body := getTestServerPath(t, server.URL, "/_next/static/app.js", []*http.Cookie{
		{Name: uiCookieName, Value: "classic"},
	})

	require.Equal(t, http.StatusOK, response.StatusCode)
	require.Equal(t, "new:/_next/static/app.js", body)
}

func TestWebRouterRequestsIdentityEncodingFromNewFrontend(t *testing.T) {
	gin.SetMode(gin.TestMode)
	upstreamEncoding := make(chan string, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upstreamEncoding <- r.Header.Get("Accept-Encoding")
		if strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			w.Header().Set("Content-Encoding", "gzip")
			gz := gzip.NewWriter(w)
			_, _ = gz.Write([]byte("new:" + r.URL.Path))
			_ = gz.Close()
			return
		}
		_, _ = w.Write([]byte("new:" + r.URL.Path))
	}))
	defer upstream.Close()

	router := gin.New()
	SetWebRouter(router, WebAssets{
		ClassicBuildFS:   testClassicFS,
		ClassicIndexPage: testClassicIndex,
		NewFrontendURL:   upstream.URL,
	})
	server := httptest.NewServer(router)
	defer server.Close()

	request, err := http.NewRequest(http.MethodGet, server.URL+"/console", nil)
	require.NoError(t, err)
	request.Header.Set("Accept-Encoding", "gzip, br")
	response, err := http.DefaultClient.Do(request)
	require.NoError(t, err)
	defer response.Body.Close()

	require.Equal(t, http.StatusOK, response.StatusCode)
	require.Equal(t, "identity", <-upstreamEncoding)
	require.Equal(t, "gzip", response.Header.Get("Content-Encoding"))
	gr, err := gzip.NewReader(response.Body)
	require.NoError(t, err)
	defer gr.Close()
	body, err := io.ReadAll(gr)
	require.NoError(t, err)
	require.Equal(t, "new:/console", string(body))
}

func TestWebRouterForwardsBrowserOriginToNewFrontend(t *testing.T) {
	gin.SetMode(gin.TestMode)
	upstreamHeaders := make(chan http.Header, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upstreamHeaders <- r.Header.Clone()
		_, _ = w.Write([]byte("ok"))
	}))
	defer upstream.Close()

	router := gin.New()
	SetWebRouter(router, WebAssets{
		ClassicBuildFS:   testClassicFS,
		ClassicIndexPage: testClassicIndex,
		NewFrontendURL:   upstream.URL,
	})
	server := httptest.NewServer(router)
	defer server.Close()

	request, err := http.NewRequest(http.MethodPost, server.URL+"/console/token/actions/create", nil)
	require.NoError(t, err)
	request.Host = "127.0.0.1:3000"
	request.Header.Set("X-Forwarded-Host", "app.example.test")
	request.Header.Set("X-Forwarded-Proto", "https")
	response, err := http.DefaultClient.Do(request)
	require.NoError(t, err)
	defer response.Body.Close()

	require.Equal(t, http.StatusOK, response.StatusCode)
	headers := <-upstreamHeaders
	require.Equal(t, "app.example.test", headers.Get("X-Forwarded-Host"))
	require.Equal(t, "https", headers.Get("X-Forwarded-Proto"))
}

func TestPrepareWebNewStandaloneAssetsLinksBuildAssets(t *testing.T) {
	root := t.TempDir()
	standaloneDir := filepath.Join(root, "web", "new", ".next", "standalone")
	staticDir := filepath.Join(root, "web", "new", ".next", "static", "media")
	publicDir := filepath.Join(root, "web", "new", "public")
	require.NoError(t, os.MkdirAll(standaloneDir, 0o755))
	require.NoError(t, os.MkdirAll(staticDir, 0o755))
	require.NoError(t, os.MkdirAll(publicDir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(staticDir, "font.woff2"), []byte("font"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(publicDir, "logo.png"), []byte("logo"), 0o644))

	require.NoError(t, prepareWebNewStandaloneAssets(standaloneDir))

	staticTarget := filepath.Join(standaloneDir, ".next", "static", "media", "font.woff2")
	publicTarget := filepath.Join(standaloneDir, "public", "logo.png")
	font, err := os.ReadFile(staticTarget)
	require.NoError(t, err)
	logo, err := os.ReadFile(publicTarget)
	require.NoError(t, err)
	require.Equal(t, "font", string(font))
	require.Equal(t, "logo", string(logo))
}

func hasCookieValue(values []string, expected string) bool {
	for _, value := range values {
		if strings.Contains(value, expected) {
			return true
		}
	}
	return false
}

func getTestServerPath(t *testing.T, baseURL string, path string, cookies []*http.Cookie) (*http.Response, string) {
	t.Helper()
	request, err := http.NewRequest(http.MethodGet, baseURL+path, nil)
	require.NoError(t, err)
	for _, cookie := range cookies {
		request.AddCookie(cookie)
	}
	response, err := http.DefaultClient.Do(request)
	require.NoError(t, err)
	defer response.Body.Close()
	body, err := io.ReadAll(response.Body)
	require.NoError(t, err)
	return response, string(body)
}
