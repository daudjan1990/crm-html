// indexedDB.js - Handles data persistence using IndexedDB for larger storage capacity

class IndexedDBManager {
    constructor() {
        this.DB_NAME = 'CRM_Database';
        this.DB_VERSION = 1;
        this.db = null;
        
        // Object store names
        this.CUSTOMERS_STORE = 'customers';
        this.TASKS_STORE = 'tasks';
        this.FILES_STORE = 'files';
        this.METADATA_STORE = 'metadata';
        
        this.initPromise = this.initializeDB();
    }

    // Initialize IndexedDB
    async initializeDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                console.error('IndexedDB is not supported in this browser');
                reject(new Error('IndexedDB not supported'));
                return;
            }

            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => {
                console.error('Error opening IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create customers object store
                if (!db.objectStoreNames.contains(this.CUSTOMERS_STORE)) {
                    const customerStore = db.createObjectStore(this.CUSTOMERS_STORE, { keyPath: 'id' });
                    customerStore.createIndex('name', 'name', { unique: false });
                    customerStore.createIndex('companyNumber', 'companyNumber', { unique: false });
                    customerStore.createIndex('status', 'status', { unique: false });
                    customerStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Create tasks object store
                if (!db.objectStoreNames.contains(this.TASKS_STORE)) {
                    const taskStore = db.createObjectStore(this.TASKS_STORE, { keyPath: 'id' });
                    taskStore.createIndex('customerId', 'customerId', { unique: false });
                    taskStore.createIndex('status', 'status', { unique: false });
                    taskStore.createIndex('deadline', 'deadline', { unique: false });
                    taskStore.createIndex('priority', 'priority', { unique: false });
                    taskStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Create files object store (for large file attachments)
                if (!db.objectStoreNames.contains(this.FILES_STORE)) {
                    const fileStore = db.createObjectStore(this.FILES_STORE, { keyPath: 'id' });
                    fileStore.createIndex('taskId', 'taskId', { unique: false });
                    fileStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
                }

                // Create metadata object store (for app settings)
                if (!db.objectStoreNames.contains(this.METADATA_STORE)) {
                    db.createObjectStore(this.METADATA_STORE, { keyPath: 'key' });
                }

                console.log('IndexedDB object stores created');
            };
        });
    }

    // Ensure DB is initialized before operations
    async ensureDB() {
        if (!this.db) {
            await this.initPromise;
        }
        return this.db;
    }

    // Generic transaction helper
    async performTransaction(storeName, mode, operation) {
        await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([storeName], mode);
                const store = transaction.objectStore(storeName);
                const request = operation(store);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Customer operations
    async addCustomer(customer) {
        customer.id = this.generateId();
        customer.createdAt = new Date().toISOString();
        if (!customer.status) {
            customer.status = 'onboarding';
        }
        
        await this.performTransaction(this.CUSTOMERS_STORE, 'readwrite', (store) => {
            return store.add(customer);
        });
        
        return customer;
    }

    async updateCustomer(id, updatedCustomer) {
        const existing = await this.getCustomerById(id);
        if (!existing) return null;

        const customer = { ...existing, ...updatedCustomer, id, updatedAt: new Date().toISOString() };
        
        await this.performTransaction(this.CUSTOMERS_STORE, 'readwrite', (store) => {
            return store.put(customer);
        });
        
        return customer;
    }

    async deleteCustomer(id) {
        // Delete customer
        await this.performTransaction(this.CUSTOMERS_STORE, 'readwrite', (store) => {
            return store.delete(id);
        });

        // Delete associated tasks
        const tasks = await this.getTasksByCustomer(id);
        for (const task of tasks) {
            await this.deleteTask(task.id);
        }

        return true;
    }

    async getCustomerById(id) {
        return await this.performTransaction(this.CUSTOMERS_STORE, 'readonly', (store) => {
            return store.get(id);
        });
    }

    async getCustomers() {
        return await this.performTransaction(this.CUSTOMERS_STORE, 'readonly', (store) => {
            return store.getAll();
        });
    }

    // Task operations
    async addTask(task) {
        task.id = this.generateId();
        task.createdAt = new Date().toISOString();
        
        // Handle file attachments separately
        if (task.attachments && task.attachments.length > 0) {
            const fileIds = [];
            for (const attachment of task.attachments) {
                const fileId = await this.addFile(task.id, attachment);
                fileIds.push(fileId);
            }
            task.fileIds = fileIds;
            delete task.attachments; // Don't store file data in task object
        }
        
        await this.performTransaction(this.TASKS_STORE, 'readwrite', (store) => {
            return store.add(task);
        });
        
        return task;
    }

    async updateTask(id, updatedTask) {
        const existing = await this.getTaskById(id);
        if (!existing) return null;

        // Handle new file attachments
        if (updatedTask.attachments && updatedTask.attachments.length > 0) {
            const existingFileIds = existing.fileIds || [];
            const newFileIds = [];
            
            for (const attachment of updatedTask.attachments) {
                // Only add if it's a new attachment (has data field)
                if (attachment.data) {
                    const fileId = await this.addFile(id, attachment);
                    newFileIds.push(fileId);
                }
            }
            
            updatedTask.fileIds = [...existingFileIds, ...newFileIds];
            delete updatedTask.attachments;
        }

        const task = { ...existing, ...updatedTask, id, updatedAt: new Date().toISOString() };
        
        await this.performTransaction(this.TASKS_STORE, 'readwrite', (store) => {
            return store.put(task);
        });
        
        return task;
    }

    async deleteTask(id) {
        const task = await this.getTaskById(id);
        if (!task) return false;

        // Delete associated files
        if (task.fileIds && task.fileIds.length > 0) {
            for (const fileId of task.fileIds) {
                await this.deleteFile(fileId);
            }
        }

        // Delete task
        await this.performTransaction(this.TASKS_STORE, 'readwrite', (store) => {
            return store.delete(id);
        });

        return true;
    }

    async getTaskById(id) {
        const task = await this.performTransaction(this.TASKS_STORE, 'readonly', (store) => {
            return store.get(id);
        });

        // Load file attachments
        if (task && task.fileIds && task.fileIds.length > 0) {
            task.attachments = await this.getFilesByIds(task.fileIds);
        }

        return task;
    }

    async getTasks() {
        const tasks = await this.performTransaction(this.TASKS_STORE, 'readonly', (store) => {
            return store.getAll();
        });

        // Load file attachments for all tasks
        for (const task of tasks) {
            if (task.fileIds && task.fileIds.length > 0) {
                task.attachments = await this.getFilesByIds(task.fileIds);
            }
        }

        return tasks;
    }

    async getTasksByCustomer(customerId) {
        await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.TASKS_STORE], 'readonly');
            const store = transaction.objectStore(this.TASKS_STORE);
            const index = store.index('customerId');
            const request = index.getAll(customerId);

            request.onsuccess = async () => {
                const tasks = request.result;
                // Load file attachments for all tasks
                for (const task of tasks) {
                    if (task.fileIds && task.fileIds.length > 0) {
                        task.attachments = await this.getFilesByIds(task.fileIds);
                    }
                }
                resolve(tasks);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // File operations
    async addFile(taskId, attachment) {
        const fileId = attachment.id || this.generateId();
        const file = {
            id: fileId,
            taskId: taskId,
            name: attachment.name,
            type: attachment.type,
            size: attachment.size,
            data: attachment.data, // Base64 or Blob
            uploadedAt: attachment.uploadedAt || new Date().toISOString()
        };

        await this.performTransaction(this.FILES_STORE, 'readwrite', (store) => {
            return store.put(file);
        });

        return fileId;
    }

    async deleteFile(fileId) {
        await this.performTransaction(this.FILES_STORE, 'readwrite', (store) => {
            return store.delete(fileId);
        });
        return true;
    }

    async getFilesByIds(fileIds) {
        const files = [];
        for (const fileId of fileIds) {
            const file = await this.performTransaction(this.FILES_STORE, 'readonly', (store) => {
                return store.get(fileId);
            });
            if (file) {
                files.push(file);
            }
        }
        return files;
    }

    async getFilesByTask(taskId) {
        await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.FILES_STORE], 'readonly');
            const store = transaction.objectStore(this.FILES_STORE);
            const index = store.index('taskId');
            const request = index.getAll(taskId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Metadata operations
    async setMetadata(key, value) {
        await this.performTransaction(this.METADATA_STORE, 'readwrite', (store) => {
            return store.put({ key, value, updatedAt: new Date().toISOString() });
        });
    }

    async getMetadata(key) {
        const result = await this.performTransaction(this.METADATA_STORE, 'readonly', (store) => {
            return store.get(key);
        });
        return result ? result.value : null;
    }

    // Utility functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    // Clear all data
    async clearAllData() {
        await this.ensureDB();
        
        const storeNames = [this.CUSTOMERS_STORE, this.TASKS_STORE, this.FILES_STORE, this.METADATA_STORE];
        
        for (const storeName of storeNames) {
            await this.performTransaction(storeName, 'readwrite', (store) => {
                return store.clear();
            });
        }
        
        return true;
    }

    // Export all data as JSON (for backup)
    async exportAllData() {
        const customers = await this.getCustomers();
        const tasks = await this.getTasks();
        
        return {
            customers,
            tasks,
            exportDate: new Date().toISOString(),
            version: '2.0' // IndexedDB version
        };
    }

    // Import data from backup
    async importAllData(data) {
        // Clear existing data
        await this.clearAllData();

        // Import customers
        if (data.customers && Array.isArray(data.customers)) {
            for (const customer of data.customers) {
                await this.performTransaction(this.CUSTOMERS_STORE, 'readwrite', (store) => {
                    return store.add(customer);
                });
            }
        }

        // Import tasks and files
        if (data.tasks && Array.isArray(data.tasks)) {
            for (const task of data.tasks) {
                // Handle attachments
                if (task.attachments && task.attachments.length > 0) {
                    const fileIds = [];
                    for (const attachment of task.attachments) {
                        const fileId = await this.addFile(task.id, attachment);
                        fileIds.push(fileId);
                    }
                    task.fileIds = fileIds;
                    delete task.attachments;
                }

                await this.performTransaction(this.TASKS_STORE, 'readwrite', (store) => {
                    return store.add(task);
                });
            }
        }

        return true;
    }

    // Migrate data from localStorage to IndexedDB
    async migrateFromLocalStorage() {
        console.log('Starting migration from localStorage to IndexedDB...');

        try {
            // Get data from localStorage
            const customersJSON = localStorage.getItem('crm_customers');
            const tasksJSON = localStorage.getItem('crm_tasks');

            if (!customersJSON && !tasksJSON) {
                console.log('No data found in localStorage to migrate');
                return { success: true, customersCount: 0, tasksCount: 0 };
            }

            const customers = customersJSON ? JSON.parse(customersJSON) : [];
            const tasks = tasksJSON ? JSON.parse(tasksJSON) : [];

            // Check if IndexedDB already has data
            const existingCustomers = await this.getCustomers();
            const existingTasks = await this.getTasks();

            if (existingCustomers.length > 0 || existingTasks.length > 0) {
                console.log('IndexedDB already contains data. Skipping migration.');
                return { success: false, message: 'Data already exists in IndexedDB' };
            }

            // Import customers
            for (const customer of customers) {
                await this.performTransaction(this.CUSTOMERS_STORE, 'readwrite', (store) => {
                    return store.add(customer);
                });
            }

            // Import tasks with their attachments
            for (const task of tasks) {
                if (task.attachments && task.attachments.length > 0) {
                    const fileIds = [];
                    for (const attachment of task.attachments) {
                        const fileId = await this.addFile(task.id, attachment);
                        fileIds.push(fileId);
                    }
                    task.fileIds = fileIds;
                    delete task.attachments;
                }

                await this.performTransaction(this.TASKS_STORE, 'readwrite', (store) => {
                    return store.add(task);
                });
            }

            // Mark migration as complete
            await this.setMetadata('migration_completed', true);
            await this.setMetadata('migration_date', new Date().toISOString());

            console.log(`Migration completed: ${customers.length} customers, ${tasks.length} tasks`);
            
            return {
                success: true,
                customersCount: customers.length,
                tasksCount: tasks.length
            };
        } catch (error) {
            console.error('Migration error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Check if migration has been completed
    async isMigrationCompleted() {
        const completed = await this.getMetadata('migration_completed');
        return completed === true;
    }

    // Get active customer tasks (non-finished customers)
    async getActiveCustomerTasks() {
        const tasks = await this.getTasks();
        const customers = await this.getCustomers();
        const finishedCustomerIds = new Set(
            customers.filter(c => c.status === 'finished').map(c => c.id)
        );
        return tasks.filter(t => !finishedCustomerIds.has(t.customerId));
    }

    // Get finished customer tasks
    async getFinishedCustomerTasks() {
        const tasks = await this.getTasks();
        const customers = await this.getCustomers();
        const finishedCustomerIds = new Set(
            customers.filter(c => c.status === 'finished').map(c => c.id)
        );
        return tasks.filter(t => finishedCustomerIds.has(t.customerId));
    }
}

// Create global IndexedDB manager instance
const indexedDBManager = new IndexedDBManager();
