// flowchart.js - Handles flowchart functionality for task dependencies

class FlowchartManager {
    constructor() {
        this.canvas = null;
        this.dependencyModal = null;
        this.dependencies = [];
        this.taskPositions = {};
        this.draggedTask = null;
        this.dragOffset = { x: 0, y: 0 };
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
        // Get canvas element
        this.canvas = document.getElementById('flowchart-canvas');
        this.dependencyModal = document.getElementById('dependency-modal');
        
        if (!this.canvas) {
            console.error('Flowchart canvas not found');
            return;
        }

        // Add dependency button
        const addDependencyBtn = document.getElementById('flowchart-add-dependency-btn');
        if (addDependencyBtn) {
            addDependencyBtn.addEventListener('click', () => this.openDependencyModal());
        }

        // Clear button
        const clearBtn = document.getElementById('flowchart-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFlowchart());
        }

        // Export PDF button
        const exportPdfBtn = document.getElementById('export-flowchart-pdf-btn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => this.exportFlowchartToPDF());
        }

        // Dependency modal setup
        if (this.dependencyModal) {
            const closeBtn = this.dependencyModal.querySelector('.close');
            const cancelBtn = this.dependencyModal.querySelector('.cancel-btn');
            const form = document.getElementById('dependency-form');

            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeDependencyModal());
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.closeDependencyModal());
            }

            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.addDependency();
                });
            }

            window.addEventListener('click', (e) => {
                if (e.target === this.dependencyModal) {
                    this.closeDependencyModal();
                }
            });
        }

        // Load saved data
        this.loadFlowchartData();

        // Initial render
        this.renderFlowchart();
    }

    loadFlowchartData() {
        // Load dependencies from localStorage
        const savedDependencies = localStorage.getItem('crm_flowchart_dependencies');
        if (savedDependencies) {
            try {
                this.dependencies = JSON.parse(savedDependencies);
            } catch (e) {
                console.error('Error loading dependencies:', e);
                this.dependencies = [];
            }
        }

        // Load task positions from localStorage
        const savedPositions = localStorage.getItem('crm_flowchart_positions');
        if (savedPositions) {
            try {
                this.taskPositions = JSON.parse(savedPositions);
            } catch (e) {
                console.error('Error loading positions:', e);
                this.taskPositions = {};
            }
        }
    }

    saveFlowchartData() {
        // Save dependencies to localStorage
        try {
            localStorage.setItem('crm_flowchart_dependencies', JSON.stringify(this.dependencies));
            localStorage.setItem('crm_flowchart_positions', JSON.stringify(this.taskPositions));
        } catch (e) {
            console.error('Error saving flowchart data:', e);
        }
    }

    renderFlowchart() {
        if (!this.canvas) return;

        const tasks = storage.getActiveCustomerTasks();
        const customers = storage.getCustomers();

        if (tasks.length === 0) {
            this.canvas.innerHTML = `
                <div class="flowchart-empty">
                    <div>
                        <div style="font-size: 48px; margin-bottom: 15px;">📊</div>
                        <div>No tasks available. Add tasks in the Tasks tab to create a flowchart.</div>
                    </div>
                </div>
            `;
            return;
        }

        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c.name;
        });

        // Clear canvas
        this.canvas.innerHTML = '';

        // Create SVG for arrows
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'flowchart-svg');
        svg.innerHTML = `
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <polygon points="0 0, 10 3, 0 6" fill="#d4af37" />
                </marker>
            </defs>
        `;
        this.canvas.appendChild(svg);

        // Render tasks
        tasks.forEach((task, index) => {
            const taskBox = this.createTaskBox(task, customerMap[task.customerId] || 'Unknown', index);
            this.canvas.appendChild(taskBox);
        });

        // Render dependency arrows
        this.renderDependencyArrows();
    }

    createTaskBox(task, customerName, index) {
        const box = document.createElement('div');
        box.className = 'flowchart-task';
        box.dataset.taskId = task.id;

        // Set position (use saved position or calculate default)
        let position = this.taskPositions[task.id];
        if (!position) {
            // Default grid layout
            const col = index % 4;
            const row = Math.floor(index / 4);
            position = {
                x: 50 + col * 220,
                y: 50 + row * 140
            };
            this.taskPositions[task.id] = position;
        }

        box.style.left = position.x + 'px';
        box.style.top = position.y + 'px';

        // Task content
        const statusClass = task.status || 'pending';
        box.innerHTML = `
            <div class="flowchart-task-title">${this.escapeHtml(task.description)}</div>
            <div class="flowchart-task-info">
                <div class="flowchart-task-info-item"><strong>Customer:</strong> ${this.escapeHtml(customerName)}</div>
                <div class="flowchart-task-info-item"><strong>Due:</strong> ${this.formatDate(task.deadline)}</div>
                <div class="flowchart-task-info-item"><strong>Responsible:</strong> ${this.escapeHtml(task.responsible)}</div>
            </div>
            <div class="flowchart-task-status ${statusClass}">${this.getStatusLabel(task.status)}</div>
        `;

        // Make draggable
        box.addEventListener('mousedown', (e) => this.startDrag(e, box, task.id));

        return box;
    }

    startDrag(e, box, taskId) {
        e.preventDefault();
        this.draggedTask = { box, taskId };
        
        const rect = box.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        box.classList.add('dragging');

        // Add mouse move and up listeners
        const onMouseMove = (e) => this.drag(e, canvasRect);
        const onMouseUp = () => this.endDrag(onMouseMove, onMouseUp);

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    drag(e, canvasRect) {
        if (!this.draggedTask) return;

        const x = e.clientX - canvasRect.left - this.dragOffset.x;
        const y = e.clientY - canvasRect.top - this.dragOffset.y;

        // Keep within bounds
        const maxX = canvasRect.width - this.draggedTask.box.offsetWidth;
        const maxY = canvasRect.height - this.draggedTask.box.offsetHeight;

        const boundedX = Math.max(0, Math.min(x, maxX));
        const boundedY = Math.max(0, Math.min(y, maxY));

        this.draggedTask.box.style.left = boundedX + 'px';
        this.draggedTask.box.style.top = boundedY + 'px';

        // Update position
        this.taskPositions[this.draggedTask.taskId] = {
            x: boundedX,
            y: boundedY
        };

        // Update arrows
        this.renderDependencyArrows();
    }

    endDrag(onMouseMove, onMouseUp) {
        if (this.draggedTask) {
            this.draggedTask.box.classList.remove('dragging');
            this.draggedTask = null;
            this.saveFlowchartData();
        }

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    renderDependencyArrows() {
        const svg = this.canvas.querySelector('.flowchart-svg');
        if (!svg) return;

        // Clear existing arrows
        const existingPaths = svg.querySelectorAll('.flowchart-arrow');
        existingPaths.forEach(path => path.remove());

        // Draw arrows for each dependency
        this.dependencies.forEach(dep => {
            const fromBox = this.canvas.querySelector(`[data-task-id="${dep.from}"]`);
            const toBox = this.canvas.querySelector(`[data-task-id="${dep.to}"]`);

            if (fromBox && toBox) {
                const path = this.createArrow(fromBox, toBox);
                svg.appendChild(path);
            }
        });
    }

    createArrow(fromBox, toBox) {
        const fromRect = fromBox.getBoundingClientRect();
        const toRect = toBox.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();

        // Calculate center points relative to canvas
        const fromX = fromRect.left - canvasRect.left + fromRect.width / 2;
        const fromY = fromRect.top - canvasRect.top + fromRect.height / 2;
        const toX = toRect.left - canvasRect.left + toRect.width / 2;
        const toY = toRect.top - canvasRect.top + toRect.height / 2;

        // Calculate angle
        const angle = Math.atan2(toY - fromY, toX - fromX);

        // Calculate start and end points at box edges
        const fromEdgeX = fromX + Math.cos(angle) * (fromRect.width / 2);
        const fromEdgeY = fromY + Math.sin(angle) * (fromRect.height / 2);
        const toEdgeX = toX - Math.cos(angle) * (toRect.width / 2);
        const toEdgeY = toY - Math.sin(angle) * (toRect.height / 2);

        // Create path element
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'flowchart-arrow');
        path.setAttribute('d', `M ${fromEdgeX} ${fromEdgeY} L ${toEdgeX} ${toEdgeY}`);

        return path;
    }

    openDependencyModal() {
        if (!this.dependencyModal) return;

        // Update task dropdowns
        const fromSelect = document.getElementById('dependency-from');
        const toSelect = document.getElementById('dependency-to');

        if (!fromSelect || !toSelect) return;

        const tasks = storage.getActiveCustomerTasks();
        const customers = storage.getCustomers();

        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c.name;
        });

        // Build options
        const options = tasks.map(task => {
            const customerName = customerMap[task.customerId] || 'Unknown';
            return `<option value="${task.id}">${this.escapeHtml(task.description)} (${this.escapeHtml(customerName)})</option>`;
        }).join('');

        fromSelect.innerHTML = '<option value="">Select Task</option>' + options;
        toSelect.innerHTML = '<option value="">Select Task</option>' + options;

        this.dependencyModal.classList.add('active');
    }

    closeDependencyModal() {
        if (this.dependencyModal) {
            this.dependencyModal.classList.remove('active');
            document.getElementById('dependency-form').reset();
        }
    }

    addDependency() {
        const fromTaskId = document.getElementById('dependency-from').value;
        const toTaskId = document.getElementById('dependency-to').value;

        if (!fromTaskId || !toTaskId) {
            alert('Please select both tasks');
            return;
        }

        if (fromTaskId === toTaskId) {
            alert('A task cannot depend on itself');
            return;
        }

        // Check if dependency already exists
        const exists = this.dependencies.some(dep => 
            dep.from === fromTaskId && dep.to === toTaskId
        );

        if (exists) {
            alert('This dependency already exists');
            return;
        }

        // Check for circular dependencies
        if (this.wouldCreateCircularDependency(fromTaskId, toTaskId)) {
            alert('This would create a circular dependency, which is not allowed');
            return;
        }

        // Add dependency
        this.dependencies.push({
            from: fromTaskId,
            to: toTaskId
        });

        this.saveFlowchartData();
        this.renderDependencyArrows();
        this.closeDependencyModal();
    }

    wouldCreateCircularDependency(fromTaskId, toTaskId) {
        // Check if adding this dependency would create a cycle
        // Use depth-first search to detect cycles
        const visited = new Set();
        const stack = [toTaskId];

        while (stack.length > 0) {
            const current = stack.pop();
            
            if (current === fromTaskId) {
                return true; // Found a cycle
            }

            if (visited.has(current)) {
                continue;
            }

            visited.add(current);

            // Find all tasks that depend on current
            const dependents = this.dependencies
                .filter(dep => dep.from === current)
                .map(dep => dep.to);

            stack.push(...dependents);
        }

        return false;
    }

    clearFlowchart() {
        if (confirm('Are you sure you want to clear all dependencies? Task positions will be preserved.')) {
            this.dependencies = [];
            this.saveFlowchartData();
            this.renderDependencyArrows();
        }
    }

    exportFlowchartToPDF() {
        const tasks = storage.getActiveCustomerTasks();
        const customers = storage.getCustomers();

        if (tasks.length === 0) {
            alert('No tasks to export');
            return;
        }

        const html = this.generateFlowchartHTML(tasks, customers);
        pdfManager.openPrintPreview(html);
    }

    generateFlowchartHTML(tasks, customers) {
        const now = new Date();
        const dateStr = now.toLocaleString();

        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c.name;
        });

        // Create task lookup
        const taskMap = {};
        tasks.forEach(t => {
            taskMap[t.id] = t;
        });

        let html = `
            <div class="print-document">
                <div class="print-header">
                    <h1 class="print-title">Task Flowchart</h1>
                    <div class="print-meta">Generated: ${this.escapeHtml(dateStr)} | Total Tasks: ${tasks.length} | Dependencies: ${this.dependencies.length}</div>
                </div>
        `;

        // Task list with dependencies
        html += `
            <div class="print-section">
                <h2 class="print-section-title">Task Dependencies</h2>
        `;

        if (this.dependencies.length === 0) {
            html += `<p>No dependencies defined.</p>`;
        } else {
            html += `<table class="print-table">
                <thead>
                    <tr>
                        <th>Prerequisite Task</th>
                        <th>Dependent Task</th>
                        <th>Customer</th>
                    </tr>
                </thead>
                <tbody>
            `;

            this.dependencies.forEach(dep => {
                const fromTask = taskMap[dep.from];
                const toTask = taskMap[dep.to];

                if (fromTask && toTask) {
                    const fromCustomer = customerMap[fromTask.customerId] || 'Unknown';
                    const toCustomer = customerMap[toTask.customerId] || 'Unknown';

                    html += `
                        <tr>
                            <td><strong>${this.escapeHtml(fromTask.description)}</strong><br><small>${this.escapeHtml(fromCustomer)}</small></td>
                            <td><strong>${this.escapeHtml(toTask.description)}</strong><br><small>${this.escapeHtml(toCustomer)}</small></td>
                            <td>${this.escapeHtml(toCustomer)}</td>
                        </tr>
                    `;
                }
            });

            html += `
                </tbody>
            </table>`;
        }

        html += `</div>`;

        // All tasks with details
        html += `
            <div class="print-section">
                <h2 class="print-section-title">Task Details</h2>
        `;

        tasks.forEach(task => {
            const customerName = customerMap[task.customerId] || 'Unknown';
            const priority = task.priority || 'medium';
            const status = task.status || 'pending';

            // Find prerequisites and dependents
            const prerequisites = this.dependencies
                .filter(dep => dep.to === task.id)
                .map(dep => taskMap[dep.from])
                .filter(t => t);

            const dependents = this.dependencies
                .filter(dep => dep.from === task.id)
                .map(dep => taskMap[dep.to])
                .filter(t => t);

            html += `
                <div class="print-item">
                    <div class="print-item-title">${this.escapeHtml(task.description)}</div>
                    <div class="print-item-content">
                        <div class="print-item-field"><strong>Customer:</strong> ${this.escapeHtml(customerName)}</div>
                        <div class="print-item-field"><strong>Deadline:</strong> ${this.formatDate(task.deadline)}</div>
                        <div class="print-item-field"><strong>Responsible:</strong> ${this.escapeHtml(task.responsible)}</div>
                        <div class="print-item-field"><strong>Priority:</strong> <span class="print-badge print-badge-${priority}">${this.getPriorityLabel(priority)}</span></div>
                        <div class="print-item-field"><strong>Status:</strong> <span class="print-badge print-badge-${status}">${this.getStatusLabel(status)}</span></div>
                        ${prerequisites.length > 0 ? `
                            <div class="print-item-field"><strong>Prerequisites:</strong> ${prerequisites.map(t => this.escapeHtml(t.description)).join(', ')}</div>
                        ` : ''}
                        ${dependents.length > 0 ? `
                            <div class="print-item-field"><strong>Blocks:</strong> ${dependents.map(t => this.escapeHtml(t.description)).join(', ')}</div>
                        ` : ''}
                        ${task.notes ? `<div class="print-item-field"><strong>Notes:</strong> ${this.escapeHtml(task.notes)}</div>` : ''}
                    </div>
                </div>
            `;
        });

        html += `
                </div>
                <div class="print-footer">
                    CRM Application - Task Flowchart
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

// Create global flowchart manager instance
const flowchartManager = new FlowchartManager();
window.flowchartManager = flowchartManager;
