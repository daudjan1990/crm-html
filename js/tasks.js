// tasks.js - Handles task management functionality

class TaskManager {
    constructor() {
        this.modal = null;
        this.form = null;
        this.currentEditId = null;
        this.searchCompany = '';
        this.searchResponsible = '';
        this.searchDate = '';
        this.filterCustomerId = null;
        this.collapsedTasks = new Set(); // Track which tasks are collapsed
        this.MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit per file (increased from 5MB)
        this.initialize();
    }

    initialize() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Get modal and form elements
        this.modal = document.getElementById('task-modal');
        this.form = document.getElementById('task-form');
        
        if (!this.modal || !this.form) {
            console.error('Task modal or form not found');
            return;
        }

        // Add task button
        const addBtn = document.getElementById('add-task-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openAddModal());
        }

        // Close modal buttons
        const closeBtn = this.modal.querySelector('.close');
        const cancelBtn = this.modal.querySelector('.cancel-btn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Form submit
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Export/Import buttons
        const exportBtn = document.getElementById('export-tasks-btn');
        const importBtn = document.getElementById('import-tasks-btn');
        const exportPdfBtn = document.getElementById('export-tasks-pdf-btn');
        const csvInput = document.getElementById('task-csv-input');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => csvManager.exportTasksToCSV());
        }

        if (importBtn && csvInput) {
            importBtn.addEventListener('click', () => csvInput.click());
            csvInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    csvManager.importTasksFromCSV(e.target.files[0]);
                    e.target.value = ''; // Reset input
                }
            });
        }

        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => pdfManager.exportTasksToPDF());
        }

        // Search functionality
        const searchCompanyInput = document.getElementById('task-search-company');
        const searchResponsibleInput = document.getElementById('task-search-responsible');
        const searchDateInput = document.getElementById('task-search-date');
        const clearFiltersBtn = document.getElementById('clear-task-filters');

        if (searchCompanyInput) {
            searchCompanyInput.addEventListener('input', (e) => {
                this.searchCompany = e.target.value.toLowerCase();
                this.renderTasks();
            });
        }

        if (searchResponsibleInput) {
            searchResponsibleInput.addEventListener('input', (e) => {
                this.searchResponsible = e.target.value.toLowerCase();
                this.renderTasks();
            });
        }

        if (searchDateInput) {
            searchDateInput.addEventListener('change', (e) => {
                this.searchDate = e.target.value;
                this.renderTasks();
            });
        }

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.searchCompany = '';
                this.searchResponsible = '';
                this.searchDate = '';
                this.filterCustomerId = null;
                if (searchCompanyInput) searchCompanyInput.value = '';
                if (searchResponsibleInput) searchResponsibleInput.value = '';
                if (searchDateInput) searchDateInput.value = '';
                this.renderTasks();
            });
        }

        // Update customer dropdown
        this.updateCustomerDropdown();
        
        // Initial render
        this.renderTasks();
    }

    updateCustomerDropdown() {
        const select = document.getElementById('task-customer');
        if (!select) return;

        const customers = storage.getCustomers();
        const currentValue = select.value;

        // Clear and rebuild options
        select.innerHTML = '<option value="">Select Customer</option>';
        
        customers.sort((a, b) => a.name.localeCompare(b.name)).forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            // Include company number in the dropdown text
            const companyNumber = customer.companyNumber ? ` (${customer.companyNumber})` : '';
            option.textContent = `${customer.name}${companyNumber}`;
            select.appendChild(option);
        });

        // Restore previous value if it still exists
        if (currentValue && customers.find(c => c.id === currentValue)) {
            select.value = currentValue;
        }
    }

    openAddModal() {
        this.currentEditId = null;
        document.getElementById('task-modal-title').textContent = 'Add Task';
        this.form.reset();
        this.updateCustomerDropdown();
        
        // Set default deadline to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('task-deadline').value = today;
        
        // Set default priority
        document.getElementById('task-priority').value = 'medium';
        
        // Clear current attachments display
        document.getElementById('current-attachments').innerHTML = '';
        
        this.modal.classList.add('active');
    }

    openEditModal(id) {
        this.currentEditId = id;
        const task = storage.getTaskById(id);
        
        if (!task) {
            alert('Task not found');
            return;
        }

        document.getElementById('task-modal-title').textContent = 'Edit Task';
        this.updateCustomerDropdown();
        
        // Populate form
        document.getElementById('task-customer').value = task.customerId || '';
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-notes').value = task.notes || '';
        document.getElementById('task-deadline').value = task.deadline || '';
        document.getElementById('task-responsible').value = task.responsible || '';
        document.getElementById('task-priority').value = task.priority || 'medium';
        document.getElementById('task-status').value = task.status || 'pending';
        
        // Display existing attachments
        this.displayCurrentAttachments(task.attachments || []);
        
        this.modal.classList.add('active');
    }

    closeModal() {
        this.modal.classList.remove('active');
        this.form.reset();
        this.currentEditId = null;
    }

    async handleSubmit() {
        // Get form data
        const formData = new FormData(this.form);
        const task = {
            customerId: formData.get('customerId'),
            description: formData.get('description').trim(),
            notes: formData.get('notes').trim(),
            deadline: formData.get('deadline'),
            responsible: formData.get('responsible').trim(),
            priority: formData.get('priority'),
            status: formData.get('status')
        };

        // Validate required fields
        if (!task.customerId || !task.description || !task.deadline || !task.responsible || !task.priority) {
            alert('Please fill in all required fields');
            return;
        }

        // Validate customer exists
        const customer = storage.getCustomerById(task.customerId);
        if (!customer) {
            alert('Selected customer does not exist');
            return;
        }

        // Handle file attachments
        const fileInput = document.getElementById('task-attachments');
        const files = fileInput.files;
        
        // Get existing attachments if editing
        let existingAttachments = [];
        if (this.currentEditId) {
            const existingTask = storage.getTaskById(this.currentEditId);
            existingAttachments = existingTask?.attachments || [];
        }
        
        // Process new files
        if (files.length > 0) {
            try {
                const newAttachments = await this.processFiles(files);
                task.attachments = [...existingAttachments, ...newAttachments];
            } catch (error) {
                alert('Error processing attachments: ' + error.message);
                return;
            }
        } else {
            task.attachments = existingAttachments;
        }

        // Save task
        let result;
        if (this.currentEditId) {
            result = storage.updateTask(this.currentEditId, task);
        } else {
            result = storage.addTask(task);
        }

        if (result) {
            this.closeModal();
            this.renderTasks();
            
            // Update customer list to show task count
            if (window.customerManager) {
                window.customerManager.renderCustomers();
            }
        }
    }

    deleteTask(id) {
        const task = storage.getTaskById(id);
        if (!task) return;

        if (confirm(`Are you sure you want to delete this task: "${task.description}"?`)) {
            storage.deleteTask(id);
            this.renderTasks();
            
            // Update customer list to show task count
            if (window.customerManager) {
                window.customerManager.renderCustomers();
            }
        }
    }

    toggleTask(id) {
        if (this.collapsedTasks.has(id)) {
            this.collapsedTasks.delete(id);
        } else {
            this.collapsedTasks.add(id);
        }
        this.renderTasks();
    }

    renderTasks() {
        const tasks = storage.getActiveCustomerTasks(); // Only get tasks for non-finished customers
        const customers = storage.getCustomers();
        const container = document.getElementById('tasks-list');
        
        if (!container) return;

        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c.name;
        });

        // Apply filters
        let filteredTasks = tasks;
        
        // Filter by customer if set
        if (this.filterCustomerId) {
            filteredTasks = filteredTasks.filter(task => task.customerId === this.filterCustomerId);
        }
        
        // Filter by company name
        if (this.searchCompany) {
            filteredTasks = filteredTasks.filter(task => {
                const customerName = customerMap[task.customerId] || '';
                return customerName.toLowerCase().includes(this.searchCompany);
            });
        }
        
        // Filter by responsible person
        if (this.searchResponsible) {
            filteredTasks = filteredTasks.filter(task => 
                task.responsible && task.responsible.toLowerCase().includes(this.searchResponsible)
            );
        }
        
        // Filter by date
        if (this.searchDate) {
            filteredTasks = filteredTasks.filter(task => task.deadline === this.searchDate);
        }

        if (filteredTasks.length === 0) {
            let emptyMessage = 'No tasks yet. Click "Add Task" to get started.';
            if (this.searchCompany || this.searchResponsible || this.searchDate || this.filterCustomerId) {
                emptyMessage = 'No tasks found matching your filters.';
            }
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <div class="empty-state-text">${emptyMessage}</div>
                </div>
            `;
            return;
        }

        // Sort tasks by priority (high > medium > low) then by deadline
        const PRIORITY_ORDER = { 'high': 3, 'medium': 2, 'low': 1 };
        const DEFAULT_PRIORITY = 2;
        filteredTasks.sort((a, b) => {
            const priorityDiff = (PRIORITY_ORDER[b.priority] || DEFAULT_PRIORITY) - (PRIORITY_ORDER[a.priority] || DEFAULT_PRIORITY);
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(a.deadline) - new Date(b.deadline);
        });

        container.innerHTML = filteredTasks.map(task => {
            const customerName = customerMap[task.customerId] || 'Unknown Customer';
            const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'completed';
            const priority = task.priority || 'medium';
            const isCollapsed = this.collapsedTasks.has(task.id);
            const toggleIcon = isCollapsed ? '▶' : '▼';
            
            return `
                <div class="data-item" style="${isOverdue ? 'border-left-color: #e74c3c;' : ''}">
                    <div class="data-item-header">
                        <div class="data-item-title">
                            <button class="task-toggle-btn" onclick="taskManager.toggleTask('${task.id}')" title="${isCollapsed ? 'Expand' : 'Collapse'} task">
                                ${toggleIcon}
                            </button>
                            ${this.escapeHtml(task.description)}
                            ${isOverdue ? '<span style="color: #e74c3c; font-size: 14px; margin-left: 10px;">⚠ OVERDUE</span>' : ''}
                        </div>
                        <div class="data-item-actions">
                            <button class="btn btn-success" onclick="taskManager.openEditModal('${task.id}')">Edit</button>
                            <button class="btn btn-danger" onclick="taskManager.deleteTask('${task.id}')">Delete</button>
                        </div>
                    </div>
                    <div class="data-item-content" style="${isCollapsed ? 'display: none;' : ''}">
                        <div class="data-field">
                            <div class="data-field-label">Customer</div>
                            <div class="data-field-value">${this.escapeHtml(customerName)}</div>
                        </div>
                        <div class="data-field">
                            <div class="data-field-label">Deadline</div>
                            <div class="data-field-value">${this.formatDate(task.deadline)}</div>
                        </div>
                        <div class="data-field">
                            <div class="data-field-label">Responsible Person</div>
                            <div class="data-field-value">${this.escapeHtml(task.responsible)}</div>
                        </div>
                        <div class="data-field">
                            <div class="data-field-label">Priority</div>
                            <div class="data-field-value">
                                <span class="priority-badge priority-${priority}">${this.getPriorityLabel(priority)}</span>
                            </div>
                        </div>
                        <div class="data-field">
                            <div class="data-field-label">Status</div>
                            <div class="data-field-value">
                                <span class="status-badge status-${task.status}">${this.getStatusLabel(task.status)}</span>
                            </div>
                        </div>
                        ${task.notes ? `
                        <div class="data-field" style="grid-column: 1 / -1;">
                            <div class="data-field-label">Notes</div>
                            <div class="data-field-value">${this.escapeHtml(task.notes)}</div>
                        </div>
                        ` : ''}
                        ${task.attachments && task.attachments.length > 0 ? `
                        <div class="data-field" style="grid-column: 1 / -1;">
                            <div class="data-field-label">Attachments (${task.attachments.length})</div>
                            <div class="data-field-value">
                                ${task.attachments.map(att => `
                                    <div class="attachment-item">
                                        <span class="attachment-icon">📎</span>
                                        <span class="attachment-name">${this.escapeHtml(att.name)}</span>
                                        <span class="attachment-size">(${this.formatFileSize(att.size)})</span>
                                        <button class="btn btn-sm btn-secondary" onclick="taskManager.downloadAttachment('${this.escapeHtml(task.id)}', '${this.escapeHtml(att.id)}')">Download</button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getStatusLabel(status) {
        const statusMap = {
            'pending': 'Pending',
            'in-progress': 'In Progress',
            'completed': 'Completed'
        };
        return statusMap[status] || status;
    }

    getPriorityLabel(priority) {
        const priorityMap = {
            'low': 'Low',
            'medium': 'Medium',
            'high': 'High'
        };
        return priorityMap[priority] || priority;
    }

    filterByCustomer(customerId) {
        this.filterCustomerId = customerId;
        this.searchCompany = '';
        this.searchResponsible = '';
        this.searchDate = '';
        
        // Clear search inputs
        const searchCompanyInput = document.getElementById('task-search-company');
        const searchResponsibleInput = document.getElementById('task-search-responsible');
        const searchDateInput = document.getElementById('task-search-date');
        if (searchCompanyInput) searchCompanyInput.value = '';
        if (searchResponsibleInput) searchResponsibleInput.value = '';
        if (searchDateInput) searchDateInput.value = '';
        
        this.renderTasks();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Process uploaded files and convert to base64
    async processFiles(files) {
        const attachments = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Check file size
            if (file.size > this.MAX_FILE_SIZE) {
                const maxSizeMB = Math.round(this.MAX_FILE_SIZE / (1024 * 1024));
                throw new Error(`File "${file.name}" is too large. Maximum size is ${maxSizeMB}MB.`);
            }

            // Read file as base64
            const base64Data = await this.readFileAsBase64(file);
            
            attachments.push({
                id: this.generateAttachmentId(),
                name: file.name,
                type: file.type,
                size: file.size,
                data: base64Data,
                uploadedAt: new Date().toISOString()
            });
        }

        return attachments;
    }

    // Read file as base64
    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsDataURL(file);
        });
    }

    // Generate unique attachment ID
    generateAttachmentId() {
        // Use crypto.randomUUID if available
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        
        // Fallback to crypto.getRandomValues if available
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const array = new Uint8Array(16);
            crypto.getRandomValues(array);
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        }
        
        // Last resort: timestamp + multiple random values for better uniqueness
        return Date.now().toString(36) + '-' + 
               Math.random().toString(36).substring(2) + '-' + 
               Math.random().toString(36).substring(2) + '-' + 
               Math.random().toString(36).substring(2);
    }

    // Display current attachments in edit modal
    displayCurrentAttachments(attachments) {
        const container = document.getElementById('current-attachments');
        if (!container) return;

        if (!attachments || attachments.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div style="margin-top: 10px;">
                <strong>Current Attachments:</strong>
                <div style="margin-top: 5px;">
                    ${attachments.map(att => `
                        <div style="display: flex; align-items: center; gap: 10px; padding: 5px; background: rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 5px;">
                            <span style="flex: 1;">📎 ${this.escapeHtml(att.name)} (${this.formatFileSize(att.size)})</span>
                            <button type="button" class="btn btn-danger btn-sm" onclick="taskManager.removeAttachment('${this.escapeHtml(att.id)}')" style="padding: 2px 8px; font-size: 12px;">Remove</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Remove attachment from current task
    removeAttachment(attachmentId) {
        if (!this.currentEditId) return;

        const task = storage.getTaskById(this.currentEditId);
        if (!task) return;

        task.attachments = (task.attachments || []).filter(att => att.id !== attachmentId);
        storage.updateTask(this.currentEditId, task);
        
        this.displayCurrentAttachments(task.attachments);
    }

    // Format file size for display
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Download attachment
    downloadAttachment(taskId, attachmentId) {
        const task = storage.getTaskById(taskId);
        if (!task) return;

        const attachment = (task.attachments || []).find(att => att.id === attachmentId);
        if (!attachment) return;

        // Create download link
        const link = document.createElement('a');
        link.href = attachment.data;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Create global task manager instance
const taskManager = new TaskManager();
window.taskManager = taskManager;
