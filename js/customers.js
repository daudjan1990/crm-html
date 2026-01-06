// customers.js - Handles customer management functionality

class CustomerManager {
    constructor() {
        this.modal = null;
        this.form = null;
        this.currentEditId = null;
        this.contactPersonsCount = 0;
        this.searchTerm = '';
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
        this.modal = document.getElementById('customer-modal');
        this.form = document.getElementById('customer-form');
        
        if (!this.modal || !this.form) {
            console.error('Customer modal or form not found');
            return;
        }

        // Add customer button
        const addBtn = document.getElementById('add-customer-btn');
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
        const exportBtn = document.getElementById('export-customers-btn');
        const importBtn = document.getElementById('import-customers-btn');
        const exportPdfBtn = document.getElementById('export-customers-pdf-btn');
        const csvInput = document.getElementById('customer-csv-input');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => csvManager.exportCustomersToCSV());
        }

        if (importBtn && csvInput) {
            importBtn.addEventListener('click', () => csvInput.click());
            csvInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    csvManager.importCustomersFromCSV(e.target.files[0]);
                    e.target.value = ''; // Reset input
                }
            });
        }

        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => pdfManager.exportCustomersToPDF());
        }

        // Search functionality
        const searchInput = document.getElementById('customer-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.renderCustomers();
            });
        }

        // Add contact person button
        const addContactBtn = document.getElementById('add-contact-person-btn');
        if (addContactBtn) {
            addContactBtn.addEventListener('click', () => this.addContactPersonField());
        }

        // Initial render
        this.renderCustomers();
    }

    openAddModal() {
        this.currentEditId = null;
        this.contactPersonsCount = 0;
        document.getElementById('customer-modal-title').textContent = 'Add Customer';
        this.form.reset();
        document.getElementById('contact-persons-container').innerHTML = '';
        this.modal.classList.add('active');
    }

    openEditModal(id) {
        this.currentEditId = id;
        this.contactPersonsCount = 0;
        const customer = storage.getCustomerById(id);
        
        if (!customer) {
            alert('Customer not found');
            return;
        }

        document.getElementById('customer-modal-title').textContent = 'Edit Customer';
        
        // Populate form
        document.getElementById('customer-name').value = customer.name || '';
        document.getElementById('customer-contact').value = customer.contact || '';
        document.getElementById('customer-company-number').value = customer.companyNumber || '';
        document.getElementById('customer-email').value = customer.email || '';
        document.getElementById('customer-phone').value = customer.phone || '';
        document.getElementById('customer-address').value = customer.address || '';
        
        // Populate contact persons
        const container = document.getElementById('contact-persons-container');
        container.innerHTML = '';
        if (customer.contactPersons && customer.contactPersons.length > 0) {
            customer.contactPersons.forEach((person, index) => {
                this.addContactPersonField(person);
            });
        }
        
        this.modal.classList.add('active');
    }

    closeModal() {
        this.modal.classList.remove('active');
        this.form.reset();
        this.currentEditId = null;
        this.contactPersonsCount = 0;
        document.getElementById('contact-persons-container').innerHTML = '';
    }

    handleSubmit() {
        // Get form data
        const formData = new FormData(this.form);
        const customer = {
            name: formData.get('name').trim(),
            contact: formData.get('contact').trim(),
            companyNumber: formData.get('companyNumber').trim(),
            email: formData.get('email').trim(),
            phone: formData.get('phone').trim(),
            address: formData.get('address').trim(),
            contactPersons: []
        };

        // Validate required fields
        if (!customer.name || !customer.contact || !customer.companyNumber) {
            alert('Please fill in all required fields');
            return;
        }

        // Collect contact persons
        const contactPersonElements = document.querySelectorAll('.contact-person-item');
        contactPersonElements.forEach(elem => {
            const name = elem.querySelector('.contact-person-name').value.trim();
            const role = elem.querySelector('.contact-person-role').value;
            const email = elem.querySelector('.contact-person-email').value.trim();
            const phone = elem.querySelector('.contact-person-phone').value.trim();
            
            if (name && role) {
                customer.contactPersons.push({ name, role, email, phone });
            }
        });

        // Save customer
        let result;
        if (this.currentEditId) {
            result = storage.updateCustomer(this.currentEditId, customer);
            if (result) {
                // Also update task manager's customer dropdown
                if (window.taskManager) {
                    window.taskManager.updateCustomerDropdown();
                }
            }
        } else {
            result = storage.addCustomer(customer);
            if (result && window.taskManager) {
                window.taskManager.updateCustomerDropdown();
            }
        }

        if (result) {
            this.closeModal();
            this.renderCustomers();
        }
    }

    deleteCustomer(id) {
        const customer = storage.getCustomerById(id);
        if (!customer) return;

        const tasks = storage.getTasksByCustomer(id);
        let message = `Are you sure you want to delete "${customer.name}"?`;
        
        if (tasks.length > 0) {
            message += `\n\nThis will also delete ${tasks.length} associated task(s).`;
        }

        if (confirm(message)) {
            storage.deleteCustomer(id);
            this.renderCustomers();
            
            // Update task list if visible
            if (window.taskManager) {
                window.taskManager.renderTasks();
                window.taskManager.updateCustomerDropdown();
            }
        }
    }

    renderCustomers() {
        const customers = storage.getCustomers();
        const container = document.getElementById('customers-list');
        
        if (!container) return;

        // Filter customers by search term
        let filteredCustomers = customers;
        if (this.searchTerm) {
            filteredCustomers = customers.filter(customer => {
                const searchableText = `${customer.name || ''} ${customer.contact || ''} ${customer.companyNumber || ''}`.toLowerCase();
                return searchableText.includes(this.searchTerm);
            });
        }

        if (filteredCustomers.length === 0) {
            if (this.searchTerm) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🔍</div>
                        <div class="empty-state-text">No customers found matching "${this.escapeHtml(this.searchTerm)}"</div>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <div class="empty-state-text">No customers yet. Click "Add Customer" to get started.</div>
                    </div>
                `;
            }
            return;
        }

        // Sort customers by name
        filteredCustomers.sort((a, b) => a.name.localeCompare(b.name));

        container.innerHTML = filteredCustomers.map(customer => {
            const tasks = storage.getTasksByCustomer(customer.id);
            let contactPersonsHtml = '';
            if (customer.contactPersons && customer.contactPersons.length > 0) {
                contactPersonsHtml = `
                    <div class="data-field" style="grid-column: 1 / -1;">
                        <div class="data-field-label">Additional Contacts</div>
                        <div class="data-field-value">
                            ${customer.contactPersons.map(person => `
                                <div style="margin-bottom: 8px; padding: 8px; background-color: #1e2836; border-radius: 4px;">
                                    <strong>${this.escapeHtml(person.name)}</strong> - ${this.escapeHtml(person.role)}
                                    ${person.email ? `<br>📧 ${this.escapeHtml(person.email)}` : ''}
                                    ${person.phone ? `<br>📞 ${this.escapeHtml(person.phone)}` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            return `
                <div class="data-item">
                    <div class="data-item-header">
                        <div class="data-item-title">${this.escapeHtml(customer.name)}</div>
                        <div class="data-item-actions">
                            <button class="btn btn-primary" onclick="customerManager.viewCustomerTasks('${customer.id}')">View Tasks</button>
                            <button class="btn btn-success" onclick="customerManager.openEditModal('${customer.id}')">Edit</button>
                            <button class="btn btn-danger" onclick="customerManager.deleteCustomer('${customer.id}')">Delete</button>
                        </div>
                    </div>
                    <div class="data-item-content">
                        <div class="data-field">
                            <div class="data-field-label">Main Contact Person</div>
                            <div class="data-field-value">${this.escapeHtml(customer.contact)}</div>
                        </div>
                        <div class="data-field">
                            <div class="data-field-label">Company Number</div>
                            <div class="data-field-value">${this.escapeHtml(customer.companyNumber)}</div>
                        </div>
                        ${customer.email ? `
                        <div class="data-field">
                            <div class="data-field-label">Email</div>
                            <div class="data-field-value">${this.escapeHtml(customer.email)}</div>
                        </div>
                        ` : ''}
                        ${customer.phone ? `
                        <div class="data-field">
                            <div class="data-field-label">Phone</div>
                            <div class="data-field-value">${this.escapeHtml(customer.phone)}</div>
                        </div>
                        ` : ''}
                        ${customer.address ? `
                        <div class="data-field">
                            <div class="data-field-label">Address</div>
                            <div class="data-field-value">${this.escapeHtml(customer.address)}</div>
                        </div>
                        ` : ''}
                        <div class="data-field">
                            <div class="data-field-label">Tasks</div>
                            <div class="data-field-value">${tasks.length} task(s)</div>
                        </div>
                        ${contactPersonsHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    addContactPersonField(person = null) {
        const container = document.getElementById('contact-persons-container');
        const index = this.contactPersonsCount++;
        
        const personDiv = document.createElement('div');
        personDiv.className = 'contact-person-item';
        personDiv.innerHTML = `
            <div class="contact-person-header">
                <h4>Contact Person ${index + 1}</h4>
                <button type="button" class="btn btn-danger" onclick="this.closest('.contact-person-item').remove()">Remove</button>
            </div>
            <div class="contact-person-fields">
                <div class="form-group">
                    <label>Name *</label>
                    <input type="text" class="contact-person-name" value="${person ? this.escapeHtml(person.name) : ''}" required>
                </div>
                <div class="form-group">
                    <label>Role *</label>
                    <select class="contact-person-role" required>
                        <option value="">Select Role</option>
                        <option value="IT Manager" ${person && person.role === 'IT Manager' ? 'selected' : ''}>IT Manager</option>
                        <option value="Operation Manager" ${person && person.role === 'Operation Manager' ? 'selected' : ''}>Operation Manager</option>
                        <option value="Main Contact" ${person && person.role === 'Main Contact' ? 'selected' : ''}>Main Contact</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" class="contact-person-email" value="${person && person.email ? this.escapeHtml(person.email) : ''}">
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" class="contact-person-phone" value="${person && person.phone ? this.escapeHtml(person.phone) : ''}">
                </div>
            </div>
        `;
        container.appendChild(personDiv);
    }

    viewCustomerTasks(customerId) {
        // Switch to tasks tab
        if (window.crmApp) {
            window.crmApp.switchTab('tasks');
        }
        
        // Filter tasks by customer
        if (window.taskManager) {
            window.taskManager.filterByCustomer(customerId);
        }
    }
}

// Create global customer manager instance
const customerManager = new CustomerManager();
window.customerManager = customerManager;
