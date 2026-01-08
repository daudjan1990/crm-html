// storage.js - Handles data persistence using IndexedDB (with localStorage fallback)

class StorageManager {
    constructor() {
        this.CUSTOMERS_KEY = 'crm_customers';
        this.TASKS_KEY = 'crm_tasks';
        this.LAST_EXPORT_KEY = 'crm_last_export';
        this.useIndexedDB = true;
        this.initialized = false;
        
        // In-memory cache for synchronous access
        this.customersCache = [];
        this.tasksCache = [];
        this.cacheReady = false;
        
        this.initPromise = this.initializeStorage();
        this.setupNightlyExport();
    }

    // Initialize storage and migrate from localStorage if needed
    async initializeStorage() {
        try {
            // Wait for IndexedDB to initialize
            await indexedDBManager.ensureDB();
            
            // Check if migration is needed
            const migrationCompleted = await indexedDBManager.isMigrationCompleted();
            
            if (!migrationCompleted) {
                console.log('Checking for data to migrate from localStorage...');
                const result = await indexedDBManager.migrateFromLocalStorage();
                
                if (result.success && result.customersCount > 0) {
                    console.log(`Successfully migrated ${result.customersCount} customers and ${result.tasksCount} tasks from localStorage to IndexedDB`);
                    alert(`Data migration completed!\n\nMigrated:\n- ${result.customersCount} customers\n- ${result.tasksCount} tasks\n\nYour data is now stored in IndexedDB with support for larger files.`);
                }
            }
            
            // Load data into cache
            await this.refreshCache();
            
            this.initialized = true;
            this.cacheReady = true;
            console.log('Storage initialized with IndexedDB');
        } catch (error) {
            console.error('Error initializing IndexedDB, falling back to localStorage:', error);
            this.useIndexedDB = false;
            this.initialized = true;
            
            // Initialize localStorage as fallback
            if (!localStorage.getItem(this.CUSTOMERS_KEY)) {
                localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify([]));
            }
            if (!localStorage.getItem(this.TASKS_KEY)) {
                localStorage.setItem(this.TASKS_KEY, JSON.stringify([]));
            }
            
            // Load from localStorage into cache
            this.customersCache = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY)) || [];
            this.tasksCache = JSON.parse(localStorage.getItem(this.TASKS_KEY)) || [];
            this.cacheReady = true;
        }
    }

    async refreshCache() {
        if (this.useIndexedDB) {
            this.customersCache = await indexedDBManager.getCustomers();
            this.tasksCache = await indexedDBManager.getTasks();
        } else {
            this.customersCache = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY)) || [];
            this.tasksCache = JSON.parse(localStorage.getItem(this.TASKS_KEY)) || [];
        }
    }

    // Customer operations - synchronous interface
    getCustomers() {
        if (!this.cacheReady) {
            console.warn('Cache not ready yet, returning empty array');
            return [];
        }
        return this.customersCache;
    }

    saveCustomers(customers) {
        // For backward compatibility - not used with new architecture
        return true;
    }

    addCustomer(customer) {
        customer.id = this.generateId();
        customer.createdAt = new Date().toISOString();
        if (!customer.status) {
            customer.status = 'onboarding';
        }
        
        this.customersCache.push(customer);
        
        // Persist asynchronously
        if (this.useIndexedDB) {
            indexedDBManager.addCustomer(customer).catch(err => {
                console.error('Error saving customer to IndexedDB:', err);
            });
        } else {
            try {
                localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(this.customersCache));
            } catch (e) {
                console.error('Error saving customers:', e);
                alert('Error saving customer data. Storage might be full.');
                return null;
            }
        }
        
        return customer;
    }

    updateCustomer(id, updatedCustomer) {
        const index = this.customersCache.findIndex(c => c.id === id);
        if (index !== -1) {
            this.customersCache[index] = { ...this.customersCache[index], ...updatedCustomer, id, updatedAt: new Date().toISOString() };
            const customer = this.customersCache[index];
            
            // Persist asynchronously
            if (this.useIndexedDB) {
                indexedDBManager.updateCustomer(id, updatedCustomer).catch(err => {
                    console.error('Error updating customer in IndexedDB:', err);
                });
            } else {
                try {
                    localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(this.customersCache));
                } catch (e) {
                    console.error('Error saving customers:', e);
                    return null;
                }
            }
            
            return customer;
        }
        return null;
    }

    deleteCustomer(id) {
        this.customersCache = this.customersCache.filter(c => c.id !== id);
        
        // Also delete tasks associated with this customer
        this.tasksCache = this.tasksCache.filter(t => t.customerId !== id);
        
        // Persist asynchronously
        if (this.useIndexedDB) {
            indexedDBManager.deleteCustomer(id).catch(err => {
                console.error('Error deleting customer from IndexedDB:', err);
            });
        } else {
            try {
                localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(this.customersCache));
                localStorage.setItem(this.TASKS_KEY, JSON.stringify(this.tasksCache));
            } catch (e) {
                console.error('Error saving data:', e);
                return false;
            }
        }
        
        return true;
    }

    getCustomerById(id) {
        return this.customersCache.find(c => c.id === id);
    }

    // Task operations - synchronous interface
    getTasks() {
        if (!this.cacheReady) {
            console.warn('Cache not ready yet, returning empty array');
            return [];
        }
        return this.tasksCache;
    }

    saveTasks(tasks) {
        // For backward compatibility - not used with new architecture
        return true;
    }

    addTask(task) {
        task.id = this.generateId();
        task.createdAt = new Date().toISOString();
        
        // Handle attachments
        const attachmentsToStore = task.attachments || [];
        
        this.tasksCache.push(task);
        
        // Persist asynchronously
        if (this.useIndexedDB) {
            indexedDBManager.addTask(task).then(() => {
                // Refresh cache to get updated fileIds
                return this.refreshCacheTasks();
            }).catch(err => {
                console.error('Error saving task to IndexedDB:', err);
            });
        } else {
            try {
                localStorage.setItem(this.TASKS_KEY, JSON.stringify(this.tasksCache));
            } catch (e) {
                console.error('Error saving tasks:', e);
                alert('Error saving task data. Storage might be full.');
                return null;
            }
        }
        
        return task;
    }

    updateTask(id, updatedTask) {
        const index = this.tasksCache.findIndex(t => t.id === id);
        if (index !== -1) {
            this.tasksCache[index] = { ...this.tasksCache[index], ...updatedTask, id, updatedAt: new Date().toISOString() };
            const task = this.tasksCache[index];
            
            // Persist asynchronously
            if (this.useIndexedDB) {
                indexedDBManager.updateTask(id, updatedTask).then(() => {
                    // Refresh cache to get updated fileIds and attachments
                    return this.refreshCacheTasks();
                }).catch(err => {
                    console.error('Error updating task in IndexedDB:', err);
                });
            } else {
                try {
                    localStorage.setItem(this.TASKS_KEY, JSON.stringify(this.tasksCache));
                } catch (e) {
                    console.error('Error saving tasks:', e);
                    return null;
                }
            }
            
            return task;
        }
        return null;
    }

    deleteTask(id) {
        this.tasksCache = this.tasksCache.filter(t => t.id !== id);
        
        // Persist asynchronously
        if (this.useIndexedDB) {
            indexedDBManager.deleteTask(id).catch(err => {
                console.error('Error deleting task from IndexedDB:', err);
            });
        } else {
            try {
                localStorage.setItem(this.TASKS_KEY, JSON.stringify(this.tasksCache));
            } catch (e) {
                console.error('Error saving tasks:', e);
                return false;
            }
        }
        
        return true;
    }

    getTaskById(id) {
        return this.tasksCache.find(t => t.id === id);
    }

    getTasksByCustomer(customerId) {
        return this.tasksCache.filter(t => t.customerId === customerId);
    }

    // Refresh only tasks cache (for file operations)
    async refreshCacheTasks() {
        if (this.useIndexedDB) {
            this.tasksCache = await indexedDBManager.getTasks();
        } else {
            this.tasksCache = JSON.parse(localStorage.getItem(this.TASKS_KEY)) || [];
        }
    }

    // Get tasks for non-finished customers only
    getActiveCustomerTasks() {
        const finishedCustomerIds = new Set(
            this.customersCache.filter(c => c.status === 'finished').map(c => c.id)
        );
        return this.tasksCache.filter(t => !finishedCustomerIds.has(t.customerId));
    }

    // Get tasks for finished customers only
    getFinishedCustomerTasks() {
        const finishedCustomerIds = new Set(
            this.customersCache.filter(c => c.status === 'finished').map(c => c.id)
        );
        return this.tasksCache.filter(t => finishedCustomerIds.has(t.customerId));
    }

    // Utility functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    // Clear all data
    clearAllData() {
        if (confirm('Are you sure you want to delete all data? This cannot be undone.')) {
            this.customersCache = [];
            this.tasksCache = [];
            
            if (this.useIndexedDB) {
                indexedDBManager.clearAllData().catch(err => {
                    console.error('Error clearing IndexedDB:', err);
                });
            } else {
                localStorage.removeItem(this.CUSTOMERS_KEY);
                localStorage.removeItem(this.TASKS_KEY);
            }
            
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
        
        // Check on load (after cache is ready)
        this.initPromise.then(() => checkAndExport());
    }

    performNightlyExport() {
        try {
            // Create backup data from cache
            const backupData = {
                customers: this.customersCache,
                tasks: this.tasksCache,
                exportDate: new Date().toISOString(),
                version: this.useIndexedDB ? '2.0' : '1.0'
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
    async importBackup(backupData) {
        try {
            if (this.useIndexedDB) {
                await indexedDBManager.importAllData(backupData);
                // Refresh cache after import
                await this.refreshCache();
            } else {
                if (backupData.customers) {
                    this.customersCache = backupData.customers;
                    localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(this.customersCache));
                }
                if (backupData.tasks) {
                    this.tasksCache = backupData.tasks;
                    localStorage.setItem(this.TASKS_KEY, JSON.stringify(this.tasksCache));
                }
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
