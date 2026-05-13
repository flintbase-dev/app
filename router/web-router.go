package router

import (
	"embed"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
)

// WebAssets holds the embedded frontend assets.
type WebAssets struct {
	ClassicBuildFS   embed.FS
	ClassicIndexPage []byte
	NewFrontendURL   string
}

func SetWebRouter(router *gin.Engine, assets WebAssets) {
	classicFS := common.EmbedFolder(assets.ClassicBuildFS, "web/classic/dist")
	newProxy := newFrontendProxy(assets.NewFrontendURL)

	router.Use(gzip.Gzip(gzip.DefaultCompression))
	router.Use(middleware.GlobalWebRateLimit())
	router.Use(middleware.Cache())
	router.Use(static.Serve("/", classicFS))
	router.GET("/.actions/uiswitch", handleUISwitch)
	router.NoRoute(func(c *gin.Context) {
		c.Set(middleware.RouteTagKey, "web")
		path := c.Request.URL.Path
		if isAPINotFoundPath(path) {
			controller.RelayNotFound(c)
			return
		}
		if shouldServeClassic(path, c) {
			serveClassicIndex(c, assets.ClassicIndexPage)
			return
		}
		if newProxy != nil {
			newProxy.ServeHTTP(c.Writer, c.Request)
			return
		}
		serveClassicIndex(c, assets.ClassicIndexPage)
	})
}

const uiCookieName = "flint_ui"

var classicOnlyPrefixes = []string{
	"/console/channel",
	"/console/models",
	"/console/redemption",
	"/console/user",
	"/console/subscription",
	"/console/message-management",
	"/console/setting",
}

func newFrontendProxy(rawURL string) *httputil.ReverseProxy {
	if rawURL == "" {
		return nil
	}
	target, err := url.Parse(strings.TrimRight(rawURL, "/"))
	if err != nil {
		common.SysError("invalid web/new frontend URL: " + err.Error())
		return nil
	}
	proxy := httputil.NewSingleHostReverseProxy(target)
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		forwardedHost := requestHost(req)
		forwardedProto := requestProto(req)
		originalDirector(req)
		req.Header.Set("Accept-Encoding", "identity")
		if forwardedHost != "" {
			req.Header.Set("X-Forwarded-Host", forwardedHost)
		}
		if forwardedProto != "" {
			req.Header.Set("X-Forwarded-Proto", forwardedProto)
		}
	}
	proxy.ErrorHandler = func(w http.ResponseWriter, _ *http.Request, err error) {
		common.SysError("web/new frontend proxy error: " + err.Error())
		http.Error(w, "web/new frontend is unavailable", http.StatusBadGateway)
	}
	return proxy
}

func requestHost(req *http.Request) string {
	if host := firstHeaderValue(req.Header.Get("X-Forwarded-Host")); host != "" {
		return host
	}
	return req.Host
}

func requestProto(req *http.Request) string {
	if proto := firstHeaderValue(req.Header.Get("X-Forwarded-Proto")); proto != "" {
		return proto
	}
	if req.TLS != nil {
		return "https"
	}
	return "http"
}

func firstHeaderValue(value string) string {
	if value == "" {
		return ""
	}
	first, _, _ := strings.Cut(value, ",")
	return strings.TrimSpace(first)
}

func handleUISwitch(c *gin.Context) {
	nextUI := c.Query("ui")
	if nextUI != "classic" && nextUI != "new" {
		current, _ := c.Cookie(uiCookieName)
		if current == "classic" {
			nextUI = "new"
		} else {
			nextUI = "classic"
		}
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     uiCookieName,
		Value:    nextUI,
		Path:     "/",
		MaxAge:   365 * 24 * 60 * 60,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	c.Redirect(http.StatusFound, safeRedirectTarget(c, c.Query("return_to")))
}

func shouldServeClassic(path string, c *gin.Context) bool {
	if isClassicOnlyPath(path) {
		return true
	}
	ui, _ := c.Cookie(uiCookieName)
	return ui == "classic" && !looksLikeFileRequest(path)
}

func isClassicOnlyPath(path string) bool {
	for _, prefix := range classicOnlyPrefixes {
		if path == prefix || strings.HasPrefix(path, prefix+"/") {
			return true
		}
	}
	return false
}

func isAPINotFoundPath(path string) bool {
	return strings.HasPrefix(path, "/v1") ||
		strings.HasPrefix(path, "/api") ||
		strings.HasPrefix(path, "/assets")
}

func looksLikeFileRequest(path string) bool {
	lastSlash := strings.LastIndex(path, "/")
	lastDot := strings.LastIndex(path, ".")
	return lastDot > lastSlash
}

func safeRedirectTarget(c *gin.Context, raw string) string {
	if raw == "" {
		raw = c.GetHeader("Referer")
	}
	if raw == "" {
		return "/"
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return "/"
	}
	if parsed.IsAbs() {
		if parsed.Host != c.Request.Host {
			return "/"
		}
		target := parsed.RequestURI()
		if target == "" {
			return "/"
		}
		return target
	}
	if strings.HasPrefix(raw, "//") || !strings.HasPrefix(raw, "/") {
		return "/"
	}
	return parsed.RequestURI()
}

func serveClassicIndex(c *gin.Context, indexPage []byte) {
	c.Header("Cache-Control", "no-cache")
	c.Data(http.StatusOK, "text/html; charset=utf-8", indexPage)
}
