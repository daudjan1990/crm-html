// storage.js - Handles data persistence using localStorage

class StorageManager {
    constructor() {
        this.CUSTOMERS_KEY = 'crm_customers';
        this.TASKS_KEY = 'crm_tasks';
        this.LAST_EXPORT_KEY = 'crm_last_export';
        this.initializeStorage();
        this.setupNightlyExport();
    }

    // Initialize storage with empty arrays if not exists
    initializeStorage() {
        if (!localStorage.getItem(this.CUSTOMERS_KEY)) {
            localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.TASKS_KEY)) {
            localStorage.setItem(this.TASKS_KEY, JSON.stringify([]));
        }
    }

    // Customer operations
    getCustomers() {
        try {
            return JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY)) || [];
        } catch (e) {
            console.error('Error loading customers:', e);
            return [];
        }
    }

    saveCustomers(customers) {
        try {
            localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(customers));
            return true;
        } catch (e) {
            console.error('Error saving customers:', e);
            alert('Error saving customer data. Storage might be full.');
            return false;
        }
    }

    addCustomer(customer) {
        const customers = this.getCustomers();
        customer.id = this.generateId();
        customer.createdAt = new Date().toISOString();
        customers.push(customer);
        return this.saveCustomers(customers) ? customer : null;
    }

    updateCustomer(id, updatedCustomer) {
        const customers = this.getCustomers();
        const index = customers.findIndex(c => c.id === id);
        if (index !== -1) {
            customers[index] = { ...customers[index], ...updatedCustomer, id, updatedAt: new Date().toISOString() };
            return this.saveCustomers(customers) ? customers[index] : null;
        }
        return null;
    }

    deleteCustomer(id) {
        const customers = this.getCustomers();
        const filtered = customers.filter(c => c.id !== id);
        
        // Also delete tasks associated with this customer
        const tasks = this.getTasks();
        const filteredTasks = tasks.filter(t => t.customerId !== id);
        this.saveTasks(filteredTasks);
        
        return this.saveCustomers(filtered);
    }

    getCustomerById(id) {
        return this.getCustomers().find(c => c.id === id);
    }

    // Task operations
    getTasks() {
        try {
            return JSON.parse(localStorage.getItem(this.TASKS_KEY)) || [];
        } catch (e) {
            console.error('Error loading tasks:', e);
            return [];
        }
    }

    saveTasks(tasks) {
        try {
            localStorage.setItem(this.TASKS_KEY, JSON.stringify(tasks));
            return true;
        } catch (e) {
            console.error('Error saving tasks:', e);
            alert('Error saving task data. Storage might be full.');
            return false;
        }
    }

    addTask(task) {
        const tasks = this.getTasks();
        task.id = this.generateId();
        task.createdAt = new Date().toISOString();
        tasks.push(task);
        return this.saveTasks(tasks) ? task : null;
    }

    updateTask(id, updatedTask) {
        const tasks = this.getTasks();
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            tasks[index] = { ...tasks[index], ...updatedTask, id, updatedAt: new Date().toISOString() };
            return this.saveTasks(tasks) ? tasks[index] : null;
        }
        return null;
    }

    deleteTask(id) {
        const tasks = this.getTasks();
        const filtered = tasks.filter(t => t.id !== id);
        return this.saveTasks(filtered);
    }

    getTaskById(id) {
        return this.getTasks().find(t => t.id === id);
    }

    getTasksByCustomer(customerId) {
        return this.getTasks().filter(t => t.customerId === customerId);
    }

    // Utility functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Clear all data
    clearAllData() {
        if (confirm('Are you sure you want to delete all data? This cannot be undone.')) {
            localStorage.removeItem(this.CUSTOMERS_KEY);
            localStorage.removeItem(this.TASKS_KEY);
            this.initializeStorage();
            return true;
        }
        return false;
    }

    // Nightly export functionality
    setupNightlyExport() {
        const checkAndExport = () => {
            const lastExport = localStorage.getItem(this.LAST_EXPORT_KEY);
            const now = new Date();
            const today = now.toDateString();
            
            // Check if it's past midnight and we haven't exported today
            if (lastExport !== today && now.getHours() >= 0) {
                this.performNightlyExport();
                localStorage.setItem(this.LAST_EXPORT_KEY, today);
            }
        };

        // Check every hour
        setInterval(checkAndExport, 60 * 60 * 1000);
        
        // Check on load
        checkAndExport();
    }

    performNightlyExport() {
        try {
            // Create backup data
            const backupData = {
                customers: this.getCustomers(),
                tasks: this.getTasks(),
                exportDate: new Date().toISOString()
            };

            // Create a JSON file for download
            const dataStr = JSON.stringify(backupData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `crm-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            // Auto-download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log('Nightly backup completed successfully');
        } catch (e) {
            console.error('Error during nightly export:', e);
        }
    }

    // Import backup data
    importBackup(backupData) {
        try {
            if (backupData.customers) {
                this.saveCustomers(backupData.customers);
            }
            if (backupData.tasks) {
                this.saveTasks(backupData.tasks);
            }
            return true;
        } catch (e) {
            console.error('Error importing backup:', e);
            return false;
        }
    }
}

// Create global storage instance
const storage = new StorageManager();
