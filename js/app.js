// app.js - Main application coordinator

class CRMApp {
    constructor() {
        this.currentTab = 'customers';
        this.initialize();
    }

    initialize() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApp());
        } else {
            this.setupApp();
        }
    }

    setupApp() {
        this.setupTabNavigation();
        this.setupGlobalErrorHandling();
        this.checkBrowserCompatibility();
        this.showWelcomeMessage();
    }

    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const activeTab = document.getElementById(`${tabName}-tab`);
        if (activeTab) {
            activeTab.classList.add('active');
            this.currentTab = tabName;

            // Re-render flowchart when switching to flowchart tab
            if (tabName === 'flowchart' && window.flowchartManager) {
                window.flowchartManager.renderFlowchart();
            }
        }
    }

    setupGlobalErrorHandling() {
        // Catch unhandled errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
        });

        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
        });
    }

    checkBrowserCompatibility() {
        // Check for localStorage support
        if (typeof Storage === 'undefined') {
            alert('Warning: Your browser does not support local storage. Data will not be saved.');
            return false;
        }

        // Check for basic ES6 support (arrow functions, const, etc.)
        try {
            // Test for arrow function support
            new Function('() => {}');
        } catch (e) {
            alert('Warning: Your browser may not fully support this application. Please use a modern browser.');
            return false;
        }

        return true;
    }

    showWelcomeMessage() {
        // Check if this is the first visit
        const hasVisited = localStorage.getItem('crm_has_visited');
        
        if (!hasVisited) {
            setTimeout(() => {
                const message = `
Welcome to the CRM Application!

This lightweight CRM helps you manage:
• Customers with their contact information
• Tasks and projects assigned to customers
• CSV import/export for data portability
• PDF reports for documentation
• Automatic nightly backups

Your data is stored locally in your browser.

Tips:
- Use the tabs to switch between Customers and Tasks
- Export your data regularly as backup
- The application automatically creates nightly backups

Get started by adding your first customer!
                `.trim();
                
                alert(message);
                localStorage.setItem('crm_has_visited', 'true');
            }, 500);
        }
    }

    // Utility methods for future backend integration
    getAPIEndpoint() {
        // Placeholder for future API endpoint configuration
        return localStorage.getItem('api_endpoint') || null;
    }

    setAPIEndpoint(endpoint) {
        // Placeholder for future API endpoint configuration
        localStorage.setItem('api_endpoint', endpoint);
    }

    async syncWithBackend() {
        // Placeholder for future backend sync functionality
        const endpoint = this.getAPIEndpoint();
        
        if (!endpoint) {
            console.log('No API endpoint configured. Running in local-only mode.');
            return false;
        }

        // Future implementation:
        // - Fetch data from backend
        // - Merge with local data
        // - Resolve conflicts
        // - Push local changes to backend
        
        console.log('Backend sync not yet implemented');
        return false;
    }

    exportAllData() {
        // Export everything as JSON backup
        const backup = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            customers: storage.getCustomers(),
            tasks: storage.getTasks()
        };

        const dataStr = JSON.stringify(backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `crm-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    importBackupData(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                
                if (!backup.customers || !backup.tasks) {
                    alert('Invalid backup file format');
                    return;
                }

                if (confirm('This will replace all current data. Are you sure?')) {
                    storage.importBackup(backup);
                    
                    // Refresh displays
                    if (window.customerManager) {
                        window.customerManager.renderCustomers();
                    }
                    if (window.taskManager) {
                        window.taskManager.renderTasks();
                        window.taskManager.updateCustomerDropdown();
                    }
                    
                    alert('Backup imported successfully!');
                }
            } catch (error) {
                console.error('Error importing backup:', error);
                alert('Error importing backup file. Please check the file format.');
            }
        };

        reader.readAsText(file);
    }

    // Statistics and reporting
    getStatistics() {
        const customers = storage.getCustomers();
        const tasks = storage.getTasks();
        
        const stats = {
            totalCustomers: customers.length,
            totalTasks: tasks.length,
            pendingTasks: tasks.filter(t => t.status === 'pending').length,
            inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
            completedTasks: tasks.filter(t => t.status === 'completed').length,
            overdueTasks: tasks.filter(t => 
                new Date(t.deadline) < new Date() && t.status !== 'completed'
            ).length
        };

        return stats;
    }

    displayStatistics() {
        const stats = this.getStatistics();
        const message = `
CRM Statistics:

Customers: ${stats.totalCustomers}
Total Tasks: ${stats.totalTasks}
- Pending: ${stats.pendingTasks}
- In Progress: ${stats.inProgressTasks}
- Completed: ${stats.completedTasks}
- Overdue: ${stats.overdueTasks}
        `.trim();
        
        alert(message);
    }
}

// Initialize the application
const app = new CRMApp();

// Make app globally accessible for console debugging
window.crmApp = app;

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K for customers tab
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        app.switchTab('customers');
    }
    
    // Ctrl/Cmd + T for tasks tab
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        app.switchTab('tasks');
    }
    
    // Esc to close modals
    if (e.key === 'Escape') {
        const customerModal = document.getElementById('customer-modal');
        const taskModal = document.getElementById('task-modal');
        
        if (customerModal && customerModal.classList.contains('active')) {
            customerManager.closeModal();
        }
        if (taskModal && taskModal.classList.contains('active')) {
            taskManager.closeModal();
        }
    }
});

console.log('CRM Application loaded successfully!');
console.log('Use window.crmApp to access application methods');
