// eisenhower.js - Handles Eisenhower Matrix functionality for task prioritization

class EisenhowerManager {
    constructor() {
        this.matrix = null;
        this.headingsModal = null;
        this.addTasksModal = null;
        this.taskAssignments = {}; // Maps task IDs to quadrant IDs (q1, q2, q3, q4)
        this.quadrantHeadings = {
            q1: 'Do First',
            q2: 'Schedule',
            q3: 'Delegate',
            q4: 'Eliminate'
        };
        this.draggedCard = null;
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
        // Get matrix element
        this.matrix = document.getElementById('eisenhower-matrix');
        this.headingsModal = document.getElementById('eisenhower-headings-modal');
        this.addTasksModal = document.getElementById('eisenhower-add-tasks-modal');
        
        if (!this.matrix) {
            console.error('Eisenhower matrix not found');
            return;
        }

        // Load saved data
        this.loadData();

        // Add tasks button
        const addTasksBtn = document.getElementById('eisenhower-add-tasks-btn');
        if (addTasksBtn) {
            addTasksBtn.addEventListener('click', () => this.openAddTasksModal());
        }

        // Edit headings button
        const editHeadingsBtn = document.getElementById('eisenhower-edit-headings-btn');
        if (editHeadingsBtn) {
            editHeadingsBtn.addEventListener('click', () => this.openHeadingsModal());
        }

        // Reset button
        const resetBtn = document.getElementById('eisenhower-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetMatrix());
        }

        // Export PDF button
        const exportPdfBtn = document.getElementById('export-eisenhower-pdf-btn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => this.exportMatrixToPDF());
        }

        // Headings modal setup
        if (this.headingsModal) {
            const closeBtn = this.headingsModal.querySelector('.close');
            const cancelBtn = this.headingsModal.querySelector('.cancel-btn');
            const form = document.getElementById('eisenhower-headings-form');

            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeHeadingsModal());
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.closeHeadingsModal());
            }

            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveHeadings();
                });
            }

            window.addEventListener('click', (e) => {
                if (e.target === this.headingsModal) {
                    this.closeHeadingsModal();
                }
            });
        }

        // Add tasks modal setup
        if (this.addTasksModal) {
            const closeBtn = this.addTasksModal.querySelector('.close');
            const cancelBtn = this.addTasksModal.querySelector('.cancel-btn');
            const confirmBtn = document.getElementById('eisenhower-add-tasks-confirm-btn');

            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeAddTasksModal());
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.closeAddTasksModal());
            }

            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => this.confirmAddTasks());
            }

            // Filter inputs
            const filterCompanyInput = document.getElementById('eisenhower-task-filter-company');
            const filterCompanyNumberInput = document.getElementById('eisenhower-task-filter-company-number');
            const clearFilterBtn = document.getElementById('eisenhower-task-clear-filter');

            if (filterCompanyInput) {
                filterCompanyInput.addEventListener('input', () => {
                    this.filterCompany = filterCompanyInput.value.toLowerCase();
                    this.updateTaskSelectionList();
                });
            }

            if (filterCompanyNumberInput) {
                filterCompanyNumberInput.addEventListener('input', () => {
                    this.filterCompanyNumber = filterCompanyNumberInput.value.toLowerCase();
                    this.updateTaskSelectionList();
                });
            }

            if (clearFilterBtn) {
                clearFilterBtn.addEventListener('click', () => {
                    this.filterCompany = '';
                    this.filterCompanyNumber = '';
                    if (filterCompanyInput) filterCompanyInput.value = '';
                    if (filterCompanyNumberInput) filterCompanyNumberInput.value = '';
                    this.updateTaskSelectionList();
                });
            }

            window.addEventListener('click', (e) => {
                if (e.target === this.addTasksModal) {
                    this.closeAddTasksModal();
                }
            });
        }

        // Initial render
        this.renderMatrix();
    }

    loadData() {
        const savedAssignments = localStorage.getItem('eisenhower_assignments');
        const savedHeadings = localStorage.getItem('eisenhower_headings');
        
        if (savedAssignments) {
            try {
                this.taskAssignments = JSON.parse(savedAssignments);
            } catch (e) {
                console.error('Error loading task assignments:', e);
            }
        }

        if (savedHeadings) {
            try {
                this.quadrantHeadings = JSON.parse(savedHeadings);
            } catch (e) {
                console.error('Error loading headings:', e);
            }
        }
    }

    saveData() {
        localStorage.setItem('eisenhower_assignments', JSON.stringify(this.taskAssignments));
        localStorage.setItem('eisenhower_headings', JSON.stringify(this.quadrantHeadings));
    }

    openHeadingsModal() {
        if (!this.headingsModal) return;

        // Populate form with current headings
        document.getElementById('eisenhower-q1-heading').value = this.quadrantHeadings.q1;
        document.getElementById('eisenhower-q2-heading').value = this.quadrantHeadings.q2;
        document.getElementById('eisenhower-q3-heading').value = this.quadrantHeadings.q3;
        document.getElementById('eisenhower-q4-heading').value = this.quadrantHeadings.q4;

        this.headingsModal.classList.add('active');
    }

    closeHeadingsModal() {
        if (this.headingsModal) {
            this.headingsModal.classList.remove('active');
        }
    }

    saveHeadings() {
        this.quadrantHeadings.q1 = document.getElementById('eisenhower-q1-heading').value;
        this.quadrantHeadings.q2 = document.getElementById('eisenhower-q2-heading').value;
        this.quadrantHeadings.q3 = document.getElementById('eisenhower-q3-heading').value;
        this.quadrantHeadings.q4 = document.getElementById('eisenhower-q4-heading').value;

        this.saveData();
        this.closeHeadingsModal();
        this.renderMatrix();
    }

    openAddTasksModal() {
        if (!this.addTasksModal) return;

        // Reset filters
        this.filterCompany = '';
        this.filterCompanyNumber = '';
        const filterCompanyInput = document.getElementById('eisenhower-task-filter-company');
        const filterCompanyNumberInput = document.getElementById('eisenhower-task-filter-company-number');
        if (filterCompanyInput) filterCompanyInput.value = '';
        if (filterCompanyNumberInput) filterCompanyNumberInput.value = '';

        this.updateTaskSelectionList();
        this.addTasksModal.classList.add('active');
    }

    closeAddTasksModal() {
        if (this.addTasksModal) {
            this.addTasksModal.classList.remove('active');
        }
    }

    updateTaskSelectionList() {
        const container = document.getElementById('eisenhower-tasks-selection-container');
        if (!container) return;

        const tasks = storage.getTasks();
        const customers = storage.getCustomers();

        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c;
        });

        // Filter tasks that are not already in the matrix
        const availableTasks = tasks.filter(task => {
            // Check if already in matrix
            if (this.taskAssignments[task.id]) return false;

            // Apply filters
            const customer = customerMap[task.customerId];
            if (this.filterCompany && customer) {
                if (!customer.name.toLowerCase().includes(this.filterCompany)) {
                    return false;
                }
            }
            if (this.filterCompanyNumber && customer) {
                if (!customer.companyNumber.toLowerCase().includes(this.filterCompanyNumber)) {
                    return false;
                }
            }

            return true;
        });

        if (availableTasks.length === 0) {
            container.innerHTML = `
                <div class="eisenhower-empty">
                    <p>No available tasks to add. All tasks are already in the matrix or filtered out.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = availableTasks.map(task => {
            const customer = customerMap[task.customerId];
            const customerName = customer ? customer.name : 'Unknown';
            const companyNumber = customer ? customer.companyNumber : 'N/A';
            
            return `
                <div class="pdf-selection-item">
                    <label>
                        <input type="checkbox" value="${task.id}" class="eisenhower-task-checkbox">
                        <div class="task-selection-info">
                            <div class="task-selection-title">${this.escapeHtml(task.description)}</div>
                            <div class="task-selection-details">
                                Customer: ${this.escapeHtml(customerName)} (${this.escapeHtml(companyNumber)}) | 
                                Due: ${this.formatDate(task.deadline)} | 
                                Priority: ${this.getPriorityLabel(task.priority)}
                            </div>
                        </div>
                    </label>
                </div>
            `;
        }).join('');
    }

    confirmAddTasks() {
        const checkboxes = document.querySelectorAll('.eisenhower-task-checkbox:checked');
        const selectedTaskIds = Array.from(checkboxes).map(cb => cb.value);

        if (selectedTaskIds.length === 0) {
            alert('Please select at least one task to add.');
            return;
        }

        // Add tasks to first quadrant by default
        selectedTaskIds.forEach(taskId => {
            this.taskAssignments[taskId] = 'q1';
        });

        this.saveData();
        this.closeAddTasksModal();
        this.renderMatrix();
    }

    resetMatrix() {
        if (!confirm('This will remove all tasks from the Eisenhower Matrix. Are you sure?')) {
            return;
        }

        this.taskAssignments = {};
        this.saveData();
        this.renderMatrix();
    }

    renderMatrix() {
        if (!this.matrix) return;

        const tasks = storage.getTasks();
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

        // Clear matrix
        this.matrix.innerHTML = '';

        // Create 2x2 grid
        const quadrants = [
            { id: 'q1', label: 'URGENT & IMPORTANT', color: 'red' },
            { id: 'q2', label: 'NOT URGENT & IMPORTANT', color: 'blue' },
            { id: 'q3', label: 'URGENT & NOT IMPORTANT', color: 'orange' },
            { id: 'q4', label: 'NOT URGENT & NOT IMPORTANT', color: 'gray' }
        ];

        quadrants.forEach(quadrant => {
            const quadrantEl = this.createQuadrant(quadrant, tasks, customerMap, taskMap);
            this.matrix.appendChild(quadrantEl);
        });
    }

    createQuadrant(quadrant, tasks, customerMap, taskMap) {
        const quadrantEl = document.createElement('div');
        quadrantEl.className = `eisenhower-quadrant eisenhower-quadrant-${quadrant.color}`;
        quadrantEl.dataset.quadrantId = quadrant.id;

        // Get tasks for this quadrant
        const quadrantTasks = tasks.filter(task => 
            this.taskAssignments[task.id] === quadrant.id
        );

        // Quadrant header
        const header = document.createElement('div');
        header.className = 'eisenhower-quadrant-header';
        header.innerHTML = `
            <div class="eisenhower-quadrant-label">${quadrant.label}</div>
            <div class="eisenhower-quadrant-heading">${this.escapeHtml(this.quadrantHeadings[quadrant.id])}</div>
            <div class="eisenhower-quadrant-count">${quadrantTasks.length} tasks</div>
        `;
        quadrantEl.appendChild(header);

        // Quadrant content (droppable area)
        const content = document.createElement('div');
        content.className = 'eisenhower-quadrant-content';
        
        // Add drop event listeners
        content.addEventListener('dragover', (e) => this.handleDragOver(e));
        content.addEventListener('drop', (e) => this.handleDrop(e, quadrant.id));
        content.addEventListener('dragleave', (e) => this.handleDragLeave(e));

        // Render cards in this quadrant
        quadrantTasks.forEach(task => {
            const card = this.createCard(task, customerMap, taskMap);
            content.appendChild(card);
        });

        // Add drop zone indicator
        if (quadrantTasks.length === 0) {
            content.innerHTML = '<div class="eisenhower-drop-zone">Drop tasks here</div>';
        }

        quadrantEl.appendChild(content);

        return quadrantEl;
    }

    createCard(task, customerMap, taskMap) {
        const card = document.createElement('div');
        card.className = 'eisenhower-card';
        card.dataset.taskId = task.id;
        card.draggable = true;

        const customerName = customerMap[task.customerId] || 'Unknown';
        const priority = task.priority || 'medium';
        const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'completed';

        card.innerHTML = `
            <div class="eisenhower-card-header">
                <div class="eisenhower-card-title">${this.escapeHtml(task.description)}</div>
                <button class="eisenhower-card-remove" onclick="eisenhowerManager.removeTask('${task.id}')" title="Remove from matrix">×</button>
            </div>
            <div class="eisenhower-card-body">
                <div class="eisenhower-card-field">
                    <strong>Customer:</strong> ${this.escapeHtml(customerName)}
                </div>
                <div class="eisenhower-card-field">
                    <strong>Due:</strong> ${this.formatDate(task.deadline)}${isOverdue ? ' <span class="overdue-badge">⚠</span>' : ''}
                </div>
                <div class="eisenhower-card-field">
                    <strong>Assigned:</strong> ${this.escapeHtml(task.responsible)}
                </div>
                <div class="eisenhower-card-field">
                    <span class="eisenhower-card-priority priority-${priority}">${this.getPriorityLabel(priority)}</span>
                </div>
            </div>
        `;

        // Add drag event listeners
        card.addEventListener('dragstart', (e) => this.handleDragStart(e, task.id));
        card.addEventListener('dragend', (e) => this.handleDragEnd(e));

        return card;
    }

    removeTask(taskId) {
        if (!confirm('Remove this task from the matrix?')) {
            return;
        }

        delete this.taskAssignments[taskId];
        this.saveData();
        this.renderMatrix();
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
        document.querySelectorAll('.eisenhower-quadrant-content').forEach(content => {
            content.classList.remove('drag-over');
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const content = e.currentTarget;
        if (content.classList.contains('eisenhower-quadrant-content')) {
            content.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        const content = e.currentTarget;
        if (content.classList.contains('eisenhower-quadrant-content')) {
            content.classList.remove('drag-over');
        }
    }

    handleDrop(e, quadrantId) {
        e.preventDefault();
        
        const content = e.currentTarget;
        content.classList.remove('drag-over');
        
        if (!this.draggedCard) return;
        
        // Update task assignment
        this.taskAssignments[this.draggedCard] = quadrantId;
        this.saveData();
        
        // Re-render
        this.renderMatrix();
    }

    exportMatrixToPDF() {
        const tasks = storage.getTasks();
        const customers = storage.getCustomers();

        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c;
        });

        // Get tasks by quadrant
        const quadrants = [
            { id: 'q1', label: 'URGENT & IMPORTANT' },
            { id: 'q2', label: 'NOT URGENT & IMPORTANT' },
            { id: 'q3', label: 'URGENT & NOT IMPORTANT' },
            { id: 'q4', label: 'NOT URGENT & NOT IMPORTANT' }
        ];

        let html = `
            <div class="pdf-header">
                <h1>Eisenhower Matrix</h1>
                <p>Generated on ${this.formatDate(new Date().toISOString().split('T')[0])}</p>
            </div>
            <div class="eisenhower-matrix-pdf">
        `;

        quadrants.forEach(quadrant => {
            const quadrantTasks = tasks.filter(task => 
                this.taskAssignments[task.id] === quadrant.id
            );

            html += `
                <div class="eisenhower-quadrant-pdf">
                    <h2>${quadrant.label}</h2>
                    <h3>${this.escapeHtml(this.quadrantHeadings[quadrant.id])}</h3>
                    <div class="eisenhower-tasks-pdf">
            `;

            if (quadrantTasks.length === 0) {
                html += '<p style="color: #a0a5b0; font-style: italic;">No tasks in this quadrant</p>';
            } else {
                quadrantTasks.forEach((task, index) => {
                    const customer = customerMap[task.customerId];
                    const customerName = customer ? customer.name : 'Unknown';
                    const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'completed';
                    
                    html += `
                        <div class="task-item-pdf">
                            <div class="task-number">${index + 1}.</div>
                            <div class="task-details-pdf">
                                <div class="task-title-pdf">${this.escapeHtml(task.description)}</div>
                                <div class="task-meta-pdf">
                                    Customer: ${this.escapeHtml(customerName)} | 
                                    Due: ${this.formatDate(task.deadline)}${isOverdue ? ' ⚠ OVERDUE' : ''} | 
                                    Assigned: ${this.escapeHtml(task.responsible)} | 
                                    Priority: ${this.getPriorityLabel(task.priority)}
                                </div>
                            </div>
                        </div>
                    `;
                });
            }

            html += `
                    </div>
                </div>
            `;
        });

        html += '</div>';

        // Use PDF manager to generate
        if (window.pdfManager) {
            window.pdfManager.generatePrintPreview(html, 'Eisenhower Matrix');
        } else {
            alert('PDF manager not available');
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    getPriorityLabel(priority) {
        const labels = {
            'low': 'Low',
            'medium': 'Medium',
            'high': 'High'
        };
        return labels[priority] || 'Medium';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the Eisenhower manager
const eisenhowerManager = new EisenhowerManager();

// Make it globally accessible
window.eisenhowerManager = eisenhowerManager;

console.log('Eisenhower Matrix manager loaded successfully!');
