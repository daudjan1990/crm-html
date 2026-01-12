// projectplan.js - Handles project plan timeline/Gantt chart functionality

class ProjectPlanManager {
    constructor() {
        this.canvas = null;
        this.addTasksModal = null;
        this.selectedTasks = new Set(); // Track which tasks are in the project plan
        this.taskTimelines = {}; // Store task timeline data (start, duration)
        this.filterCompany = '';
        this.filterCompanyNumber = '';
        this.viewMode = 'weeks'; // days, weeks, or months
        this.showToday = true;
        this.showWeekends = false;
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        this.draggedTask = null;
        this.dragMode = null; // 'move' or 'resize-left' or 'resize-right'
        this.dragStart = { x: 0, y: 0 };
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
        this.canvas = document.getElementById('project-plan-canvas');
        this.addTasksModal = document.getElementById('project-plan-add-tasks-modal');
        
        if (!this.canvas) {
            console.error('Project plan canvas not found');
            return;
        }

        // Load saved data
        this.loadProjectPlanData();

        // Add tasks button
        const addTasksBtn = document.getElementById('project-plan-add-tasks-btn');
        if (addTasksBtn) {
            addTasksBtn.addEventListener('click', () => this.openAddTasksModal());
        }

        // Auto schedule button
        const autoScheduleBtn = document.getElementById('project-plan-auto-schedule-btn');
        if (autoScheduleBtn) {
            autoScheduleBtn.addEventListener('click', () => this.autoScheduleTasks());
        }

        // Clear button
        const clearBtn = document.getElementById('project-plan-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearProjectPlan());
        }

        // Export PDF button
        const exportPdfBtn = document.getElementById('export-project-plan-pdf-btn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => this.exportProjectPlanToPDF());
        }

        // Reset view button
        const resetViewBtn = document.getElementById('project-plan-reset-view-btn');
        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', () => this.resetView());
        }

        // View mode selector
        const viewModeSelect = document.getElementById('project-plan-view-mode');
        if (viewModeSelect) {
            viewModeSelect.addEventListener('change', (e) => {
                this.viewMode = e.target.value;
                this.renderProjectPlan();
            });
        }

        // Show today line checkbox
        const showTodayCheckbox = document.getElementById('project-plan-show-today');
        if (showTodayCheckbox) {
            showTodayCheckbox.addEventListener('change', (e) => {
                this.showToday = e.target.checked;
                this.renderProjectPlan();
            });
        }

        // Show weekends checkbox
        const showWeekendsCheckbox = document.getElementById('project-plan-show-weekends');
        if (showWeekendsCheckbox) {
            showWeekendsCheckbox.addEventListener('change', (e) => {
                this.showWeekends = e.target.checked;
                this.renderProjectPlan();
            });
        }

        // Add tasks modal setup
        if (this.addTasksModal) {
            const closeBtn = this.addTasksModal.querySelector('.close');
            const cancelBtn = this.addTasksModal.querySelector('.cancel-btn');
            const confirmBtn = document.getElementById('project-plan-add-tasks-confirm-btn');

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
            const filterCompany = document.getElementById('project-plan-task-filter-company');
            const filterCompanyNumber = document.getElementById('project-plan-task-filter-company-number');
            const clearFilterBtn = document.getElementById('project-plan-task-clear-filter');

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

        // Canvas interaction for zoom/pan
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
    }

    loadProjectPlanData() {
        try {
            const data = localStorage.getItem('project_plan_data');
            if (data) {
                const parsed = JSON.parse(data);
                this.selectedTasks = new Set(parsed.selectedTasks || []);
                this.taskTimelines = parsed.taskTimelines || {};
                this.zoom = parsed.zoom || 1;
                this.pan = parsed.pan || { x: 0, y: 0 };
            }
        } catch (error) {
            console.error('Error loading project plan data:', error);
        }
    }

    saveProjectPlanData() {
        try {
            const data = {
                selectedTasks: Array.from(this.selectedTasks),
                taskTimelines: this.taskTimelines,
                zoom: this.zoom,
                pan: this.pan
            };
            localStorage.setItem('project_plan_data', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving project plan data:', error);
        }
    }

    openAddTasksModal() {
        if (this.addTasksModal) {
            this.addTasksModal.classList.add('active');
            this.renderTaskSelection();
        }
    }

    closeAddTasksModal() {
        if (this.addTasksModal) {
            this.addTasksModal.classList.remove('active');
        }
    }

    renderTaskSelection() {
        const container = document.getElementById('project-plan-tasks-selection-container');
        if (!container) return;

        const allTasks = storage.getActiveCustomerTasks();
        const customers = storage.getCustomers();

        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c;
        });

        // Filter tasks
        let filteredTasks = allTasks;
        if (this.filterCompany || this.filterCompanyNumber) {
            filteredTasks = allTasks.filter(task => {
                const customer = customerMap[task.customerId];
                if (!customer) return false;

                const matchesCompany = !this.filterCompany || 
                    customer.name.toLowerCase().includes(this.filterCompany);
                const matchesNumber = !this.filterCompanyNumber || 
                    (customer.companyNumber && customer.companyNumber.toLowerCase().includes(this.filterCompanyNumber));

                return matchesCompany && matchesNumber;
            });
        }

        if (filteredTasks.length === 0) {
            container.innerHTML = '<p style="padding: 20px; text-align: center;">No tasks found.</p>';
            return;
        }

        container.innerHTML = filteredTasks.map(task => {
            const customer = customerMap[task.customerId];
            const customerName = customer ? customer.name : 'Unknown';
            const companyNumber = customer ? customer.companyNumber : '';
            const isChecked = this.selectedTasks.has(task.id);

            return `
                <div class="pdf-selection-item">
                    <label>
                        <input type="checkbox" 
                               value="${task.id}" 
                               ${isChecked ? 'checked' : ''}>
                        <div class="selection-item-content">
                            <strong>${this.escapeHtml(task.description)}</strong>
                            <div style="font-size: 0.9em; color: #a0a5b0;">
                                Customer: ${this.escapeHtml(customerName)} ${companyNumber ? `(${this.escapeHtml(companyNumber)})` : ''}
                                | Due: ${this.formatDate(task.deadline)}
                                | ${this.escapeHtml(task.responsible)}
                            </div>
                        </div>
                    </label>
                </div>
            `;
        }).join('');
    }

    confirmAddTasks() {
        const checkboxes = document.querySelectorAll('#project-plan-tasks-selection-container input[type="checkbox"]:checked');
        
        checkboxes.forEach(checkbox => {
            const taskId = checkbox.value;
            if (!this.selectedTasks.has(taskId)) {
                this.selectedTasks.add(taskId);
                
                // Initialize timeline data if not exists
                if (!this.taskTimelines[taskId]) {
                    const task = storage.getTasks().find(t => t.id === taskId);
                    if (task) {
                        // Default: task starts today and ends on deadline
                        const today = new Date();
                        const deadline = new Date(task.deadline);
                        this.taskTimelines[taskId] = {
                            startDate: today.toISOString().split('T')[0],
                            endDate: task.deadline,
                            duration: Math.max(1, Math.ceil((deadline - today) / (1000 * 60 * 60 * 24)))
                        };
                    }
                }
            }
        });

        // Remove unchecked tasks
        const allCheckboxes = document.querySelectorAll('#project-plan-tasks-selection-container input[type="checkbox"]');
        allCheckboxes.forEach(checkbox => {
            const taskId = checkbox.value;
            if (!checkbox.checked && this.selectedTasks.has(taskId)) {
                this.selectedTasks.delete(taskId);
                delete this.taskTimelines[taskId];
            }
        });

        this.saveProjectPlanData();
        this.closeAddTasksModal();
        this.renderProjectPlan();
    }

    autoScheduleTasks() {
        const allTasks = storage.getActiveCustomerTasks();
        const tasks = allTasks.filter(task => this.selectedTasks.has(task.id));

        if (tasks.length === 0) {
            alert('No tasks in project plan. Add tasks first.');
            return;
        }

        // Sort tasks by deadline
        tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

        // Schedule tasks sequentially with some spacing
        let currentDate = new Date();
        
        tasks.forEach(task => {
            const deadline = new Date(task.deadline);
            const daysUntilDeadline = Math.ceil((deadline - currentDate) / (1000 * 60 * 60 * 24));
            const duration = Math.min(Math.max(3, Math.floor(daysUntilDeadline * 0.7)), daysUntilDeadline);
            
            this.taskTimelines[task.id] = {
                startDate: currentDate.toISOString().split('T')[0],
                endDate: new Date(currentDate.getTime() + duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                duration: duration
            };
            
            // Move to next task with 1 day gap
            currentDate = new Date(currentDate.getTime() + (duration + 1) * 24 * 60 * 60 * 1000);
        });

        this.saveProjectPlanData();
        this.renderProjectPlan();
    }

    clearProjectPlan() {
        if (confirm('Are you sure you want to clear the project plan? This will remove all tasks and timeline data.')) {
            this.selectedTasks.clear();
            this.taskTimelines = {};
            this.zoom = 1;
            this.pan = { x: 0, y: 0 };
            this.saveProjectPlanData();
            this.renderProjectPlan();
        }
    }

    resetView() {
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.saveProjectPlanData();
        this.applyTransform();
    }

    handleWheel(e) {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            
            const delta = -e.deltaY;
            const zoomFactor = delta > 0 ? 1.1 : 0.9;
            
            this.zoom = Math.max(0.3, Math.min(3, this.zoom * zoomFactor));
            this.saveProjectPlanData();
            this.applyTransform();
        }
    }

    handleMouseDown(e) {
        if (e.button === 1 || (e.shiftKey && e.button === 0)) {
            // Middle mouse or shift+left mouse for panning
            e.preventDefault();
            this.isPanning = true;
            this.panStart = { x: e.clientX - this.pan.x, y: e.clientY - this.pan.y };
            this.canvas.style.cursor = 'grabbing';
        } else if (e.target.classList.contains('timeline-task-bar')) {
            // Task dragging
            const taskId = e.target.dataset.taskId;
            const rect = e.target.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            
            // Check if clicking near edges for resize
            if (clickX < 10) {
                this.dragMode = 'resize-left';
            } else if (clickX > rect.width - 10) {
                this.dragMode = 'resize-right';
            } else {
                this.dragMode = 'move';
            }
            
            this.draggedTask = taskId;
            this.dragStart = { x: e.clientX, y: e.clientY };
            e.preventDefault();
        } else if (e.target.classList.contains('timeline-task-delete')) {
            // Handle delete button click
            const taskId = e.target.dataset.taskId;
            this.removeTaskFromPlan(taskId);
            e.preventDefault();
        }
    }

    handleMouseMove(e) {
        if (this.isPanning) {
            this.pan = {
                x: e.clientX - this.panStart.x,
                y: e.clientY - this.panStart.y
            };
            this.applyTransform();
        } else if (this.draggedTask && this.dragMode) {
            const deltaX = e.clientX - this.dragStart.x;
            const pixelsPerDay = this.getPixelsPerDay();
            const daysDelta = Math.round(deltaX / pixelsPerDay);
            
            if (daysDelta !== 0) {
                const timeline = this.taskTimelines[this.draggedTask];
                if (!timeline) return;
                
                const startDate = new Date(timeline.startDate);
                const endDate = new Date(timeline.endDate);
                
                if (this.dragMode === 'move') {
                    // Move entire task
                    startDate.setDate(startDate.getDate() + daysDelta);
                    endDate.setDate(endDate.getDate() + daysDelta);
                    
                    timeline.startDate = startDate.toISOString().split('T')[0];
                    timeline.endDate = endDate.toISOString().split('T')[0];
                } else if (this.dragMode === 'resize-left') {
                    // Resize from start
                    startDate.setDate(startDate.getDate() + daysDelta);
                    if (startDate < endDate) {
                        timeline.startDate = startDate.toISOString().split('T')[0];
                        timeline.duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                    }
                } else if (this.dragMode === 'resize-right') {
                    // Resize from end
                    endDate.setDate(endDate.getDate() + daysDelta);
                    if (endDate > startDate) {
                        timeline.endDate = endDate.toISOString().split('T')[0];
                        timeline.duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                    }
                }
                
                this.dragStart = { x: e.clientX, y: e.clientY };
                this.renderProjectPlan();
            }
        } else if (e.target.classList.contains('timeline-task-bar')) {
            // Change cursor based on position
            const rect = e.target.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            
            if (clickX < 10) {
                e.target.style.cursor = 'w-resize';
            } else if (clickX > rect.width - 10) {
                e.target.style.cursor = 'e-resize';
            } else {
                e.target.style.cursor = 'move';
            }
        }
    }

    handleMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'default';
            this.saveProjectPlanData();
        }
        
        if (this.draggedTask) {
            this.draggedTask = null;
            this.dragMode = null;
            this.saveProjectPlanData();
        }
    }

    removeTaskFromPlan(taskId) {
        this.selectedTasks.delete(taskId);
        delete this.taskTimelines[taskId];
        this.saveProjectPlanData();
        this.renderProjectPlan();
    }

    getPixelsPerDay() {
        switch (this.viewMode) {
            case 'days':
                return 40;
            case 'weeks':
                return 20;
            case 'months':
                return 5;
            default:
                return 20;
        }
    }

    applyTransform() {
        const content = this.canvas.querySelector('.project-plan-content');
        if (content) {
            content.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
        }
    }

    renderProjectPlan() {
        if (!this.canvas) return;

        const allTasks = storage.getActiveCustomerTasks();
        const customers = storage.getCustomers();

        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c.name;
        });

        // Only show tasks that are selected for the project plan
        let tasks = allTasks.filter(task => this.selectedTasks.has(task.id));

        if (tasks.length === 0) {
            const message = 'No tasks in project plan. Click "+ Add Tasks" to select tasks to display.';
            this.canvas.innerHTML = `
                <div class="project-plan-empty">
                    <div>
                        <div style="font-size: 48px; margin-bottom: 15px;">📅</div>
                        <div>${message}</div>
                    </div>
                </div>
            `;
            return;
        }

        // Sort tasks by start date
        tasks.sort((a, b) => {
            const aStart = this.taskTimelines[a.id]?.startDate || a.deadline;
            const bStart = this.taskTimelines[b.id]?.startDate || b.deadline;
            return new Date(aStart) - new Date(bStart);
        });

        // Calculate date range
        const allDates = [];
        tasks.forEach(task => {
            const timeline = this.taskTimelines[task.id];
            if (timeline) {
                allDates.push(new Date(timeline.startDate));
                allDates.push(new Date(timeline.endDate));
            }
        });
        allDates.push(new Date()); // Include today

        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));
        
        // Add some padding
        minDate.setDate(minDate.getDate() - 7);
        maxDate.setDate(maxDate.getDate() + 14);

        // Clear canvas
        this.canvas.innerHTML = '';

        // Create container for zoom/pan
        const content = document.createElement('div');
        content.className = 'project-plan-content';
        this.canvas.appendChild(content);

        // Render timeline header
        const header = this.createTimelineHeader(minDate, maxDate);
        content.appendChild(header);

        // Render task rows
        tasks.forEach((task, index) => {
            const taskRow = this.createTaskRow(task, customerMap[task.customerId] || 'Unknown', index, minDate, maxDate);
            content.appendChild(taskRow);
        });

        // Render today line
        if (this.showToday) {
            const todayLine = this.createTodayLine(minDate, maxDate);
            content.appendChild(todayLine);
        }

        // Apply current transform
        this.applyTransform();
    }

    createTimelineHeader(minDate, maxDate) {
        const header = document.createElement('div');
        header.className = 'timeline-header';
        
        const pixelsPerDay = this.getPixelsPerDay();
        const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
        
        // Task name column
        const nameColumn = document.createElement('div');
        nameColumn.className = 'timeline-name-column';
        nameColumn.textContent = 'Task';
        header.appendChild(nameColumn);
        
        // Timeline scale
        const scale = document.createElement('div');
        scale.className = 'timeline-scale';
        scale.style.width = (totalDays * pixelsPerDay) + 'px';
        
        // Render date markers based on view mode
        const currentDate = new Date(minDate);
        while (currentDate <= maxDate) {
            const marker = document.createElement('div');
            marker.className = 'timeline-date-marker';
            
            const daysSinceStart = Math.floor((currentDate - minDate) / (1000 * 60 * 60 * 24));
            marker.style.left = (daysSinceStart * pixelsPerDay) + 'px';
            
            if (this.viewMode === 'days') {
                marker.textContent = currentDate.getDate();
                if (currentDate.getDate() === 1) {
                    marker.textContent = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    marker.classList.add('major');
                }
                currentDate.setDate(currentDate.getDate() + 1);
            } else if (this.viewMode === 'weeks') {
                if (currentDate.getDay() === 1 || currentDate.getTime() === minDate.getTime()) {
                    marker.textContent = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    marker.classList.add('major');
                }
                currentDate.setDate(currentDate.getDate() + 1);
            } else if (this.viewMode === 'months') {
                if (currentDate.getDate() === 1) {
                    marker.textContent = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    marker.classList.add('major');
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            scale.appendChild(marker);
        }
        
        header.appendChild(scale);
        return header;
    }

    createTaskRow(task, customerName, index, minDate, maxDate) {
        const row = document.createElement('div');
        row.className = 'timeline-row';
        if (index % 2 === 0) row.classList.add('even');
        
        const pixelsPerDay = this.getPixelsPerDay();
        const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
        
        // Task name column
        const nameColumn = document.createElement('div');
        nameColumn.className = 'timeline-name-column';
        nameColumn.innerHTML = `
            <div class="timeline-task-name">
                <strong>${this.escapeHtml(task.description)}</strong>
                <div style="font-size: 0.85em; color: #a0a5b0;">${this.escapeHtml(customerName)}</div>
            </div>
        `;
        row.appendChild(nameColumn);
        
        // Timeline area
        const timelineArea = document.createElement('div');
        timelineArea.className = 'timeline-area';
        timelineArea.style.width = (totalDays * pixelsPerDay) + 'px';
        
        // Render weekend highlights if enabled
        if (this.showWeekends) {
            const currentDate = new Date(minDate);
            while (currentDate <= maxDate) {
                if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
                    const weekend = document.createElement('div');
                    weekend.className = 'timeline-weekend';
                    const daysSinceStart = Math.floor((currentDate - minDate) / (1000 * 60 * 60 * 24));
                    weekend.style.left = (daysSinceStart * pixelsPerDay) + 'px';
                    weekend.style.width = pixelsPerDay + 'px';
                    timelineArea.appendChild(weekend);
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        
        // Render task bar
        const timeline = this.taskTimelines[task.id];
        if (timeline) {
            const startDate = new Date(timeline.startDate);
            const endDate = new Date(timeline.endDate);
            
            const startDays = Math.floor((startDate - minDate) / (1000 * 60 * 60 * 24));
            const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            
            const taskBar = document.createElement('div');
            taskBar.className = 'timeline-task-bar';
            taskBar.dataset.taskId = task.id;
            
            const statusClass = task.status || 'pending';
            taskBar.classList.add(`status-${statusClass}`);
            
            taskBar.style.left = (startDays * pixelsPerDay) + 'px';
            taskBar.style.width = (duration * pixelsPerDay) + 'px';
            
            taskBar.innerHTML = `
                <button class="timeline-task-delete" data-task-id="${task.id}" title="Remove from plan">×</button>
                <div class="timeline-task-label">${this.escapeHtml(task.description)}</div>
            `;
            
            timelineArea.appendChild(taskBar);
        }
        
        row.appendChild(timelineArea);
        return row;
    }

    createTodayLine(minDate, maxDate) {
        const line = document.createElement('div');
        line.className = 'timeline-today-line';
        
        const pixelsPerDay = this.getPixelsPerDay();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const daysSinceStart = Math.floor((today - minDate) / (1000 * 60 * 60 * 24));
        
        // Offset by the name column width (200px)
        line.style.left = (200 + daysSinceStart * pixelsPerDay) + 'px';
        
        return line;
    }

    exportProjectPlanToPDF() {
        const allTasks = storage.getActiveCustomerTasks();
        const customers = storage.getCustomers();

        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c.name;
        });

        // Only export tasks that are selected for the project plan
        let tasks = allTasks.filter(task => this.selectedTasks.has(task.id));

        if (tasks.length === 0) {
            alert('No tasks in project plan. Add tasks first.');
            return;
        }

        // Sort tasks by start date
        tasks.sort((a, b) => {
            const aStart = this.taskTimelines[a.id]?.startDate || a.deadline || new Date().toISOString();
            const bStart = this.taskTimelines[b.id]?.startDate || b.deadline || new Date().toISOString();
            return new Date(aStart) - new Date(bStart);
        });

        // Calculate date range
        const allDates = [];
        tasks.forEach(task => {
            const timeline = this.taskTimelines[task.id];
            if (timeline && timeline.startDate && timeline.endDate) {
                allDates.push(new Date(timeline.startDate));
                allDates.push(new Date(timeline.endDate));
            }
        });
        allDates.push(new Date()); // Include today

        // Ensure we have valid dates
        if (allDates.length === 0) {
            allDates.push(new Date());
            allDates.push(new Date());
        }

        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));
        
        // Add some padding
        minDate.setDate(minDate.getDate() - 7);
        maxDate.setDate(maxDate.getDate() + 14);

        // Generate HTML for print preview
        const html = this.generateProjectPlanHTML(tasks, customerMap, minDate, maxDate);
        
        // Use the PDF manager to open print preview
        if (window.pdfManager) {
            pdfManager.openPrintPreview(html);
        } else {
            alert('PDF export functionality is not available.');
        }
    }

    generateProjectPlanHTML(tasks, customerMap, minDate, maxDate) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const pixelsPerDay = 15; // Optimized for print
        const DATE_MARKER_INTERVAL_DAYS = 7; // Show date markers every week
        const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Build timeline header
        let timelineHeaderHTML = '<div class="print-timeline-header-row">';
        timelineHeaderHTML += '<div class="print-timeline-task-column">Task / Customer</div>';
        timelineHeaderHTML += '<div class="print-timeline-dates-column">';
        
        // Generate date markers
        const currentDate = new Date(minDate);
        while (currentDate <= maxDate) {
            const daysSinceStart = Math.floor((currentDate - minDate) / (1000 * 60 * 60 * 24));
            const isMonthStart = currentDate.getDate() === 1;
            
            if (isMonthStart || daysSinceStart === 0) {
                timelineHeaderHTML += `
                    <div class="print-timeline-date-marker" style="left: ${daysSinceStart * pixelsPerDay}px;">
                        ${currentDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                    </div>
                `;
            }
            
            currentDate.setDate(currentDate.getDate() + DATE_MARKER_INTERVAL_DAYS);
        }
        
        timelineHeaderHTML += '</div></div>';

        // Build task rows
        let taskRowsHTML = '';
        tasks.forEach((task, index) => {
            const customerName = customerMap[task.customerId] || 'Unknown';
            const timeline = this.taskTimelines[task.id];
            
            if (!timeline) return;
            
            const startDate = new Date(timeline.startDate);
            const endDate = new Date(timeline.endDate);
            const startDays = Math.floor((startDate - minDate) / (1000 * 60 * 60 * 24));
            const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            
            const statusClass = task.status || 'pending';
            const statusLabel = this.getStatusLabel(task.status || 'pending');
            
            taskRowsHTML += `
                <div class="print-timeline-row ${index % 2 === 0 ? 'even' : ''}">
                    <div class="print-timeline-task-column">
                        <div class="print-timeline-task-name">${this.escapeHtml(task.description)}</div>
                        <div class="print-timeline-customer-name">${this.escapeHtml(customerName)}</div>
                        <div class="print-timeline-task-meta">
                            ${this.formatDate(timeline.startDate)} - ${this.formatDate(timeline.endDate)}
                        </div>
                    </div>
                    <div class="print-timeline-dates-column">
                        <div class="print-timeline-bar print-timeline-bar-${statusClass}" 
                             style="left: ${startDays * pixelsPerDay}px; width: ${duration * pixelsPerDay}px;">
                            <span class="print-timeline-bar-label">${statusLabel}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        // Calculate today line position if in range
        let todayLineHTML = '';
        if (today >= minDate && today <= maxDate) {
            const daysSinceStart = Math.floor((today - minDate) / (1000 * 60 * 60 * 24));
            todayLineHTML = `
                <div class="print-timeline-today-line" style="left: ${daysSinceStart * pixelsPerDay}px;">
                    <div class="print-timeline-today-label">Today</div>
                </div>
            `;
        }

        return `
            <div class="print-document print-document-landscape">
                <div class="print-header">
                    <h1 class="print-title">Project Plan Timeline</h1>
                    <div class="print-meta">
                        Generated: ${this.escapeHtml(dateStr)} | 
                        Total Tasks: ${tasks.length} | 
                        Timeline: ${this.formatDate(minDate.toISOString())} - ${this.formatDate(maxDate.toISOString())}
                    </div>
                </div>
                
                <div class="print-timeline-container" style="width: ${totalDays * pixelsPerDay + 250}px;">
                    ${timelineHeaderHTML}
                    <div class="print-timeline-body">
                        ${taskRowsHTML}
                        ${todayLineHTML}
                    </div>
                </div>
                
                <div class="print-footer">
                    CRM Application - Project Plan Timeline
                </div>
            </div>
        `;
    }

    getStatusLabel(status) {
        const statusMap = {
            'pending': 'Pending',
            'in-progress': 'In Progress',
            'completed': 'Completed'
        };
        return statusMap[status] || status;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }
}

// Initialize the project plan manager
const projectPlanManager = new ProjectPlanManager();

// Make it globally accessible
window.projectPlanManager = projectPlanManager;
