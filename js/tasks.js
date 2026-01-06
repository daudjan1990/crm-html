// tasks.js - Handles task management functionality

class TaskManager {
    constructor() {
        this.modal = null;
        this.form = null;
        this.currentEditId = null;
        this.searchResponsible = '';
        this.searchDate = '';
        this.filterCustomerId = null;
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
        const searchResponsibleInput = document.getElementById('task-search-responsible');
        const searchDateInput = document.getElementById('task-search-date');
        const clearFiltersBtn = document.getElementById('clear-task-filters');

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
                this.searchResponsible = '';
                this.searchDate = '';
                this.filterCustomerId = null;
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
            option.textContent = customer.name;
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
        
        this.modal.classList.add('active');
    }

    closeModal() {
        this.modal.classList.remove('active');
        this.form.reset();
        this.currentEditId = null;
    }

    handleSubmit() {
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

    renderTasks() {
        const tasks = storage.getTasks();
        const customers = storage.getCustomers();
        const container = document.getElementById('tasks-list');
        
        if (!container) return;

        // Apply filters
        let filteredTasks = tasks;
        
        // Filter by customer if set
        if (this.filterCustomerId) {
            filteredTasks = filteredTasks.filter(task => task.customerId === this.filterCustomerId);
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
            if (this.searchResponsible || this.searchDate || this.filterCustomerId) {
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

        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c.name;
        });

        // Sort tasks by priority (high > medium > low) then by deadline
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        filteredTasks.sort((a, b) => {
            const priorityDiff = (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(a.deadline) - new Date(b.deadline);
        });

        container.innerHTML = filteredTasks.map(task => {
            const customerName = customerMap[task.customerId] || 'Unknown Customer';
            const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'completed';
            const priority = task.priority || 'medium';
            
            return `
                <div class="data-item" style="${isOverdue ? 'border-left-color: #e74c3c;' : ''}">
                    <div class="data-item-header">
                        <div class="data-item-title">
                            ${this.escapeHtml(task.description)}
                            ${isOverdue ? '<span style="color: #e74c3c; font-size: 14px; margin-left: 10px;">⚠ OVERDUE</span>' : ''}
                        </div>
                        <div class="data-item-actions">
                            <button class="btn btn-success" onclick="taskManager.openEditModal('${task.id}')">Edit</button>
                            <button class="btn btn-danger" onclick="taskManager.deleteTask('${task.id}')">Delete</button>
                        </div>
                    </div>
                    <div class="data-item-content">
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
        this.searchResponsible = '';
        this.searchDate = '';
        
        // Clear search inputs
        const searchResponsibleInput = document.getElementById('task-search-responsible');
        const searchDateInput = document.getElementById('task-search-date');
        if (searchResponsibleInput) searchResponsibleInput.value = '';
        if (searchDateInput) searchDateInput.value = '';
        
        this.renderTasks();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global task manager instance
const taskManager = new TaskManager();
window.taskManager = taskManager;
