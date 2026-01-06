// kanban.js - Handles Kanban board functionality for task management

class KanbanManager {
    constructor() {
        this.board = null;
        this.columnModal = null;
        this.addTasksModal = null;
        this.columns = [];
        this.taskAssignments = {}; // Maps task IDs to column IDs
        this.draggedCard = null;
        this.currentEditColumnId = null;
        this.filterCompany = '';
        this.filterCompanyNumber = '';
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
        // Get board element
        this.board = document.getElementById('kanban-board');
        this.columnModal = document.getElementById('kanban-column-modal');
        this.addTasksModal = document.getElementById('kanban-add-tasks-modal');
        
        if (!this.board) {
            console.error('Kanban board not found');
            return;
        }

        // Add tasks button
        const addTasksBtn = document.getElementById('kanban-add-tasks-btn');
        if (addTasksBtn) {
            addTasksBtn.addEventListener('click', () => this.openAddTasksModal());
        }

        // Add column button
        const addColumnBtn = document.getElementById('kanban-add-column-btn');
        if (addColumnBtn) {
            addColumnBtn.addEventListener('click', () => this.openColumnModal());
        }

        // Reset button
        const resetBtn = document.getElementById('kanban-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetBoard());
        }

        // Export PDF button
        const exportPdfBtn = document.getElementById('export-kanban-pdf-btn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => this.exportKanbanToPDF());
        }

        // Column modal setup
        if (this.columnModal) {
            const closeBtn = this.columnModal.querySelector('.close');
            const cancelBtn = this.columnModal.querySelector('.cancel-btn');
            const form = document.getElementById('kanban-column-form');

            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeColumnModal());
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.closeColumnModal());
            }

            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveColumn();
                });
            }

            window.addEventListener('click', (e) => {
                if (e.target === this.columnModal) {
                    this.closeColumnModal();
                }
            });
        }

        // Add tasks modal setup
        if (this.addTasksModal) {
            const closeBtn = this.addTasksModal.querySelector('.close');
            const cancelBtn = this.addTasksModal.querySelector('.cancel-btn');
            const confirmBtn = document.getElementById('kanban-add-tasks-confirm-btn');

            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeAddTasksModal());
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.closeAddTasksModal());
            }

            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => this.confirmAddTasks());
            }

            // Filter functionality
            const filterCompany = document.getElementById('kanban-task-filter-company');
            const filterCompanyNumber = document.getElementById('kanban-task-filter-company-number');
            const clearFilterBtn = document.getElementById('kanban-task-clear-filter');

            if (filterCompany) {
                filterCompany.addEventListener('input', (e) => {
                    this.filterCompany = e.target.value.toLowerCase();
                    this.renderTaskSelection();
                });
            }

            if (filterCompanyNumber) {
                filterCompanyNumber.addEventListener('input', (e) => {
                    this.filterCompanyNumber = e.target.value.toLowerCase();
                    this.renderTaskSelection();
                });
            }

            if (clearFilterBtn) {
                clearFilterBtn.addEventListener('click', () => {
                    this.filterCompany = '';
                    this.filterCompanyNumber = '';
                    if (filterCompany) filterCompany.value = '';
                    if (filterCompanyNumber) filterCompanyNumber.value = '';
                    this.renderTaskSelection();
                });
            }

            window.addEventListener('click', (e) => {
                if (e.target === this.addTasksModal) {
                    this.closeAddTasksModal();
                }
            });
        }

        // Load saved data
        this.loadKanbanData();

        // Initial render
        this.renderKanban();
    }

    loadKanbanData() {
        // Load columns from localStorage
        const savedColumns = localStorage.getItem('crm_kanban_columns');
        if (savedColumns) {
            try {
                this.columns = JSON.parse(savedColumns);
            } catch (e) {
                console.error('Error loading columns:', e);
                this.columns = this.getDefaultColumns();
            }
        } else {
            this.columns = this.getDefaultColumns();
        }

        // Load task assignments from localStorage
        const savedAssignments = localStorage.getItem('crm_kanban_assignments');
        if (savedAssignments) {
            try {
                this.taskAssignments = JSON.parse(savedAssignments);
            } catch (e) {
                console.error('Error loading assignments:', e);
                this.taskAssignments = {};
            }
        }
    }

    getDefaultColumns() {
        return [
            { id: 'todo', name: 'To Do', color: 'blue' },
            { id: 'in-progress', name: 'In Progress', color: 'orange' },
            { id: 'review', name: 'Review', color: 'purple' },
            { id: 'done', name: 'Done', color: 'green' }
        ];
    }

    saveKanbanData() {
        // Save columns to localStorage
        try {
            localStorage.setItem('crm_kanban_columns', JSON.stringify(this.columns));
            localStorage.setItem('crm_kanban_assignments', JSON.stringify(this.taskAssignments));
        } catch (e) {
            console.error('Error saving kanban data:', e);
        }
    }

    renderKanban() {
        if (!this.board) return;

        const tasks = storage.getActiveCustomerTasks();
        const customers = storage.getCustomers();

        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c.name;
        });

        // Create task map
        const taskMap = {};
        tasks.forEach(t => {
            taskMap[t.id] = t;
        });

        // Clear board
        this.board.innerHTML = '';

        if (this.columns.length === 0) {
            this.board.innerHTML = `
                <div class="kanban-empty">
                    <div>
                        <div style="font-size: 48px; margin-bottom: 15px;">📋</div>
                        <div>No columns yet. Click "Add Column" to create your first column.</div>
                    </div>
                </div>
            `;
            return;
        }

        // Render each column
        this.columns.forEach(column => {
            const columnEl = this.createColumn(column, tasks, customerMap, taskMap);
            this.board.appendChild(columnEl);
        });
    }

    createColumn(column, tasks, customerMap, taskMap) {
        const columnEl = document.createElement('div');
        columnEl.className = `kanban-column kanban-column-${column.color}`;
        columnEl.dataset.columnId = column.id;

        // Get tasks for this column
        const columnTasks = tasks.filter(task => 
            this.taskAssignments[task.id] === column.id
        );

        // Column header
        const header = document.createElement('div');
        header.className = 'kanban-column-header';
        header.innerHTML = `
            <div class="kanban-column-title">${this.escapeHtml(column.name)}</div>
            <div class="kanban-column-count">${columnTasks.length}</div>
            <button class="kanban-column-delete" onclick="kanbanManager.deleteColumn('${column.id}')" title="Delete column">×</button>
        `;
        columnEl.appendChild(header);

        // Column content (droppable area)
        const content = document.createElement('div');
        content.className = 'kanban-column-content';
        
        // Add drop event listeners
        content.addEventListener('dragover', (e) => this.handleDragOver(e));
        content.addEventListener('drop', (e) => this.handleDrop(e, column.id));
        content.addEventListener('dragleave', (e) => this.handleDragLeave(e));

        // Render cards in this column
        columnTasks.forEach(task => {
            const card = this.createCard(task, customerMap, taskMap);
            content.appendChild(card);
        });

        // Add drop zone indicator
        if (columnTasks.length === 0) {
            content.innerHTML = '<div class="kanban-drop-zone">Drop tasks here</div>';
        }

        columnEl.appendChild(content);

        return columnEl;
    }

    createCard(task, customerMap, taskMap) {
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.dataset.taskId = task.id;
        card.draggable = true;

        const customerName = customerMap[task.customerId] || 'Unknown';
        const priority = task.priority || 'medium';
        const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'completed';

        // Get dependencies
        const dependencies = window.flowchartManager ? window.flowchartManager.dependencies : [];
        const prerequisites = dependencies
            .filter(dep => dep.to === task.id)
            .map(dep => taskMap[dep.from])
            .filter(t => t);

        const dependents = dependencies
            .filter(dep => dep.from === task.id)
            .map(dep => taskMap[dep.to])
            .filter(t => t);

        card.innerHTML = `
            <div class="kanban-card-header">
                <div class="kanban-card-title">${this.escapeHtml(task.description)}</div>
                <span class="kanban-card-priority priority-${priority}">${this.getPriorityLabel(priority)}</span>
            </div>
            <div class="kanban-card-body">
                <div class="kanban-card-field">
                    <strong>Customer:</strong> ${this.escapeHtml(customerName)}
                </div>
                <div class="kanban-card-field">
                    <strong>Due:</strong> ${this.formatDate(task.deadline)}${isOverdue ? ' <span class="overdue-badge">⚠ OVERDUE</span>' : ''}
                </div>
                <div class="kanban-card-field">
                    <strong>Assigned:</strong> ${this.escapeHtml(task.responsible)}
                </div>
                ${prerequisites.length > 0 ? `
                <div class="kanban-card-dependencies">
                    <strong>🔗 Depends on:</strong>
                    ${prerequisites.map(t => `<span class="dependency-tag">${this.escapeHtml(t.description)}</span>`).join('')}
                </div>
                ` : ''}
                ${dependents.length > 0 ? `
                <div class="kanban-card-dependencies">
                    <strong>🔒 Blocks:</strong>
                    ${dependents.map(t => `<span class="dependency-tag">${this.escapeHtml(t.description)}</span>`).join('')}
                </div>
                ` : ''}
            </div>
        `;

        // Add drag event listeners
        card.addEventListener('dragstart', (e) => this.handleDragStart(e, task.id));
        card.addEventListener('dragend', (e) => this.handleDragEnd(e));

        return card;
    }

    handleDragStart(e, taskId) {
        this.draggedCard = taskId;
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', taskId);
    }

    handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        this.draggedCard = null;
        
        // Remove all drag-over indicators
        document.querySelectorAll('.kanban-column-content').forEach(el => {
            el.classList.remove('drag-over');
        });
    }

    handleDragOver(e) {
        if (!this.draggedCard) return;
        
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const columnContent = e.currentTarget;
        columnContent.classList.add('drag-over');
    }

    handleDragLeave(e) {
        const columnContent = e.currentTarget;
        
        // Only remove if we're actually leaving the column
        if (!columnContent.contains(e.relatedTarget)) {
            columnContent.classList.remove('drag-over');
        }
    }

    handleDrop(e, columnId) {
        e.preventDefault();
        
        const columnContent = e.currentTarget;
        columnContent.classList.remove('drag-over');
        
        if (!this.draggedCard) return;

        // Update task assignment
        this.taskAssignments[this.draggedCard] = columnId;
        this.saveKanbanData();
        
        // Re-render board
        this.renderKanban();
    }

    openColumnModal() {
        this.currentEditColumnId = null;
        document.getElementById('kanban-column-modal-title').textContent = 'Add Column';
        document.getElementById('kanban-column-form').reset();
        this.columnModal.classList.add('active');
    }

    closeColumnModal() {
        if (this.columnModal) {
            this.columnModal.classList.remove('active');
            document.getElementById('kanban-column-form').reset();
            this.currentEditColumnId = null;
        }
    }

    saveColumn() {
        const form = document.getElementById('kanban-column-form');
        const formData = new FormData(form);
        
        const column = {
            id: this.currentEditColumnId || 'col-' + Date.now(),
            name: formData.get('name').trim(),
            color: formData.get('color')
        };

        if (!column.name) {
            alert('Please enter a column name');
            return;
        }

        if (this.currentEditColumnId) {
            // Edit existing column
            const index = this.columns.findIndex(c => c.id === this.currentEditColumnId);
            if (index !== -1) {
                this.columns[index] = column;
            }
        } else {
            // Add new column
            this.columns.push(column);
        }

        this.saveKanbanData();
        this.closeColumnModal();
        this.renderKanban();
    }

    deleteColumn(columnId) {
        const column = this.columns.find(c => c.id === columnId);
        if (!column) return;

        // Count tasks in this column
        const tasksInColumn = Object.values(this.taskAssignments).filter(colId => colId === columnId).length;
        
        let confirmMessage = `Are you sure you want to delete the "${column.name}" column?`;
        if (tasksInColumn > 0) {
            confirmMessage += ` ${tasksInColumn} task(s) will be unassigned.`;
        }

        if (confirm(confirmMessage)) {
            // Remove column
            this.columns = this.columns.filter(c => c.id !== columnId);
            
            // Unassign tasks from this column
            Object.keys(this.taskAssignments).forEach(taskId => {
                if (this.taskAssignments[taskId] === columnId) {
                    delete this.taskAssignments[taskId];
                }
            });
            
            this.saveKanbanData();
            this.renderKanban();
        }
    }

    openAddTasksModal() {
        this.filterCompany = '';
        this.filterCompanyNumber = '';
        
        const filterCompany = document.getElementById('kanban-task-filter-company');
        const filterCompanyNumber = document.getElementById('kanban-task-filter-company-number');
        if (filterCompany) filterCompany.value = '';
        if (filterCompanyNumber) filterCompanyNumber.value = '';
        
        this.renderTaskSelection();
        this.addTasksModal.classList.add('active');
    }

    closeAddTasksModal() {
        if (this.addTasksModal) {
            this.addTasksModal.classList.remove('active');
        }
    }

    renderTaskSelection() {
        const container = document.getElementById('kanban-tasks-selection-container');
        if (!container) return;

        const tasks = storage.getActiveCustomerTasks();
        const customers = storage.getCustomers();
        
        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = { name: c.name, companyNumber: c.companyNumber };
        });

        // Filter tasks - only show tasks not yet assigned to kanban
        let availableTasks = tasks.filter(task => !this.taskAssignments[task.id]);

        // Apply company name filter
        if (this.filterCompany) {
            availableTasks = availableTasks.filter(task => {
                const customer = customerMap[task.customerId];
                return customer && customer.name.toLowerCase().includes(this.filterCompany);
            });
        }

        // Apply company number filter
        if (this.filterCompanyNumber) {
            availableTasks = availableTasks.filter(task => {
                const customer = customerMap[task.customerId];
                return customer && customer.companyNumber && 
                       customer.companyNumber.toLowerCase().includes(this.filterCompanyNumber);
            });
        }

        if (availableTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-text">
                        ${this.filterCompany || this.filterCompanyNumber ? 
                          'No tasks found matching your filters.' : 
                          'All tasks are already on the Kanban board.'}
                    </div>
                </div>
            `;
            return;
        }

        // Add select all/none buttons
        let html = `
            <div class="pdf-selection-actions">
                <button class="btn btn-secondary" onclick="kanbanManager.selectAllTasks()">Select All</button>
                <button class="btn btn-secondary" onclick="kanbanManager.selectNoneTasks()">Select None</button>
            </div>
        `;

        // Build task selection list
        html += availableTasks.map(task => {
            const customer = customerMap[task.customerId];
            const customerName = customer ? customer.name : 'Unknown';
            const companyNumber = customer ? customer.companyNumber : '';
            
            return `
                <div class="pdf-selection-item">
                    <input type="checkbox" id="kanban-task-${task.id}" value="${task.id}" checked>
                    <label class="pdf-selection-label" for="kanban-task-${task.id}">
                        <strong>${this.escapeHtml(task.description)}</strong>
                        <span class="pdf-selection-meta">${this.escapeHtml(customerName)} ${companyNumber ? `(${this.escapeHtml(companyNumber)})` : ''} - Due: ${this.formatDate(task.deadline)}</span>
                    </label>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    selectAllTasks() {
        const checkboxes = document.querySelectorAll('#kanban-tasks-selection-container input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);
    }

    selectNoneTasks() {
        const checkboxes = document.querySelectorAll('#kanban-tasks-selection-container input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
    }

    confirmAddTasks() {
        // Get selected task IDs
        const checkboxes = document.querySelectorAll('#kanban-tasks-selection-container input[type="checkbox"]:checked');
        const selectedTaskIds = Array.from(checkboxes).map(cb => cb.value);

        if (selectedTaskIds.length === 0) {
            alert('Please select at least one task to add');
            return;
        }

        // Assign selected tasks to the first column (if exists)
        if (this.columns.length === 0) {
            alert('Please create at least one column first');
            return;
        }

        const firstColumnId = this.columns[0].id;
        selectedTaskIds.forEach(taskId => {
            this.taskAssignments[taskId] = firstColumnId;
        });

        this.saveKanbanData();
        this.closeAddTasksModal();
        this.renderKanban();
    }

    resetBoard() {
        if (confirm('Are you sure you want to reset the board? This will restore default columns and clear all task assignments.')) {
            this.columns = this.getDefaultColumns();
            this.taskAssignments = {};
            this.saveKanbanData();
            this.renderKanban();
        }
    }

    exportKanbanToPDF() {
        const tasks = storage.getActiveCustomerTasks();
        const customers = storage.getCustomers();

        if (tasks.length === 0) {
            alert('No tasks to export');
            return;
        }

        const html = this.generateKanbanHTML(tasks, customers);
        pdfManager.openPrintPreview(html);
    }

    generateKanbanHTML(tasks, customers) {
        const now = new Date();
        const dateStr = now.toLocaleString();

        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c.name;
        });

        // Create task map
        const taskMap = {};
        tasks.forEach(t => {
            taskMap[t.id] = t;
        });

        // Get dependencies
        const dependencies = window.flowchartManager ? window.flowchartManager.dependencies : [];

        let html = `
            <div class="print-document">
                <div class="print-header">
                    <h1 class="print-title">Kanban Board</h1>
                    <div class="print-meta">Generated: ${this.escapeHtml(dateStr)} | Total Tasks: ${tasks.length} | Columns: ${this.columns.length}</div>
                </div>
        `;

        // Render each column
        this.columns.forEach(column => {
            const columnTasks = tasks.filter(task => 
                this.taskAssignments[task.id] === column.id
            );

            html += `
                <div class="print-section">
                    <h2 class="print-section-title">${this.escapeHtml(column.name)} (${columnTasks.length} tasks)</h2>
            `;

            if (columnTasks.length === 0) {
                html += `<p>No tasks in this column.</p>`;
            } else {
                columnTasks.forEach(task => {
                    const customerName = customerMap[task.customerId] || 'Unknown';
                    const priority = task.priority || 'medium';
                    const status = task.status || 'pending';
                    const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'completed';

                    // Get task dependencies
                    const prerequisites = dependencies
                        .filter(dep => dep.to === task.id)
                        .map(dep => taskMap[dep.from])
                        .filter(t => t);

                    const dependents = dependencies
                        .filter(dep => dep.from === task.id)
                        .map(dep => taskMap[dep.to])
                        .filter(t => t);

                    html += `
                        <div class="print-item">
                            <div class="print-item-title">${this.escapeHtml(task.description)}${isOverdue ? ' <span class="print-overdue">⚠ OVERDUE</span>' : ''}</div>
                            <div class="print-item-content">
                                <div class="print-item-field"><strong>Customer:</strong> ${this.escapeHtml(customerName)}</div>
                                <div class="print-item-field"><strong>Deadline:</strong> ${this.formatDate(task.deadline)}</div>
                                <div class="print-item-field"><strong>Responsible:</strong> ${this.escapeHtml(task.responsible)}</div>
                                <div class="print-item-field"><strong>Priority:</strong> <span class="print-badge print-badge-${priority}">${this.getPriorityLabel(priority)}</span></div>
                                <div class="print-item-field"><strong>Status:</strong> <span class="print-badge print-badge-${status}">${this.getStatusLabel(status)}</span></div>
                                ${prerequisites.length > 0 ? `
                                    <div class="print-item-field"><strong>Depends on:</strong> ${prerequisites.map(t => this.escapeHtml(t.description)).join(', ')}</div>
                                ` : ''}
                                ${dependents.length > 0 ? `
                                    <div class="print-item-field"><strong>Blocks:</strong> ${dependents.map(t => this.escapeHtml(t.description)).join(', ')}</div>
                                ` : ''}
                                ${task.notes ? `<div class="print-item-field"><strong>Notes:</strong> ${this.escapeHtml(task.notes)}</div>` : ''}
                            </div>
                        </div>
                    `;
                });
            }

            html += `</div>`;
        });

        html += `
                <div class="print-footer">
                    CRM Application - Kanban Board
                </div>
            </div>
        `;

        return html;
    }

    // Helper methods
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
        return priorityMap[priority || 'medium'] || priority;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global kanban manager instance
const kanbanManager = new KanbanManager();
window.kanbanManager = kanbanManager;
