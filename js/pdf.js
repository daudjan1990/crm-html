// pdf.js - Handles print preview functionality for creating printable PDFs

class PDFManager {
    constructor() {
        this.previewContainer = null;
        this.setupPrintPreviewContainer();
    }

    setupPrintPreviewContainer() {
        // Create print preview container if it doesn't exist
        if (!document.getElementById('print-preview-container')) {
            const container = document.createElement('div');
            container.id = 'print-preview-container';
            container.className = 'print-preview-container';
            container.innerHTML = `
                <div class="print-preview-header">
                    <h2>Print Preview</h2>
                    <div class="print-preview-actions">
                        <button class="btn btn-primary" onclick="pdfManager.print()">Print</button>
                        <button class="btn btn-secondary" onclick="pdfManager.closePrintPreview()">Close</button>
                    </div>
                </div>
                <div class="print-preview-content" id="print-preview-content"></div>
            `;
            document.body.appendChild(container);
            this.previewContainer = container;
        }
    }

    openPrintPreview(htmlContent) {
        const contentDiv = document.getElementById('print-preview-content');
        if (contentDiv) {
            contentDiv.innerHTML = htmlContent;
        }
        
        this.previewContainer = document.getElementById('print-preview-container');
        if (this.previewContainer) {
            this.previewContainer.classList.add('active');
            // Prevent body scroll when preview is open
            document.body.classList.add('print-preview-open');
        }
    }

    closePrintPreview() {
        if (this.previewContainer) {
            this.previewContainer.classList.remove('active');
            // Restore body scroll
            document.body.classList.remove('print-preview-open');
        }
    }

    print() {
        window.print();
    }

    // Export customers to printable format
    exportCustomersToPDF() {
        const customers = storage.getCustomers();
        
        if (customers.length === 0) {
            alert('No customers to export');
            return;
        }

        const html = this.generateCustomersHTML(customers);
        this.openPrintPreview(html);
    }

    generateCustomersHTML(customers) {
        const now = new Date();
        const dateStr = now.toLocaleString();
        
        let html = `
            <div class="print-document">
                <div class="print-header">
                    <h1 class="print-title">Customer Report</h1>
                    <div class="print-meta">Generated: ${this.escapeHtml(dateStr)} | Total Customers: ${customers.length}</div>
                </div>
                
                <table class="print-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Contact Person</th>
                            <th>Company Number</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        customers.forEach((customer, index) => {
            html += `
                <tr class="print-item">
                    <td><strong>${this.escapeHtml(customer.name)}</strong></td>
                    <td>${this.escapeHtml(customer.contact)}</td>
                    <td>${this.escapeHtml(customer.companyNumber)}</td>
                    <td>${this.escapeHtml(customer.email || '-')}</td>
                    <td>${this.escapeHtml(customer.phone || '-')}</td>
                    <td><span class="print-badge print-badge-${customer.status || 'onboarding'}">${this.getCustomerStatusLabel(customer.status)}</span></td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
        `;

        // Add detailed information for customers with addresses
        const customersWithDetails = customers.filter(c => c.address);
        if (customersWithDetails.length > 0) {
            html += `
                <div class="print-section">
                    <h2 class="print-section-title">Customer Details</h2>
            `;

            customersWithDetails.forEach((customer, index) => {
                html += `
                    <div class="print-item">
                        <div class="print-item-title">${this.escapeHtml(customer.name)}</div>
                        <div class="print-item-content">
                            ${customer.address ? `<div class="print-item-field"><strong>Address:</strong> ${this.escapeHtml(customer.address)}</div>` : ''}
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        }

        html += `
                <div class="print-footer">
                    CRM Application - Customer Report
                </div>
            </div>
        `;

        return html;
    }

    // Export tasks to printable format
    exportTasksToPDF() {
        const tasks = storage.getTasks();
        const customers = storage.getCustomers();
        
        if (tasks.length === 0) {
            alert('No tasks to export');
            return;
        }

        const html = this.generateTasksHTML(tasks, customers);
        this.openPrintPreview(html);
    }

    generateTasksHTML(tasks, customers) {
        const now = new Date();
        const dateStr = now.toLocaleString();
        
        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c.name;
        });

        let html = `
            <div class="print-document">
                <div class="print-header">
                    <h1 class="print-title">Task Report</h1>
                    <div class="print-meta">Generated: ${this.escapeHtml(dateStr)} | Total Tasks: ${tasks.length}</div>
                </div>
                
                <table class="print-table">
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Description</th>
                            <th>Deadline</th>
                            <th>Responsible</th>
                            <th>Priority</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        tasks.forEach((task, index) => {
            const customerName = customerMap[task.customerId] || 'Unknown';
            const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'completed';
            
            html += `
                <tr class="print-item">
                    <td>${this.escapeHtml(customerName)}</td>
                    <td><strong>${this.escapeHtml(task.description)}</strong>${isOverdue ? ' <span class="print-overdue">⚠ OVERDUE</span>' : ''}</td>
                    <td>${this.formatDate(task.deadline)}</td>
                    <td>${this.escapeHtml(task.responsible)}</td>
                    <td><span class="print-badge print-badge-${task.priority || 'medium'}">${this.getPriorityLabel(task.priority)}</span></td>
                    <td><span class="print-badge print-badge-${task.status || 'pending'}">${this.getStatusLabel(task.status)}</span></td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
        `;

        // Add detailed task notes
        const tasksWithNotes = tasks.filter(t => t.notes);
        if (tasksWithNotes.length > 0) {
            html += `
                <div class="print-section">
                    <h2 class="print-section-title">Task Notes</h2>
            `;

            tasksWithNotes.forEach((task, index) => {
                const customerName = customerMap[task.customerId] || 'Unknown';
                html += `
                    <div class="print-item">
                        <div class="print-item-title">${this.escapeHtml(task.description)}</div>
                        <div class="print-item-content">
                            <div class="print-item-field"><strong>Customer:</strong> ${this.escapeHtml(customerName)}</div>
                            <div class="print-item-field"><strong>Notes:</strong> ${this.escapeHtml(task.notes)}</div>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        }

        html += `
                <div class="print-footer">
                    CRM Application - Task Report
                </div>
            </div>
        `;

        return html;
    }

    // Export finished projects to printable format
    exportFinishedProjectsToPDF() {
        const tasks = storage.getFinishedCustomerTasks();
        const customers = storage.getCustomers();
        
        if (tasks.length === 0) {
            alert('No finished projects to export');
            return;
        }

        const html = this.generateFinishedProjectsHTML(tasks, customers);
        this.openPrintPreview(html);
    }

    generateFinishedProjectsHTML(tasks, customers) {
        const now = new Date();
        const dateStr = now.toLocaleString();
        
        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c;
        });

        // Sort tasks chronologically
        const sortedTasks = [...tasks].sort((a, b) => {
            return new Date(b.deadline) - new Date(a.deadline);
        });

        // Group tasks by customer
        const tasksByCustomer = {};
        sortedTasks.forEach(task => {
            if (!tasksByCustomer[task.customerId]) {
                tasksByCustomer[task.customerId] = [];
            }
            tasksByCustomer[task.customerId].push(task);
        });

        let html = `
            <div class="print-document">
                <div class="print-header">
                    <h1 class="print-title">Finished Projects Report</h1>
                    <div class="print-meta">Generated: ${this.escapeHtml(dateStr)} | Total Finished Tasks: ${tasks.length}</div>
                </div>
        `;

        // Render grouped tasks
        Object.keys(tasksByCustomer).forEach((customerId, groupIndex) => {
            const customer = customerMap[customerId];
            if (!customer) return;

            const customerTasks = tasksByCustomer[customerId];
            
            html += `
                <div class="print-customer-group">
                    <div class="print-customer-name">${this.escapeHtml(customer.name)} - ${customerTasks.length} task(s) completed</div>
            `;

            customerTasks.forEach((task, index) => {
                html += `
                    <div class="print-item">
                        <div class="print-item-title">${this.escapeHtml(task.description)}</div>
                        <div class="print-item-content">
                            <div class="print-item-field"><strong>Deadline:</strong> ${this.formatDate(task.deadline)}</div>
                            <div class="print-item-field"><strong>Responsible:</strong> ${this.escapeHtml(task.responsible)}</div>
                            <div class="print-item-field"><strong>Priority:</strong> <span class="print-badge print-badge-${task.priority || 'medium'}">${this.getPriorityLabel(task.priority)}</span></div>
                            <div class="print-item-field"><strong>Status:</strong> <span class="print-badge print-badge-${task.status || 'pending'}">${this.getStatusLabel(task.status)}</span></div>
                            ${task.notes ? `<div class="print-item-field"><strong>Notes:</strong> ${this.escapeHtml(task.notes)}</div>` : ''}
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        });

        html += `
                <div class="print-footer">
                    CRM Application - Finished Projects Report
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

    getCustomerStatusLabel(status) {
        const statusMap = {
            'onboarding': 'Onboarding',
            'in-progress': 'In Progress',
            'finished': 'Finished'
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

// Create global PDF manager instance
const pdfManager = new PDFManager();
