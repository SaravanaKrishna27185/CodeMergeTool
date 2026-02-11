# File Copy Configuration - Enhanced Features

The File Copy Configuration has been significantly enhanced to support comprehensive folder structure copying capabilities.

## New Features

### 1. Copy Modes

- **Files Only**: Copy individual files based on patterns (original behavior)
- **Folders**: Copy entire folders with their complete subfolder structure
- **Mixed**: Copy both individual files and complete folders

### 2. Folder Structure Preservation

- **Preserve Folder Structure**: Maintains the original directory hierarchy when copying
- **Flatten Structure**: Copies all files to the destination root (when disabled)

### 3. Advanced Pattern Support

- **File Patterns**: Supports glob patterns like `*.js`, `**/*.tsx`, `src/components/*.jsx`
- **Folder Paths**: Specific folder paths like `src/components`, `docs`, `assets/images`
- **Exclude Patterns**: Ignore common files/folders like `node_modules`, `.git`, `*.log`

## Usage Examples

### Example 1: Copy Component Folders

```
Copy Mode: Folders
Source Path: /src
Destination Path: /target/src
Include Folders: components, utils, hooks
Exclude Patterns: node_modules, .git, *.test.js
Preserve Structure: ✅
```

**Result**: Copies entire `components`, `utils`, and `hooks` folders with all subfolders and files, maintaining structure.

### Example 2: Mixed File and Folder Copy

```
Copy Mode: Mixed
Source Path: /project
Destination Path: /backup
Files: *.md, package.json, tsconfig.json
Include Folders: src/components, docs
Exclude Patterns: node_modules, dist, .git
Preserve Structure: ✅
```

**Result**: Copies specific files plus entire folder structures.

### Example 3: Flatten Structure

```
Copy Mode: Files
Source Path: /src
Destination Path: /flat-output
Files: **/*.ts, **/*.tsx
Preserve Structure: ❌
```

**Result**: All TypeScript files copied to destination root, no folders.

## Pattern Syntax

### File Patterns

- `*.js` - All JavaScript files in current directory
- `**/*.ts` - All TypeScript files recursively
- `src/components/*.jsx` - JSX files in specific directory
- `{*.js,*.ts}` - Multiple extensions
- `file.txt` - Specific file

### Folder Patterns

- `components` - Folder in current directory
- `src/components` - Nested folder path
- `assets/images` - Deep nested path

### Exclude Patterns

Common exclusions:

- `node_modules` - Package dependencies
- `.git` - Git repository files
- `.DS_Store` - macOS system files
- `*.log` - Log files
- `dist` - Build output
- `coverage` - Test coverage reports
- `*.tmp` - Temporary files

## Technical Implementation

### Backend Changes

- Enhanced pipeline settings model with new fields:
  - `copyMode`: "files" | "folders" | "mixed"
  - `preserveFolderStructure`: boolean
  - `includeFolders`: string (comma-separated)
  - `excludePatterns`: string (comma-separated)

### Frontend Changes

- New UI components for mode selection
- Conditional field visibility based on copy mode
- Enhanced validation and help text
- Visual indicators for different modes

### API Integration

- Settings are automatically saved/loaded from MongoDB
- Pipeline execution uses enhanced copy configuration
- Real-time validation of patterns and paths

## Benefits

1. **Flexibility**: Support for various copy scenarios
2. **Efficiency**: Copy entire folder structures in one operation
3. **Control**: Fine-grained control over what gets copied
4. **Safety**: Built-in exclusion patterns prevent copying unwanted files
5. **Consistency**: Maintain folder relationships and dependencies

## Migration

Existing configurations will automatically default to:

- Copy Mode: "files" (maintains backward compatibility)
- Preserve Structure: true
- Exclude Patterns: "node_modules,.git,.DS_Store,\*.log"

Users can upgrade their configurations to use the new folder copying features as needed.
