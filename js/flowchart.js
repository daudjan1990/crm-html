// flowchart.js - Handles flowchart functionality for task dependencies

class FlowchartManager {
    constructor() {
        this.canvas = null;
        this.dependencyModal = null;
        this.addTasksModal = null;
        this.dependencies = [];
        this.taskPositions = {};
        this.selectedTasks = new Set(); // Track which tasks are added to flowchart
        this.draggedTask = null;
        this.dragOffset = { x: 0, y: 0 };
        this.filterCompany = '';
        this.filterCompanyNumber = '';
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
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
        this.addTasksModal = document.getElementById('flowchart-add-tasks-modal');
        
        if (!this.canvas) {
            console.error('Flowchart canvas not found');
            return;
        }

        // Add tasks button
        const addTasksBtn = document.getElementById('flowchart-add-tasks-btn');
        if (addTasksBtn) {
            addTasksBtn.addEventListener('click', () => this.openAddTasksModal());
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

        // Auto-arrange button
        const autoArrangeBtn = document.getElementById('flowchart-auto-arrange-btn');
        if (autoArrangeBtn) {
            autoArrangeBtn.addEventListener('click', () => this.autoArrangeTasks());
        }

        // Reset view button
        const resetViewBtn = document.getElementById('flowchart-reset-view-btn');
        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', () => this.resetView());
        }

        // Add tasks modal setup
        if (this.addTasksModal) {
            const closeBtn = this.addTasksModal.querySelector('.close');
            const cancelBtn = this.addTasksModal.querySelector('.cancel-btn');
            const confirmBtn = document.getElementById('flowchart-add-tasks-confirm-btn');

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
            const filterCompany = document.getElementById('flowchart-task-filter-company');
            const filterCompanyNumber = document.getElementById('flowchart-task-filter-company-number');
            const clearFilterBtn = document.getElementById('flowchart-task-clear-filter');

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

        // Zoom and pan functionality
        if (this.canvas) {
            // Mouse wheel zoom
            this.canvas.addEventListener('wheel', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? 0.9 : 1.1;
                    this.zoom *= delta;
                    this.zoom = Math.max(0.3, Math.min(3, this.zoom));
                    this.applyTransform();
                }
            }, { passive: false });

            // Pan with middle mouse or shift + drag
            this.canvas.addEventListener('mousedown', (e) => {
                if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
                    e.preventDefault();
                    this.isPanning = true;
                    this.panStart = { x: e.clientX - this.pan.x, y: e.clientY - this.pan.y };
                    this.canvas.style.cursor = 'grabbing';
                }
            });

            document.addEventListener('mousemove', (e) => {
                if (this.isPanning) {
                    this.pan.x = e.clientX - this.panStart.x;
                    this.pan.y = e.clientY - this.panStart.y;
                    this.applyTransform();
                }
            });

            document.addEventListener('mouseup', (e) => {
                if (e.button === 1 || e.button === 0) {
                    this.isPanning = false;
                    this.canvas.style.cursor = '';
                }
            });
        }

        // Load saved data
        this.loadFlowchartData();

        // Wait for storage to be ready before initial render
        storage.initPromise.then(() => {
            this.renderFlowchart();
        }).catch(err => {
            console.error('Error waiting for storage initialization:', err);
            this.renderFlowchart(); // Render anyway to show empty state
        });
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

        // Load selected tasks from localStorage
        const savedSelectedTasks = localStorage.getItem('crm_flowchart_selected_tasks');
        if (savedSelectedTasks) {
            try {
                this.selectedTasks = new Set(JSON.parse(savedSelectedTasks));
            } catch (e) {
                console.error('Error loading selected tasks:', e);
                this.selectedTasks = new Set();
            }
        }
    }

    saveFlowchartData() {
        // Save dependencies to localStorage
        try {
            localStorage.setItem('crm_flowchart_dependencies', JSON.stringify(this.dependencies));
            localStorage.setItem('crm_flowchart_positions', JSON.stringify(this.taskPositions));
            localStorage.setItem('crm_flowchart_selected_tasks', JSON.stringify(Array.from(this.selectedTasks)));
        } catch (e) {
            console.error('Error saving flowchart data:', e);
        }
    }

    applyTransform() {
        if (!this.canvas) return;
        const content = this.canvas.querySelector('.flowchart-content');
        if (content) {
            content.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
        }
    }

    resetView() {
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.applyTransform();
    }

    autoArrangeTasks() {
        const allTasks = storage.getActiveCustomerTasks();
        const tasks = allTasks.filter(task => this.selectedTasks.has(task.id));
        
        if (tasks.length === 0) return;

        // Build dependency graph
        const graph = new Map();
        const inDegree = new Map();
        
        tasks.forEach(task => {
            graph.set(task.id, []);
            inDegree.set(task.id, 0);
        });

        this.dependencies.forEach(dep => {
            if (graph.has(dep.from) && graph.has(dep.to)) {
                graph.get(dep.from).push(dep.to);
                inDegree.set(dep.to, inDegree.get(dep.to) + 1);
            }
        });

        // Topological sort to determine layers
        const layers = [];
        const taskLayer = new Map();
        const queue = [];

        // Start with tasks that have no dependencies
        inDegree.forEach((degree, taskId) => {
            if (degree === 0) {
                queue.push(taskId);
                taskLayer.set(taskId, 0);
            }
        });

        while (queue.length > 0) {
            const current = queue.shift();
            const currentLayer = taskLayer.get(current);

            if (!layers[currentLayer]) {
                layers[currentLayer] = [];
            }
            layers[currentLayer].push(current);

            const dependents = graph.get(current) || [];
            dependents.forEach(dependent => {
                inDegree.set(dependent, inDegree.get(dependent) - 1);
                if (inDegree.get(dependent) === 0) {
                    taskLayer.set(dependent, currentLayer + 1);
                    queue.push(dependent);
                }
            });
        }

        // Handle any remaining tasks (circular dependencies or disconnected)
        tasks.forEach(task => {
            if (!taskLayer.has(task.id)) {
                const lastLayer = layers.length;
                if (!layers[lastLayer]) {
                    layers[lastLayer] = [];
                }
                layers[lastLayer].push(task.id);
                taskLayer.set(task.id, lastLayer);
            }
        });

        // Position tasks based on layers
        const layerSpacing = 280;
        const taskSpacing = 160;
        const startX = 100;
        const startY = 80;

        layers.forEach((layerTasks, layerIndex) => {
            const x = startX + layerIndex * layerSpacing;
            layerTasks.forEach((taskId, indexInLayer) => {
                const y = startY + indexInLayer * taskSpacing;
                this.taskPositions[taskId] = { x, y };
            });
        });

        this.saveFlowchartData();
        this.renderFlowchart();
    }

    renderFlowchart() {
        if (!this.canvas) return;

        const allTasks = storage.getActiveCustomerTasks();
        const customers = storage.getCustomers();

        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c.name;
        });

        // Only show tasks that are selected for the flowchart
        let tasks = allTasks.filter(task => this.selectedTasks.has(task.id));

        if (tasks.length === 0) {
            const message = 'No tasks in flowchart. Click "Add Tasks" to select tasks to display.';
            this.canvas.innerHTML = `
                <div class="flowchart-empty">
                    <div>
                        <div style="font-size: 48px; margin-bottom: 15px;">📊</div>
                        <div>${message}</div>
                    </div>
                </div>
            `;
            return;
        }

        // Clear canvas
        this.canvas.innerHTML = '';

        // Create container for zoom/pan
        const content = document.createElement('div');
        content.className = 'flowchart-content';
        this.canvas.appendChild(content);

        // Create SVG for arrows
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'flowchart-svg');
        svg.innerHTML = `
            <defs>
                <marker id="arrowhead" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto">
                    <polygon points="0 0, 12 6, 0 12" fill="#d4af37" />
                </marker>
            </defs>
        `;
        content.appendChild(svg);

        // Render tasks
        tasks.forEach((task, index) => {
            const taskBox = this.createTaskBox(task, customerMap[task.customerId] || 'Unknown', index);
            content.appendChild(taskBox);
        });

        // Apply current transform
        this.applyTransform();

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
            <button class="flowchart-task-delete" title="Remove from flowchart">×</button>
            <div class="flowchart-task-title">${this.escapeHtml(task.description)}</div>
            <div class="flowchart-task-info">
                <div class="flowchart-task-info-item"><strong>Customer:</strong> ${this.escapeHtml(customerName)}</div>
                <div class="flowchart-task-info-item"><strong>Due:</strong> ${this.formatDate(task.deadline)}</div>
                <div class="flowchart-task-info-item"><strong>Responsible:</strong> ${this.escapeHtml(task.responsible)}</div>
            </div>
            <div class="flowchart-task-status ${statusClass}">${this.getStatusLabel(task.status)}</div>
        `;

        // Add delete button event listener
        const deleteBtn = box.querySelector('.flowchart-task-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTaskFromFlowchart(task.id);
            });
        }

        // Make draggable
        box.addEventListener('mousedown', (e) => {
            // Don't start drag if clicking on delete button
            if (e.target.classList.contains('flowchart-task-delete')) {
                return;
            }
            this.startDrag(e, box, task.id);
        });

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
        const content = this.canvas.querySelector('.flowchart-content');
        if (!content) return;
        
        const svg = content.querySelector('.flowchart-svg');
        if (!svg) return;

        // Clear existing arrows
        const existingPaths = svg.querySelectorAll('.flowchart-arrow, .flowchart-arrow-group');
        existingPaths.forEach(path => path.remove());

        // Draw arrows for each dependency
        this.dependencies.forEach((dep, index) => {
            const fromBox = content.querySelector(`[data-task-id="${dep.from}"]`);
            const toBox = content.querySelector(`[data-task-id="${dep.to}"]`);

            if (fromBox && toBox) {
                const arrowGroup = this.createArrow(fromBox, toBox, dep, index);
                svg.appendChild(arrowGroup);
            }
        });
    }

    createArrow(fromBox, toBox, dep, index) {
        const content = this.canvas.querySelector('.flowchart-content');
        const contentRect = content.getBoundingClientRect();
        const fromRect = fromBox.getBoundingClientRect();
        const toRect = toBox.getBoundingClientRect();

        // Calculate center points relative to content container
        const fromX = fromRect.left - contentRect.left + fromRect.width / 2;
        const fromY = fromRect.top - contentRect.top + fromRect.height / 2;
        const toX = toRect.left - contentRect.left + toRect.width / 2;
        const toY = toRect.top - contentRect.top + toRect.height / 2;

        // Calculate angle
        const angle = Math.atan2(toY - fromY, toX - fromX);

        // Calculate start and end points at box edges
        const fromEdgeX = fromX + Math.cos(angle) * (fromRect.width / 2);
        const fromEdgeY = fromY + Math.sin(angle) * (fromRect.height / 2);
        const toEdgeX = toX - Math.cos(angle) * (toRect.width / 2 + 10);
        const toEdgeY = toY - Math.sin(angle) * (toRect.height / 2 + 10);

        // Create group for arrow and hit area
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'flowchart-arrow-group');
        group.setAttribute('data-from', dep.from);
        group.setAttribute('data-to', dep.to);

        // Create invisible thick path for easier clicking
        const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hitArea.setAttribute('d', `M ${fromEdgeX} ${fromEdgeY} L ${toEdgeX} ${toEdgeY}`);
        hitArea.setAttribute('stroke', 'transparent');
        hitArea.setAttribute('stroke-width', '20');
        hitArea.setAttribute('fill', 'none');
        hitArea.style.cursor = 'pointer';

        // Create visible path element
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'flowchart-arrow');
        path.setAttribute('d', `M ${fromEdgeX} ${fromEdgeY} L ${toEdgeX} ${toEdgeY}`);
        path.setAttribute('stroke', '#d4af37');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        path.setAttribute('marker-end', 'url(#arrowhead)');
        path.style.pointerEvents = 'none';

        // Add hover and click effects
        group.addEventListener('mouseenter', () => {
            path.setAttribute('stroke', '#ffd700');
            path.setAttribute('stroke-width', '4');
            fromBox.style.borderColor = '#ffd700';
            toBox.style.borderColor = '#ffd700';
        });

        group.addEventListener('mouseleave', () => {
            path.setAttribute('stroke', '#d4af37');
            path.setAttribute('stroke-width', '3');
            fromBox.style.borderColor = '#d4af37';
            toBox.style.borderColor = '#d4af37';
        });

        group.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Remove this dependency?')) {
                this.removeDependency(dep.from, dep.to);
            }
        });

        group.appendChild(hitArea);
        group.appendChild(path);

        return group;
    }

    removeDependency(fromTaskId, toTaskId) {
        this.dependencies = this.dependencies.filter(dep => 
            !(dep.from === fromTaskId && dep.to === toTaskId)
        );
        this.saveFlowchartData();
        this.renderDependencyArrows();
    }

    openDependencyModal() {
        if (!this.dependencyModal) return;

        // Update task dropdowns
        const fromSelect = document.getElementById('dependency-from');
        const toSelect = document.getElementById('dependency-to');

        if (!fromSelect || !toSelect) return;

        const allTasks = storage.getActiveCustomerTasks();
        const customers = storage.getCustomers();

        // Only show tasks that are selected for the flowchart
        const tasks = allTasks.filter(task => this.selectedTasks.has(task.id));

        if (tasks.length === 0) {
            alert('Please add tasks to the flowchart first before creating dependencies.');
            return;
        }

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
        if (confirm('Are you sure you want to clear the flowchart? This will remove all tasks, dependencies, and positions.')) {
            this.dependencies = [];
            this.selectedTasks.clear();
            this.taskPositions = {};
            this.saveFlowchartData();
            this.renderFlowchart();
        }
    }

    removeTaskFromFlowchart(taskId) {
        if (confirm('Remove this task from the flowchart? This will also remove any dependencies involving this task.')) {
            // Remove from selected tasks
            this.selectedTasks.delete(taskId);
            
            // Remove position
            delete this.taskPositions[taskId];
            
            // Remove dependencies involving this task
            this.dependencies = this.dependencies.filter(dep => 
                dep.from !== taskId && dep.to !== taskId
            );
            
            this.saveFlowchartData();
            this.renderFlowchart();
        }
    }

    openAddTasksModal() {
        this.filterCompany = '';
        this.filterCompanyNumber = '';
        
        const filterCompany = document.getElementById('flowchart-task-filter-company');
        const filterCompanyNumber = document.getElementById('flowchart-task-filter-company-number');
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
        const container = document.getElementById('flowchart-tasks-selection-container');
        if (!container) return;

        const tasks = storage.getActiveCustomerTasks();
        const customers = storage.getCustomers();
        
        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = { name: c.name, companyNumber: c.companyNumber };
        });

        // Filter tasks - only show tasks not yet selected for flowchart
        let availableTasks = tasks.filter(task => !this.selectedTasks.has(task.id));

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
                    <div class="empty-state-icon">📊</div>
                    <div class="empty-state-text">
                        ${this.filterCompany || this.filterCompanyNumber ? 
                          'No tasks found matching your filters.' : 
                          'All tasks are already in the flowchart.'}
                    </div>
                </div>
            `;
            return;
        }

        // Add select all/none buttons
        let html = `
            <div class="pdf-selection-actions">
                <button class="btn btn-secondary" onclick="flowchartManager.selectAllTasks()">Select All</button>
                <button class="btn btn-secondary" onclick="flowchartManager.selectNoneTasks()">Select None</button>
            </div>
        `;

        // Build task selection list
        html += availableTasks.map(task => {
            const customer = customerMap[task.customerId];
            const customerName = customer ? customer.name : 'Unknown';
            const companyNumber = customer ? customer.companyNumber : '';
            
            return `
                <div class="pdf-selection-item">
                    <input type="checkbox" id="flowchart-task-${task.id}" value="${task.id}" checked>
                    <label class="pdf-selection-label" for="flowchart-task-${task.id}">
                        <strong>${this.escapeHtml(task.description)}</strong>
                        <span class="pdf-selection-meta">${this.escapeHtml(customerName)} ${companyNumber ? `(${this.escapeHtml(companyNumber)})` : ''} - Due: ${this.formatDate(task.deadline)}</span>
                    </label>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    selectAllTasks() {
        const checkboxes = document.querySelectorAll('#flowchart-tasks-selection-container input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);
    }

    selectNoneTasks() {
        const checkboxes = document.querySelectorAll('#flowchart-tasks-selection-container input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
    }

    confirmAddTasks() {
        const checkboxes = document.querySelectorAll('#flowchart-tasks-selection-container input[type="checkbox"]:checked');
        const taskIds = Array.from(checkboxes).map(cb => cb.value);
        
        if (taskIds.length === 0) {
            alert('Please select at least one task');
            return;
        }

        // Add selected tasks to the flowchart
        taskIds.forEach(id => this.selectedTasks.add(id));
        
        this.saveFlowchartData();
        this.closeAddTasksModal();
        this.renderFlowchart();
    }

    exportFlowchartToPDF() {
        const allTasks = storage.getActiveCustomerTasks();
        const customers = storage.getCustomers();

        // Only export tasks that are selected for the flowchart
        const tasks = allTasks.filter(task => this.selectedTasks.has(task.id));

        if (tasks.length === 0) {
            alert('No tasks in flowchart to export. Please add tasks first.');
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

        // Use all provided tasks (already filtered by selected tasks)
        let filteredTasks = tasks;

        // Get only dependencies for filtered tasks
        const taskIds = new Set(filteredTasks.map(t => t.id));
        const filteredDependencies = this.dependencies.filter(dep => 
            taskIds.has(dep.from) && taskIds.has(dep.to)
        );

        let html = `
            <div class="print-document">
                <div class="print-header">
                    <h1 class="print-title">Task Flowchart</h1>
                    <div class="print-meta">Generated: ${this.escapeHtml(dateStr)} | Total Tasks: ${filteredTasks.length} | Dependencies: ${filteredDependencies.length}</div>
                </div>
        `;

        // Visual flowchart representation
        html += `
            <div class="print-section">
                <h2 class="print-section-title">Visual Flowchart</h2>
                <div class="print-flowchart-canvas">
        `;

        // Render tasks as positioned boxes
        filteredTasks.forEach((task, index) => {
            const customerName = customerMap[task.customerId] || 'Unknown';
            const priority = task.priority || 'medium';
            const status = task.status || 'pending';
            const position = this.taskPositions[task.id] || {
                x: 50 + (index % 4) * 220,
                y: 50 + Math.floor(index / 4) * 140
            };

            html += `
                <div class="print-flowchart-task" style="left: ${position.x}px; top: ${position.y}px;">
                    <div class="print-flowchart-task-title">${this.escapeHtml(task.description)}</div>
                    <div class="print-flowchart-task-info">
                        <div><strong>Customer:</strong> ${this.escapeHtml(customerName)}</div>
                        <div><strong>Due:</strong> ${this.formatDate(task.deadline)}</div>
                        <div><strong>Responsible:</strong> ${this.escapeHtml(task.responsible)}</div>
                    </div>
                    <div class="print-flowchart-task-status print-badge-${status}">${this.getStatusLabel(status)}</div>
                </div>
            `;
        });

        // Render arrows using SVG
        if (filteredDependencies.length > 0) {
            html += `<svg class="print-flowchart-svg">`;
            
            filteredDependencies.forEach(dep => {
                const fromTask = taskMap[dep.from];
                const toTask = taskMap[dep.to];
                
                if (fromTask && toTask) {
                    const fromPos = this.taskPositions[dep.from] || { x: 50, y: 50 };
                    const toPos = this.taskPositions[dep.to] || { x: 50, y: 50 };
                    
                    // Calculate center points
                    const fromX = fromPos.x + 100;
                    const fromY = fromPos.y + 60;
                    const toX = toPos.x + 100;
                    const toY = toPos.y + 60;
                    
                    // Calculate angle for edge points
                    const angle = Math.atan2(toY - fromY, toX - fromX);
                    const fromEdgeX = fromX + Math.cos(angle) * 100;
                    const fromEdgeY = fromY + Math.sin(angle) * 60;
                    const toEdgeX = toX - Math.cos(angle) * 100;
                    const toEdgeY = toY - Math.sin(angle) * 60;
                    
                    html += `
                        <defs>
                            <marker id="print-arrowhead-${dep.from}-${dep.to}" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                                <polygon points="0 0, 10 3, 0 6" fill="#d4af37" />
                            </marker>
                        </defs>
                        <path d="M ${fromEdgeX} ${fromEdgeY} L ${toEdgeX} ${toEdgeY}" 
                              stroke="#d4af37" stroke-width="2" 
                              marker-end="url(#print-arrowhead-${dep.from}-${dep.to})" 
                              fill="none" />
                    `;
                }
            });
            
            html += `</svg>`;
        }

        html += `
                </div>
            </div>
        `;

        // Task list with dependencies
        html += `
            <div class="print-section">
                <h2 class="print-section-title">Task Dependencies</h2>
        `;

        if (filteredDependencies.length === 0) {
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

            filteredDependencies.forEach(dep => {
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

        filteredTasks.forEach(task => {
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
