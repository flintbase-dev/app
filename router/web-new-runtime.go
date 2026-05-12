package router

import (
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
)

const (
	webNewBaseURLEnv       = "WEB_NEW_BASE_URL"
	webNewStandaloneDirEnv = "WEB_NEW_STANDALONE_DIR"
	webNewNodeBinEnv       = "WEB_NEW_NODE_BIN"
)

// StartNewFrontendRuntime returns the local web/new runtime URL. In packaged
// deployments it starts the bundled Next.js standalone server; in development it
// can proxy to WEB_NEW_BASE_URL.
func StartNewFrontendRuntime(backendPort string) (string, func(), error) {
	if rawURL := strings.TrimSpace(os.Getenv(webNewBaseURLEnv)); rawURL != "" {
		common.SysLog("web/new frontend runtime: " + strings.TrimRight(rawURL, "/"))
		return strings.TrimRight(rawURL, "/"), nil, nil
	}

	standaloneDir, err := findWebNewStandaloneDir()
	if err != nil {
		return "", nil, err
	}
	if err := prepareWebNewStandaloneAssets(standaloneDir); err != nil {
		return "", nil, err
	}

	port, err := reserveLocalPort()
	if err != nil {
		return "", nil, err
	}

	nodeBin := strings.TrimSpace(os.Getenv(webNewNodeBinEnv))
	if nodeBin == "" {
		nodeBin = "node"
	}

	cmd := exec.Command(nodeBin, "server.js")
	cmd.Dir = standaloneDir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(),
		"HOSTNAME=127.0.0.1",
		"PORT="+port,
		"FLINT_BACKEND_BASE_URL=http://127.0.0.1:"+backendPort,
	)

	if err := cmd.Start(); err != nil {
		return "", nil, fmt.Errorf("start Next.js standalone server: %w", err)
	}

	waitDone := make(chan error, 1)
	go func() {
		waitDone <- cmd.Wait()
	}()

	address := "127.0.0.1:" + port
	if err := waitForTCP(address, 10*time.Second); err != nil {
		stopProcess(cmd)
		waitForExit(waitDone)
		return "", nil, err
	}

	cleanup := func() {
		stopProcess(cmd)
		if err := waitForExit(waitDone); err != nil {
			common.SysError("web/new frontend runtime stopped: " + err.Error())
		}
	}

	url := "http://" + address
	common.SysLog("web/new frontend runtime: " + url)
	return url, cleanup, nil
}

func findWebNewStandaloneDir() (string, error) {
	candidates := []string{}
	if configured := strings.TrimSpace(os.Getenv(webNewStandaloneDirEnv)); configured != "" {
		candidates = append(candidates, configured)
	}
	candidates = append(candidates,
		"web/new/.next/standalone",
		"/web/new",
	)
	if executable, err := os.Executable(); err == nil {
		base := filepath.Dir(executable)
		candidates = append(candidates,
			filepath.Join(base, "web/new/.next/standalone"),
			filepath.Join(base, "web/new"),
		)
	}

	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		serverPath := filepath.Join(candidate, "server.js")
		if info, err := os.Stat(serverPath); err == nil && !info.IsDir() {
			return candidate, nil
		}
	}
	return "", errors.New("web/new standalone server.js not found; run `npm run build` in web/new or set WEB_NEW_BASE_URL")
}

func prepareWebNewStandaloneAssets(standaloneDir string) error {
	nextDir := filepath.Dir(standaloneDir)
	projectDir := filepath.Dir(nextDir)
	if err := ensureRuntimeAssetDir(
		filepath.Join(standaloneDir, ".next", "static"),
		filepath.Join(nextDir, "static"),
	); err != nil {
		return err
	}
	if err := ensureRuntimeAssetDir(
		filepath.Join(standaloneDir, "public"),
		filepath.Join(projectDir, "public"),
	); err != nil {
		return err
	}
	return nil
}

func ensureRuntimeAssetDir(target string, source string) error {
	if info, err := os.Stat(target); err == nil && info.IsDir() {
		return nil
	}
	sourceInfo, err := os.Stat(source)
	if err != nil {
		return nil
	}
	if !sourceInfo.IsDir() {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return fmt.Errorf("create runtime asset parent: %w", err)
	}
	relativeSource, err := filepath.Rel(filepath.Dir(target), source)
	if err == nil {
		if err := os.Symlink(relativeSource, target); err == nil {
			return nil
		}
	}
	if err := copyDir(source, target); err != nil {
		return fmt.Errorf("copy runtime assets from %s to %s: %w", source, target, err)
	}
	return nil
}

func copyDir(source string, target string) error {
	return filepath.WalkDir(source, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		relativePath, err := filepath.Rel(source, path)
		if err != nil {
			return err
		}
		targetPath := filepath.Join(target, relativePath)
		if entry.IsDir() {
			return os.MkdirAll(targetPath, 0o755)
		}
		if entry.Type()&os.ModeSymlink != 0 {
			linkTarget, err := os.Readlink(path)
			if err != nil {
				return err
			}
			return os.Symlink(linkTarget, targetPath)
		}
		return copyFile(path, targetPath)
	})
}

func copyFile(source string, target string) error {
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return err
	}
	sourceFile, err := os.Open(source)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	sourceInfo, err := sourceFile.Stat()
	if err != nil {
		return err
	}
	targetFile, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, sourceInfo.Mode().Perm())
	if err != nil {
		return err
	}
	defer targetFile.Close()
	_, err = io.Copy(targetFile, sourceFile)
	return err
}

func reserveLocalPort() (string, error) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return "", fmt.Errorf("reserve web/new runtime port: %w", err)
	}
	defer listener.Close()
	addr, ok := listener.Addr().(*net.TCPAddr)
	if !ok {
		return "", errors.New("reserved web/new runtime address is not TCP")
	}
	return fmt.Sprintf("%d", addr.Port), nil
}

func waitForTCP(address string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		conn, err := net.DialTimeout("tcp", address, 200*time.Millisecond)
		if err == nil {
			_ = conn.Close()
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	return fmt.Errorf("web/new frontend runtime did not listen on %s within %s", address, timeout)
}

func stopProcess(cmd *exec.Cmd) {
	if cmd == nil || cmd.Process == nil {
		return
	}
	if err := cmd.Process.Signal(os.Interrupt); err != nil {
		_ = cmd.Process.Kill()
		return
	}
	time.AfterFunc(3*time.Second, func() {
		if cmd.ProcessState == nil || !cmd.ProcessState.Exited() {
			_ = cmd.Process.Kill()
		}
	})
}

func waitForExit(done <-chan error) error {
	select {
	case err := <-done:
		return err
	case <-time.After(5 * time.Second):
		return errors.New("timeout waiting for web/new frontend runtime to exit")
	}
}
