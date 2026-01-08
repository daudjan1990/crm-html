// pdf.js - Handles print preview functionality for creating printable PDFs

class PDFManager {
    constructor() {
        this.previewContainer = null;
        this.selectionModal = null;
        this.currentExportType = null;
        this.currentExportData = null;
        this.setupPrintPreviewContainer();
        this.setupSelectionModal();
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

    setupSelectionModal() {
        // Get the selection modal
        this.selectionModal = document.getElementById('pdf-export-modal');
        if (!this.selectionModal) return;

        // Setup close button
        const closeBtn = this.selectionModal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSelectionModal());
        }

        // Setup cancel button
        const cancelBtn = this.selectionModal.querySelector('.pdf-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeSelectionModal());
        }

        // Setup confirm button
        const confirmBtn = document.getElementById('pdf-export-confirm-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.confirmExport());
        }

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target === this.selectionModal) {
                this.closeSelectionModal();
            }
        });
    }

    openSelectionModal(type, data) {
        this.currentExportType = type;
        this.currentExportData = data;
        
        const title = document.getElementById('pdf-export-modal-title');
        const container = document.getElementById('pdf-export-selection-container');
        
        if (!title || !container) return;

        // Set title based on type
        if (type === 'tasks') {
            title.textContent = 'Select Tasks to Export';
        } else if (type === 'customers') {
            title.textContent = 'Select Customers to Export';
        } else if (type === 'finished') {
            title.textContent = 'Select Finished Projects to Export';
        }

        // Build selection UI
        container.innerHTML = this.buildSelectionUI(type, data);

        // Add select all/none buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'pdf-selection-actions';
        actionsDiv.innerHTML = `
            <button class="btn btn-secondary" onclick="pdfManager.selectAll()">Select All</button>
            <button class="btn btn-secondary" onclick="pdfManager.selectNone()">Select None</button>
        `;
        container.insertBefore(actionsDiv, container.firstChild);

        this.selectionModal.classList.add('active');
    }

    buildSelectionUI(type, data) {
        if (type === 'tasks') {
            return data.map(task => {
                const customer = storage.getCustomerById(task.customerId);
                const customerName = customer ? customer.name : 'Unknown';
                return `
                    <div class="pdf-selection-item">
                        <input type="checkbox" id="export-${task.id}" value="${task.id}" checked>
                        <label class="pdf-selection-label" for="export-${task.id}">
                            <strong>${this.escapeHtml(task.description)}</strong>
                            <span class="pdf-selection-meta">${this.escapeHtml(customerName)} - ${this.formatDate(task.deadline)}</span>
                        </label>
                    </div>
                `;
            }).join('');
        } else if (type === 'customers') {
            return data.map(customer => {
                const taskCount = storage.getTasksByCustomer(customer.id).length;
                return `
                    <div class="pdf-selection-item">
                        <input type="checkbox" id="export-${customer.id}" value="${customer.id}" checked>
                        <label class="pdf-selection-label" for="export-${customer.id}">
                            <strong>${this.escapeHtml(customer.name)}</strong>
                            <span class="pdf-selection-meta">${customer.companyNumber} - ${taskCount} task(s)</span>
                        </label>
                    </div>
                `;
            }).join('');
        } else if (type === 'finished') {
            // Group tasks by customer for finished projects
            const tasksByCustomer = {};
            data.forEach(task => {
                if (!tasksByCustomer[task.customerId]) {
                    tasksByCustomer[task.customerId] = [];
                }
                tasksByCustomer[task.customerId].push(task);
            });

            return Object.keys(tasksByCustomer).map(customerId => {
                const customer = storage.getCustomerById(customerId);
                const tasks = tasksByCustomer[customerId];
                const customerName = customer ? customer.name : 'Unknown';
                return `
                    <div class="pdf-selection-item">
                        <input type="checkbox" id="export-${customerId}" value="${customerId}" checked>
                        <label class="pdf-selection-label" for="export-${customerId}">
                            <strong>${this.escapeHtml(customerName)}</strong>
                            <span class="pdf-selection-meta">${tasks.length} completed task(s)</span>
                        </label>
                    </div>
                `;
            }).join('');
        }
        return '';
    }

    selectAll() {
        const checkboxes = document.querySelectorAll('#pdf-export-selection-container input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);
    }

    selectNone() {
        const checkboxes = document.querySelectorAll('#pdf-export-selection-container input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
    }

    closeSelectionModal() {
        if (this.selectionModal) {
            this.selectionModal.classList.remove('active');
        }
        this.currentExportType = null;
        this.currentExportData = null;
    }

    confirmExport() {
        // Get selected IDs
        const checkboxes = document.querySelectorAll('#pdf-export-selection-container input[type="checkbox"]:checked');
        const selectedIds = Array.from(checkboxes).map(cb => cb.value);

        if (selectedIds.length === 0) {
            alert('Please select at least one item to export');
            return;
        }

        // Filter data based on selection
        let filteredData;
        if (this.currentExportType === 'tasks') {
            filteredData = this.currentExportData.filter(task => selectedIds.includes(task.id));
            const customers = storage.getCustomers();
            const html = this.generateTasksHTML(filteredData, customers);
            this.openPrintPreview(html);
        } else if (this.currentExportType === 'customers') {
            filteredData = this.currentExportData.filter(customer => selectedIds.includes(customer.id));
            const html = this.generateCustomersHTML(filteredData);
            this.openPrintPreview(html);
        } else if (this.currentExportType === 'finished') {
            // Filter tasks by selected customer IDs
            filteredData = this.currentExportData.filter(task => selectedIds.includes(task.customerId));
            const customers = storage.getCustomers();
            const html = this.generateFinishedProjectsHTML(filteredData, customers);
            this.openPrintPreview(html);
        }

        this.closeSelectionModal();
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

        // Open selection modal
        this.openSelectionModal('customers', customers);
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
            const status = customer.status || 'onboarding';
            html += `
                <tr class="print-item">
                    <td><strong>${this.escapeHtml(customer.name)}</strong></td>
                    <td>${this.escapeHtml(customer.contact)}</td>
                    <td>${this.escapeHtml(customer.companyNumber)}</td>
                    <td>${this.escapeHtml(customer.email || '-')}</td>
                    <td>${this.escapeHtml(customer.phone || '-')}</td>
                    <td><span class="print-badge print-badge-${status}">${this.getCustomerStatusLabel(status)}</span></td>
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

        // Open selection modal
        this.openSelectionModal('tasks', tasks);
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
            const priority = task.priority || 'medium';
            const status = task.status || 'pending';
            
            html += `
                <tr class="print-item">
                    <td>${this.escapeHtml(customerName)}</td>
                    <td><strong>${this.escapeHtml(task.description)}</strong>${isOverdue ? ' <span class="print-overdue">⚠ OVERDUE</span>' : ''}</td>
                    <td>${this.formatDate(task.deadline)}</td>
                    <td>${this.escapeHtml(task.responsible)}</td>
                    <td><span class="print-badge print-badge-${priority}">${this.getPriorityLabel(priority)}</span></td>
                    <td><span class="print-badge print-badge-${status}">${this.getStatusLabel(status)}</span></td>
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

        // Add task attachments section with collapsible content
        const tasksWithAttachments = tasks.filter(t => t.attachments && t.attachments.length > 0);
        if (tasksWithAttachments.length > 0) {
            html += `
                <div class="print-section">
                    <h2 class="print-section-title">Task Attachments</h2>
            `;

            tasksWithAttachments.forEach((task, taskIndex) => {
                const customerName = customerMap[task.customerId] || 'Unknown';
                html += `
                    <div class="print-item">
                        <div class="print-item-title">${this.escapeHtml(task.description)}</div>
                        <div class="print-item-content">
                            <div class="print-item-field"><strong>Customer:</strong> ${this.escapeHtml(customerName)}</div>
                            <div class="print-item-field"><strong>Attachments:</strong> ${task.attachments.length} file(s)</div>
                        </div>
                        ${this.generateAttachmentContentHTML(task.attachments, task.id, taskIndex)}
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

        // Open selection modal
        this.openSelectionModal('finished', tasks);
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
                const priority = task.priority || 'medium';
                const status = task.status || 'pending';
                // Calculate global task index across all customer groups for unique attachment IDs
                // This sums up all tasks in previous customer groups plus the current task index
                const globalTaskIndex = Object.keys(tasksByCustomer).slice(0, groupIndex).reduce((sum, k) => sum + tasksByCustomer[k].length, 0) + index;
                html += `
                    <div class="print-item">
                        <div class="print-item-title">${this.escapeHtml(task.description)}</div>
                        <div class="print-item-content">
                            <div class="print-item-field"><strong>Deadline:</strong> ${this.formatDate(task.deadline)}</div>
                            <div class="print-item-field"><strong>Responsible:</strong> ${this.escapeHtml(task.responsible)}</div>
                            <div class="print-item-field"><strong>Priority:</strong> <span class="print-badge print-badge-${priority}">${this.getPriorityLabel(priority)}</span></div>
                            <div class="print-item-field"><strong>Status:</strong> <span class="print-badge print-badge-${status}">${this.getStatusLabel(status)}</span></div>
                            ${task.notes ? `<div class="print-item-field"><strong>Notes:</strong> ${this.escapeHtml(task.notes)}</div>` : ''}
                            ${task.attachments && task.attachments.length > 0 ? `<div class="print-item-field"><strong>Attachments:</strong> ${task.attachments.length} file(s)</div>` : ''}
                        </div>
                        ${task.attachments && task.attachments.length > 0 ? this.generateAttachmentContentHTML(task.attachments, task.id, globalTaskIndex) : ''}
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

    // Generate HTML for attachment contents with collapsible sections
    generateAttachmentContentHTML(attachments, taskId, taskIndex) {
        if (!attachments || attachments.length === 0) {
            return '';
        }

        let html = '<div class="print-attachments-section">';

        attachments.forEach((attachment, attIndex) => {
            const attachmentId = `attachment-${taskIndex}-${attIndex}`;
            const isPDF = attachment.type === 'application/pdf' || attachment.name.toLowerCase().endsWith('.pdf');
            const isEML = attachment.type === 'message/rfc822' || attachment.name.toLowerCase().endsWith('.eml');
            
            html += `
                <div class="print-attachment-item">
                    <div class="print-attachment-header" onclick="pdfManager.toggleAttachment('${attachmentId}')">
                        <span class="print-attachment-toggle" id="${attachmentId}-toggle">▶</span>
                        <span class="print-attachment-name">📎 ${this.escapeHtml(attachment.name)}</span>
                        <span class="print-attachment-size">(${this.formatFileSize(attachment.size)})</span>
                    </div>
                    <div class="print-attachment-content" id="${attachmentId}-content" style="display: none;">
            `;

            if (isPDF) {
                html += this.generatePDFContentHTML(attachment);
            } else if (isEML) {
                html += this.generateEMLContentHTML(attachment);
            } else {
                html += `<div class="print-attachment-message">Preview not available for this file type.</div>`;
            }

            html += `
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    // Generate HTML for PDF content (embedded PDF viewer)
    generatePDFContentHTML(attachment) {
        // For PDF files, we'll embed them using an embed tag
        // The data is already in base64 format from the attachment
        return `
            <div class="print-pdf-viewer">
                <embed 
                    src="${attachment.data}" 
                    type="application/pdf" 
                    width="100%" 
                    height="600px"
                    class="print-pdf-embed"
                />
                <div class="print-pdf-fallback">
                    <p>If the PDF doesn't display, you can <a href="${attachment.data}" download="${this.escapeHtml(attachment.name)}" target="_blank">download it here</a>.</p>
                </div>
            </div>
        `;
    }

    // Generate HTML for EML content (parsed email display)
    generateEMLContentHTML(attachment) {
        try {
            // Validate and decode base64 data
            if (!attachment.data || typeof attachment.data !== 'string') {
                throw new Error('Invalid attachment data');
            }
            
            // Ensure data URL format is correct
            if (!attachment.data.startsWith('data:')) {
                throw new Error('Invalid data URL format');
            }
            
            const parts = attachment.data.split(',');
            if (parts.length !== 2) {
                throw new Error('Invalid data URL structure');
            }
            
            const base64Data = parts[1];
            const decodedData = atob(base64Data);
            
            // Parse EML content
            const emailData = this.parseEMLContent(decodedData);
            
            return `
                <div class="print-email-viewer">
                    <div class="print-email-header">
                        <div class="print-email-field">
                            <strong>From:</strong> ${this.escapeHtml(emailData.from || 'Unknown')}
                        </div>
                        <div class="print-email-field">
                            <strong>To:</strong> ${this.escapeHtml(emailData.to || 'Unknown')}
                        </div>
                        ${emailData.cc ? `
                        <div class="print-email-field">
                            <strong>CC:</strong> ${this.escapeHtml(emailData.cc)}
                        </div>
                        ` : ''}
                        <div class="print-email-field">
                            <strong>Subject:</strong> ${this.escapeHtml(emailData.subject || 'No Subject')}
                        </div>
                        <div class="print-email-field">
                            <strong>Date:</strong> ${this.escapeHtml(emailData.date || 'Unknown')}
                        </div>
                    </div>
                    <div class="print-email-body">
                        <strong>Message:</strong>
                        <div class="print-email-content">
                            ${this.escapeHtml(emailData.body || 'No content available')}
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error parsing EML content:', error);
            return `
                <div class="print-attachment-message">
                    Unable to parse email content. The file may be corrupted or in an unsupported format.
                </div>
            `;
        }
    }

    // Parse EML file content
    parseEMLContent(emlText) {
        const emailData = {
            from: '',
            to: '',
            cc: '',
            subject: '',
            date: '',
            body: ''
        };

        try {
            const lines = emlText.split('\n');
            let inBody = false;
            let bodyLines = [];
            let currentHeader = '';

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Check for empty line indicating start of body
                if (line.trim() === '' && !inBody) {
                    inBody = true;
                    continue;
                }

                if (!inBody) {
                    // Parse headers
                    if (line.match(/^From:/i)) {
                        emailData.from = line.substring(5).trim();
                        currentHeader = 'from';
                    } else if (line.match(/^To:/i)) {
                        emailData.to = line.substring(3).trim();
                        currentHeader = 'to';
                    } else if (line.match(/^Cc:/i)) {
                        emailData.cc = line.substring(3).trim();
                        currentHeader = 'cc';
                    } else if (line.match(/^Subject:/i)) {
                        emailData.subject = line.substring(8).trim();
                        currentHeader = 'subject';
                    } else if (line.match(/^Date:/i)) {
                        emailData.date = line.substring(5).trim();
                        currentHeader = 'date';
                    } else if (line.match(/^\s/) && currentHeader) {
                        // Continuation of previous header
                        emailData[currentHeader] += ' ' + line.trim();
                    }
                } else {
                    // Collect body lines
                    bodyLines.push(line);
                }
            }

            // Join body lines and clean up
            emailData.body = bodyLines.join('\n').trim();

            // Remove common email encoding markers
            emailData.body = emailData.body.replace(/^Content-Type:.*$/gm, '');
            emailData.body = emailData.body.replace(/^Content-Transfer-Encoding:.*$/gm, '');
            emailData.body = emailData.body.trim();

        } catch (error) {
            console.error('Error parsing EML headers:', error);
        }

        return emailData;
    }

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Toggle attachment content visibility
    toggleAttachment(attachmentId) {
        const content = document.getElementById(`${attachmentId}-content`);
        const toggle = document.getElementById(`${attachmentId}-toggle`);
        
        if (content && toggle) {
            const isHidden = content.style.display === 'none' || content.style.display === '';
            if (isHidden) {
                content.style.display = 'block';
                toggle.textContent = '▼';
            } else {
                content.style.display = 'none';
                toggle.textContent = '▶';
            }
        }
    }
}

// Create global PDF manager instance
const pdfManager = new PDFManager();
