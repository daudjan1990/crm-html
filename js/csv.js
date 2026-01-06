// csv.js - Handles CSV import and export functionality

class CSVManager {
    // Export customers to CSV
    exportCustomersToCSV() {
        const customers = storage.getCustomers();
        
        if (customers.length === 0) {
            alert('No customers to export');
            return;
        }

        // Define CSV headers
        const headers = ['ID', 'Name', 'Ansprechpartner', 'Betriebenummer', 'Email', 'Phone', 'Address', 'Status', 'Created At'];
        
        // Convert data to CSV format
        const csvContent = this.convertToCSV(customers, headers, (customer) => [
            customer.id,
            customer.name,
            customer.contact,
            customer.companyNumber,
            customer.email || '',
            customer.phone || '',
            customer.address || '',
            customer.status || 'onboarding',
            customer.createdAt || ''
        ]);

        this.downloadCSV(csvContent, 'customers');
    }

    // Export tasks to CSV
    exportTasksToCSV() {
        const tasks = storage.getTasks();
        const customers = storage.getCustomers();
        
        if (tasks.length === 0) {
            alert('No tasks to export');
            return;
        }

        // Create customer lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c.name;
        });

        // Define CSV headers
        const headers = ['ID', 'Customer', 'Description', 'Notes', 'Deadline', 'Responsible Person', 'Status', 'Created At'];
        
        // Convert data to CSV format
        const csvContent = this.convertToCSV(tasks, headers, (task) => [
            task.id,
            customerMap[task.customerId] || 'Unknown',
            task.description,
            task.notes || '',
            task.deadline,
            task.responsible,
            task.status,
            task.createdAt || ''
        ]);

        this.downloadCSV(csvContent, 'tasks');
    }

    // Convert data to CSV string
    convertToCSV(data, headers, rowMapper) {
        const rows = [headers];
        
        data.forEach(item => {
            const row = rowMapper(item);
            // Escape special characters and wrap in quotes if needed
            const escapedRow = row.map(field => {
                const fieldStr = String(field);
                if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
                    return `"${fieldStr.replace(/"/g, '""')}"`;
                }
                return fieldStr;
            });
            rows.push(escapedRow);
        });

        return rows.map(row => row.join(',')).join('\n');
    }

    // Download CSV file
    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        
        link.href = url;
        link.download = `${filename}-${timestamp}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Import customers from CSV
    importCustomersFromCSV(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const csv = e.target.result;
                const lines = csv.split('\n');
                
                if (lines.length < 2) {
                    alert('CSV file is empty or invalid');
                    return;
                }

                // Skip header row
                const dataLines = lines.slice(1).filter(line => line.trim());
                let imported = 0;
                let errors = 0;

                dataLines.forEach(line => {
                    try {
                        const values = this.parseCSVLine(line);
                        
                        if (values.length >= 3) {
                            const customer = {
                                name: values[1] || '',
                                contact: values[2] || '',
                                companyNumber: values[3] || '',
                                email: values[4] || '',
                                phone: values[5] || '',
                                address: values[6] || '',
                                status: values[7] || 'onboarding'
                            };

                            // Validate required fields
                            if (customer.name && customer.contact && customer.companyNumber) {
                                storage.addCustomer(customer);
                                imported++;
                            } else {
                                errors++;
                            }
                        }
                    } catch (err) {
                        console.error('Error parsing line:', line, err);
                        errors++;
                    }
                });

                alert(`Import completed!\nImported: ${imported}\nErrors: ${errors}`);
                
                // Refresh the display
                if (window.customerManager) {
                    window.customerManager.renderCustomers();
                }
            } catch (error) {
                console.error('Error importing CSV:', error);
                alert('Error importing CSV file. Please check the file format.');
            }
        };

        reader.readAsText(file);
    }

    // Import tasks from CSV
    importTasksFromCSV(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const csv = e.target.result;
                const lines = csv.split('\n');
                
                if (lines.length < 2) {
                    alert('CSV file is empty or invalid');
                    return;
                }

                const customers = storage.getCustomers();
                const customerNameMap = {};
                customers.forEach(c => {
                    customerNameMap[c.name.toLowerCase()] = c.id;
                });

                // Skip header row
                const dataLines = lines.slice(1).filter(line => line.trim());
                let imported = 0;
                let errors = 0;

                dataLines.forEach(line => {
                    try {
                        const values = this.parseCSVLine(line);
                        
                        if (values.length >= 5) {
                            const customerName = values[1] || '';
                            const customerId = customerNameMap[customerName.toLowerCase()];

                            if (!customerId) {
                                console.warn('Customer not found:', customerName);
                                errors++;
                                return;
                            }

                            const task = {
                                customerId: customerId,
                                description: values[2] || '',
                                notes: values[3] || '',
                                deadline: values[4] || '',
                                responsible: values[5] || '',
                                status: values[6] || 'pending'
                            };

                            // Validate required fields
                            if (task.description && task.deadline && task.responsible) {
                                storage.addTask(task);
                                imported++;
                            } else {
                                errors++;
                            }
                        }
                    } catch (err) {
                        console.error('Error parsing line:', line, err);
                        errors++;
                    }
                });

                alert(`Import completed!\nImported: ${imported}\nErrors: ${errors}`);
                
                // Refresh the display
                if (window.taskManager) {
                    window.taskManager.renderTasks();
                }
            } catch (error) {
                console.error('Error importing CSV:', error);
                alert('Error importing CSV file. Please check the file format.');
            }
        };

        reader.readAsText(file);
    }

    // Parse CSV line handling quoted values
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }
}

// Create global CSV manager instance
const csvManager = new CSVManager();
