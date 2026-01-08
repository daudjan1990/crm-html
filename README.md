# CRM Application

A lightweight, client-side Customer Relationship Management (CRM) application built with HTML, CSS, and JavaScript. Features advanced IndexedDB storage for large files and data capacity.

## Features

### 📋 Customer Management
- Add, edit, and delete customer records
- Critical fields: Name, Ansprechpartner (Contact Person), Betriebenummer (Company Number)
- Additional fields: Email, Phone, Address
- View customer details and associated tasks

### ✅ Task/Project Tracking
- Create tasks assigned to specific customers
- Task fields: Description, Notes, Deadline, Responsible Person, Status, Priority
- Three status levels: Pending, In Progress, Completed
- File attachments support (up to 50MB per file)
- Automatic overdue task highlighting
- Sort tasks by priority and deadline

### 📊 Data Import/Export
- **CSV Export**: Export customers and tasks to CSV format
- **CSV Import**: Import customers and tasks from CSV files
- **Interactive PDF Export**: Generate professional PDF reports with item selection and print preview
- **Automatic Nightly Backup**: Automatic JSON backup creation (configurable)

### 💾 Data Persistence
- **IndexedDB storage** for large data capacity and file storage
- Automatic migration from localStorage to IndexedDB
- Support for large file attachments (up to 50MB per file)
- No server required
- Data persists across browser sessions
- Manual backup/restore functionality
- Fallback to localStorage if IndexedDB is unavailable

### 🎨 User Interface
- Clean, modern, and intuitive design
- Fully responsive (works on desktop, tablet, and mobile)
- Tab-based navigation between Customers and Tasks
- Modal dialogs for adding/editing records
- Visual feedback for user actions
- Interactive print preview for PDF exports

## Getting Started

### Installation

1. Clone or download this repository
2. Open `index.html` in a modern web browser
3. Start managing your customers and tasks!

No build process, no dependencies to install, no server setup required.

### Browser Requirements

- Modern web browser with JavaScript enabled
- IndexedDB support (all modern browsers support it)
- For best experience: Chrome, Firefox, Safari, or Edge (latest versions)

## Storage System

### IndexedDB Storage
The application now uses **IndexedDB** as the primary storage mechanism, providing:
- **Much larger storage capacity** compared to localStorage (typically hundreds of MBs to GBs)
- **Efficient file storage** without base64 encoding overhead
- **Better performance** for large datasets
- **Structured data storage** with indexes for fast queries

### Automatic Migration
- On first load, the application automatically migrates any existing localStorage data to IndexedDB
- Migration is seamless and requires no user intervention
- A confirmation message is shown when migration completes

### Storage Limits
- **localStorage fallback**: ~5-10MB per domain (if IndexedDB is unavailable)
- **IndexedDB**: Typically 50% of available disk space (browser-dependent)
- **File attachments**: Up to 50MB per file (increased from 5MB)
- **Recommended**: For datasets over 1000 records or large file attachments, IndexedDB provides optimal performance

## File Attachments

### Supported Features
- Attach multiple files to tasks (PDF, EML, MSG, TXT formats)
- File size limit: **50MB per file** (10x increase from previous limit)
- Files stored efficiently in IndexedDB
- Download attachments anytime
- Attachments included in task exports

### Usage
1. When creating or editing a task, click on the "Attachments" field
2. Select one or multiple files (up to 50MB each)
3. Files are automatically uploaded and stored
4. View and download attachments from the task details

## Usage Guide

### Managing Customers

1. **Add a Customer**:
   - Click "Add Customer" button
   - Fill in the required fields (Name, Contact Person, Company Number)
   - Optionally add Email, Phone, and Address
   - Click "Save"

2. **Edit a Customer**:
   - Click "Edit" button on any customer card
   - Modify the fields as needed
   - Click "Save"

3. **Delete a Customer**:
   - Click "Delete" button on any customer card
   - Confirm the deletion
   - Note: Associated tasks will also be deleted

### Managing Tasks

1. **Add a Task**:
   - Click "Add Task" button
   - Select the customer from dropdown
   - Enter description, notes, deadline, and responsible person
   - Select task status
   - Click "Save"

2. **Edit a Task**:
   - Click "Edit" button on any task card
   - Modify the fields as needed
   - Click "Save"

3. **Delete a Task**:
   - Click "Delete" button on any task card
   - Confirm the deletion

### Import/Export Operations

#### CSV Export
- Click "Export CSV" button in either Customers or Tasks tab
- File will be downloaded automatically
- Opens in Excel, Google Sheets, or any CSV-compatible application

#### CSV Import
- Click "Import CSV" button
- Select a CSV file with the correct format
- Import results will be displayed

**CSV Format for Customers:**
```csv
ID,Name,Ansprechpartner,Betriebenummer,Email,Phone,Address,Created At
```

**CSV Format for Tasks:**
```csv
ID,Customer,Description,Notes,Deadline,Responsible Person,Status,Created At
```

#### PDF Export
- Click "Export PDF" button
- Professional PDF report will be generated and downloaded
- Includes all data in formatted tables

### Automatic Backups

The application automatically creates JSON backups:
- Checks daily after midnight
- Downloads backup file automatically
- Stores complete data snapshot

To restore from backup:
```javascript
// In browser console
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.json';
fileInput.onchange = (e) => {
    crmApp.importBackupData(e.target.files[0]);
};
fileInput.click();
```

## Keyboard Shortcuts

- `Ctrl/Cmd + K`: Switch to Customers tab
- `Ctrl/Cmd + T`: Switch to Tasks tab
- `Esc`: Close open modal

## Project Structure

```
crm-html/
├── index.html           # Main HTML file
├── css/
│   └── styles.css      # All styling
├── js/
│   ├── app.js          # Main application coordinator
│   ├── storage.js      # Data persistence (localStorage)
│   ├── customers.js    # Customer management
│   ├── tasks.js        # Task management
│   ├── csv.js          # CSV import/export
│   └── pdf.js          # PDF generation
└── README.md           # This file
```

## Architecture & Extensibility

### Current Architecture

The application follows a modular architecture:

1. **Storage Layer** (`storage.js`): Handles all data persistence using localStorage
2. **Business Logic Layer**: Separate modules for customers and tasks
3. **UI Layer**: Modal-based forms and dynamic rendering
4. **Export/Import Layer**: Handles CSV and PDF operations

### Future Backend Integration

The codebase is structured for easy backend integration:

#### Step 1: Add API Configuration
```javascript
// In app.js
app.setAPIEndpoint('https://your-api.com/api');
```

#### Step 2: Modify Storage Layer
Replace localStorage operations in `storage.js` with API calls:

```javascript
async addCustomer(customer) {
    const endpoint = app.getAPIEndpoint();
    if (endpoint) {
        // API call
        const response = await fetch(`${endpoint}/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customer)
        });
        return await response.json();
    } else {
        // Fallback to localStorage (current implementation)
        // ... existing code
    }
}
```

#### Step 3: Add Sync Functionality
Implement bi-directional sync in `app.js`:

```javascript
async syncWithBackend() {
    // Fetch server data
    // Merge with local data
    // Resolve conflicts
    // Push changes to server
}
```

#### Database Schema Suggestion

**Customers Table:**
```sql
CREATE TABLE customers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255) NOT NULL,
    company_number VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Tasks Table:**
```sql
CREATE TABLE tasks (
    id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(255) REFERENCES customers(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    notes TEXT,
    deadline DATE NOT NULL,
    responsible VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## Data Security

## Data Security

### Current Implementation
- Data stored locally in browser using IndexedDB
- No server transmission
- Data persists until explicitly deleted or browser data is cleared
- Automatic encrypted storage by browser (implementation varies by browser)

### For Production Use
When integrating with a backend, consider:
- HTTPS for all API calls
- Authentication & authorization
- Input sanitization
- SQL injection prevention
- XSS protection
- CSRF tokens
- Rate limiting

## Browser Storage Information

### Storage Capacity
- **localStorage**: Typically 5-10MB limit per domain (used as fallback only)
- **IndexedDB**: Much larger capacity - typically 50% of available disk space
  - Chrome: Up to 80% of total disk space
  - Firefox: Up to 50% of free disk space
  - Safari: Up to 1GB (may prompt user for more)

### Current Implementation
This application now uses **IndexedDB** as the primary storage, providing:
- Support for large datasets (10,000+ records)
- Efficient file storage (up to 50MB per file)
- Better performance for complex queries
- Automatic fallback to localStorage if IndexedDB is unavailable

## Troubleshooting

### Data Not Saving
- Check if IndexedDB is enabled in browser settings
- Check browser storage quota (browser settings > storage)
- Clear browser cache and reload
- Check browser console for error messages

### Migration Issues
- If migration from localStorage fails, data remains in localStorage
- You can manually export data as JSON backup and re-import after clearing storage
- Check browser console for specific migration error messages

### Import Not Working
- Verify CSV format matches expected structure
- Check for special characters in data
- Ensure file encoding is UTF-8

### PDF Not Generating
- Check browser console for errors
- Verify jsPDF library loaded (check network tab)
- Try a different browser

## Contributing

This is a standalone application, but suggestions for improvements are welcome:
- Bug reports
- Feature requests
- Code improvements
- Documentation enhancements

## License

This project is open source and available for personal and commercial use.

## Technical Details

### Dependencies
- **jsPDF**: PDF generation (loaded from CDN)
- **jsPDF-AutoTable**: Table formatting in PDFs (loaded from CDN)

### Browser APIs Used
- localStorage API
- FileReader API
- Blob API
- URL.createObjectURL API

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Changelog

### Version 1.0.0 (Initial Release)
- Customer management (CRUD operations)
- Task management (CRUD operations)
- CSV import/export
- PDF export
- Automatic nightly backups
- Responsive design
- localStorage persistence
- Form validation
- Keyboard shortcuts

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review browser console for errors
3. Check browser compatibility
4. Verify localStorage is enabled

## Future Enhancements

Potential features for future versions:
- [ ] Backend API integration
- [ ] User authentication
- [ ] Multi-user support
- [ ] Task comments/history
- [ ] Email notifications
- [ ] Calendar view for tasks
- [ ] Search and filter functionality
- [ ] Custom fields
- [ ] Activity logging
- [ ] Data encryption
- [ ] Offline support with sync
- [x] Mobile app (PWA) - ✅ **Completed**

---

Built with ❤️ using vanilla JavaScript - No frameworks required!
