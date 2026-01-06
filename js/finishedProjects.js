// finishedProjects.js - Handles finished projects view

class FinishedProjectsManager {
    constructor() {
        this.searchCustomer = '';
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
        // Search functionality
        const searchInput = document.getElementById('finished-search-customer');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchCustomer = e.target.value.toLowerCase();
                this.renderFinishedProjects();
            });
        }

        // Export PDF button
        const exportPdfBtn = document.getElementById('export-finished-pdf-btn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => this.exportFinishedProjectsToPDF());
        }

        // Initial render
        this.renderFinishedProjects();
    }

    renderFinishedProjects() {
        const tasks = storage.getFinishedCustomerTasks();
        const customers = storage.getCustomers();
        const container = document.getElementById('finished-projects-list');
        
        if (!container) return;

        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c;
        });

        // Filter tasks by customer search
        let filteredTasks = tasks;
        if (this.searchCustomer) {
            filteredTasks = tasks.filter(task => {
                const customer = customerMap[task.customerId];
                if (!customer) return false;
                return customer.name.toLowerCase().includes(this.searchCustomer);
            });
        }

        if (filteredTasks.length === 0) {
            let emptyMessage = 'No finished projects yet.';
            if (this.searchCustomer) {
                emptyMessage = 'No finished projects found matching your search.';
            }
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✅</div>
                    <div class="empty-state-text">${emptyMessage}</div>
                </div>
            `;
            return;
        }

        // Sort tasks chronologically (newest first)
        filteredTasks.sort((a, b) => {
            const dateA = new Date(a.deadline);
            const dateB = new Date(b.deadline);
            return dateB - dateA;
        });

        // Group tasks by customer
        const tasksByCustomer = {};
        filteredTasks.forEach(task => {
            if (!tasksByCustomer[task.customerId]) {
                tasksByCustomer[task.customerId] = [];
            }
            tasksByCustomer[task.customerId].push(task);
        });

        // Render grouped tasks
        let html = '';
        Object.keys(tasksByCustomer).forEach(customerId => {
            const customer = customerMap[customerId];
            if (!customer) return;

            const customerTasks = tasksByCustomer[customerId];
            
            html += `
                <div class="finished-customer-section">
                    <div class="finished-customer-header">
                        <h3>${this.escapeHtml(customer.name)}</h3>
                        <span class="finished-customer-info">${customerTasks.length} task(s) completed</span>
                    </div>
                    <div class="finished-tasks-list">
                        ${customerTasks.map(task => this.renderTaskCard(task)).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderTaskCard(task) {
        const priority = task.priority || 'medium';
        
        return `
            <div class="data-item finished-task-item">
                <div class="data-item-header">
                    <div class="data-item-title">${this.escapeHtml(task.description)}</div>
                </div>
                <div class="data-item-content">
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    exportFinishedProjectsToPDF() {
        if (typeof pdfManager === 'undefined' || !pdfManager.isAvailable()) {
            alert('PDF export is not available. The PDF library could not be loaded. This may happen when working offline. Please use CSV export instead.');
            return;
        }

        const tasks = storage.getFinishedCustomerTasks();
        const customers = storage.getCustomers();
        
        if (tasks.length === 0) {
            alert('No finished projects to export');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Create customer lookup
            const customerMap = {};
            customers.forEach(c => {
                customerMap[c.id] = c.name;
            });
            
            // Add title
            doc.setFontSize(20);
            doc.text('Finished Projects Report', 14, 20);
            
            // Add date
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
            
            // Sort tasks chronologically
            const sortedTasks = [...tasks].sort((a, b) => {
                return new Date(b.deadline) - new Date(a.deadline);
            });
            
            // Prepare table data
            const tableData = sortedTasks.map(task => [
                customerMap[task.customerId] || 'Unknown',
                task.description,
                task.deadline,
                task.responsible,
                pdfManager.getStatusLabel(task.status)
            ]);
            
            // Add table
            doc.autoTable({
                head: [['Customer', 'Description', 'Deadline', 'Responsible', 'Status']],
                body: tableData,
                startY: 35,
                styles: { fontSize: 9 },
                headStyles: { fillColor: [52, 152, 219] },
                columnStyles: {
                    1: { cellWidth: 50 }
                }
            });
            
            // Save the PDF
            const timestamp = new Date().toISOString().split('T')[0];
            doc.save(`finished-projects-report-${timestamp}.pdf`);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. The PDF library may not be loaded. Please try using CSV export instead or check your internet connection if working online.');
        }
    }
}

// Create global finished projects manager instance
const finishedProjectsManager = new FinishedProjectsManager();
window.finishedProjectsManager = finishedProjectsManager;
