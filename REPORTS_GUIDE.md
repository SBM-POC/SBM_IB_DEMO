# 📦 Test Report Sharing Guide

This guide shows you how to create and share downloadable test reports.

## 🎯 Quick Start

### Create Shareable Report ZIP

```bash
# Create ZIP file with both report formats
npm run report:zip

# Create ZIP and open the folder automatically
npm run report:zip-open
```

## 📋 What Gets Created

**ZIP Package Contents:**

- `single-page-report.html` - Self-contained report that opens in any browser
- `interactive-report/` - Full Allure report with all features
- `index.html` - Launcher page with instructions
- `README.txt` - Simple instructions for recipients

**File Sizes:**

- Single page report: ~2-5 MB
- Full ZIP package: ~10-50 MB

## 📤 How to Share

### ✅ Recommended Methods:

1. **Cloud Storage** (Best Option)

   - Upload ZIP to Google Drive, OneDrive, Dropbox
   - Share the download link with your team
   - Recipients get the complete package

2. **Email (Small Reports)**

   - Extract `single-page-report.html` from ZIP
   - Attach to email if under size limit
   - Quick and direct sharing

3. **File Hosting**

   - Upload to WeTransfer, SendAnywhere, etc.
   - Good for large files

4. **USB/Network**
   - Copy ZIP to shared location
   - Perfect for offline environments

## 🔧 For Recipients

### How to View Reports:

1. **Download and extract the ZIP file**
2. **Quick viewing**: Double-click `single-page-report.html`
3. **Full features**:
   - Install VS Code + Live Server extension
   - Open folder in VS Code
   - Right-click `index.html` → "Open with Live Server"

### Troubleshooting:

- If interactive report doesn't work, use single-page version
- Single-page version works immediately in any browser
- No internet connection required

## 📊 Available Commands

| Command                   | Description                      |
| ------------------------- | -------------------------------- |
| `npm run allure:generate` | Generate interactive report only |
| `npm run allure:single`   | Generate single HTML file only   |
| `npm run allure:open`     | Open local report server         |
| `npm run report:zip`      | Create complete ZIP package      |
| `npm run report:zip-open` | Create ZIP and open folder       |

## ✅ Benefits

- **Self-contained** - Works offline, no dependencies
- **Easy sharing** - Single ZIP file
- **Professional** - Includes instructions and launcher
- **Flexible** - Both quick-view and full-featured versions
- **Cross-platform** - Works on any device with a browser

Perfect for sharing with stakeholders, clients, or team members who need offline access to test reports!
