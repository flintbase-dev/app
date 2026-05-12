# New API Electron Desktop App

This directory contains the Electron wrapper for New API, providing a native desktop application with system tray support for Windows, macOS, and Linux.

## Prerequisites

### 1. Go Binary (Required)
The Electron app requires the compiled Go binary to function. You have two options:

**Option A: Use existing binary (without Go installed)**
```bash
# If you have a pre-built binary (e.g., new-api-macos)
cp ../new-api-macos ../new-api
```

**Option B: Build from source (requires Go)**
TODO

### 2. PostgreSQL Database (Required)

The desktop wrapper starts the same backend binary as the server deployment. It requires a PostgreSQL database that has already been migrated and bootstrapped by `new-api-migrator`.

```bash
SQL_DSN="postgresql://user:password@host:5432/new-api" ./new-api-migrator
```

### 3. Electron Dependencies
```bash
cd electron
npm install
```

## Development

Run the app in development mode:
```bash
npm start
```

This will:
- Start the Go backend on port 3000
- Open an Electron window with DevTools enabled
- Create a system tray icon (menu bar on macOS)
- Use the PostgreSQL database configured by `SQL_DSN`

## Building for Production

### Quick Build
```bash
# Ensure Go binary exists in parent directory
ls ../new-api  # Should exist

# Build for current platform
npm run build

# Platform-specific builds
npm run build:mac    # Creates .dmg and .zip
npm run build:win    # Creates .exe installer
npm run build:linux  # Creates .AppImage and .deb
```

### Build Output
- Built applications are in `electron/dist/`
- macOS: `.dmg` (installer) and `.zip` (portable)
- Windows: `.exe` (installer) and portable exe
- Linux: `.AppImage` and `.deb`

## Configuration

### Port
Default port is 3000. To change, edit `main.js`:
```javascript
const PORT = 3000; // Change to desired port
```

### Database Location
Set `SQL_DSN` to a PostgreSQL connection string before starting the app. The Electron wrapper does not create or migrate the database; run `new-api-migrator` first.
