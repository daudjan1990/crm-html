// pdf.js - Handles PDF export functionality using jsPDF

class PDFManager {
    constructor() {
        // Wait for jsPDF to load
        this.checkLibraryLoaded();
    }

    checkLibraryLoaded() {
        if (typeof window.jspdf === 'undefined') {
            console.warn('jsPDF library not loaded yet');
        }
    }

    // Export customers to PDF
    exportCustomersToPDF() {
        const customers = storage.getCustomers();
        
        if (customers.length === 0) {
            alert('No customers to export');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add title
            doc.setFontSize(20);
            doc.text('Customer Report', 14, 20);
            
            // Add date
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
            
            // Prepare table data
            const tableData = customers.map(customer => [
                customer.name,
                customer.contact,
                customer.companyNumber,
                customer.email || '-',
                customer.phone || '-'
            ]);
            
            // Add table
            doc.autoTable({
                head: [['Name', 'Contact Person', 'Company Number', 'Email', 'Phone']],
                body: tableData,
                startY: 35,
                styles: { fontSize: 9 },
                headStyles: { fillColor: [52, 152, 219] }
            });
            
            // Add customer details on separate pages if needed
            let currentY = doc.lastAutoTable.finalY + 10;
            
            customers.forEach((customer, index) => {
                if (customer.address) {
                    // Check if we need a new page
                    if (currentY > 250) {
                        doc.addPage();
                        currentY = 20;
                    }
                    
                    doc.setFontSize(12);
                    doc.setFont(undefined, 'bold');
                    doc.text(`${customer.name}`, 14, currentY);
                    currentY += 7;
                    
                    doc.setFontSize(10);
                    doc.setFont(undefined, 'normal');
                    
                    if (customer.address) {
                        doc.text(`Address: ${customer.address}`, 14, currentY);
                        currentY += 7;
                    }
                    
                    currentY += 5; // Extra spacing
                }
            });
            
            // Save the PDF
            const timestamp = new Date().toISOString().split('T')[0];
            doc.save(`customers-report-${timestamp}.pdf`);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please ensure the PDF library is loaded.');
        }
    }

    // Export tasks to PDF
    exportTasksToPDF() {
        const tasks = storage.getTasks();
        const customers = storage.getCustomers();
        
        if (tasks.length === 0) {
            alert('No tasks to export');
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
            doc.text('Task Report', 14, 20);
            
            // Add date
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
            
            // Prepare table data
            const tableData = tasks.map(task => [
                customerMap[task.customerId] || 'Unknown',
                task.description,
                task.deadline,
                task.responsible,
                this.getStatusLabel(task.status)
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
            
            // Add task details with notes
            let currentY = doc.lastAutoTable.finalY + 10;
            
            tasks.forEach((task, index) => {
                if (task.notes) {
                    // Check if we need a new page
                    if (currentY > 250) {
                        doc.addPage();
                        currentY = 20;
                    }
                    
                    doc.setFontSize(12);
                    doc.setFont(undefined, 'bold');
                    doc.text(`${task.description}`, 14, currentY);
                    currentY += 7;
                    
                    doc.setFontSize(10);
                    doc.setFont(undefined, 'normal');
                    doc.text(`Customer: ${customerMap[task.customerId] || 'Unknown'}`, 14, currentY);
                    currentY += 6;
                    
                    // Wrap notes text
                    const notesLines = doc.splitTextToSize(`Notes: ${task.notes}`, 180);
                    doc.text(notesLines, 14, currentY);
                    currentY += (notesLines.length * 5) + 5;
                    
                    currentY += 3; // Extra spacing
                }
            });
            
            // Save the PDF
            const timestamp = new Date().toISOString().split('T')[0];
            doc.save(`tasks-report-${timestamp}.pdf`);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please ensure the PDF library is loaded.');
        }
    }

    // Export combined report (customers and tasks)
    exportCombinedPDF() {
        const customers = storage.getCustomers();
        const tasks = storage.getTasks();
        
        if (customers.length === 0 && tasks.length === 0) {
            alert('No data to export');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add title
            doc.setFontSize(20);
            doc.text('CRM Complete Report', 14, 20);
            
            // Add date
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
            
            let currentY = 40;
            
            // Customers section
            if (customers.length > 0) {
                doc.setFontSize(16);
                doc.setFont(undefined, 'bold');
                doc.text('Customers', 14, currentY);
                currentY += 10;
                
                const customerData = customers.map(c => [
                    c.name,
                    c.contact,
                    c.companyNumber,
                    c.email || '-'
                ]);
                
                doc.autoTable({
                    head: [['Name', 'Contact Person', 'Company Number', 'Email']],
                    body: customerData,
                    startY: currentY,
                    styles: { fontSize: 9 },
                    headStyles: { fillColor: [52, 152, 219] }
                });
                
                currentY = doc.lastAutoTable.finalY + 15;
            }
            
            // Tasks section
            if (tasks.length > 0) {
                // Check if we need a new page
                if (currentY > 200) {
                    doc.addPage();
                    currentY = 20;
                }
                
                doc.setFontSize(16);
                doc.setFont(undefined, 'bold');
                doc.text('Tasks', 14, currentY);
                currentY += 10;
                
                const customerMap = {};
                customers.forEach(c => {
                    customerMap[c.id] = c.name;
                });
                
                const taskData = tasks.map(t => [
                    customerMap[t.customerId] || 'Unknown',
                    t.description,
                    t.deadline,
                    t.responsible,
                    this.getStatusLabel(t.status)
                ]);
                
                doc.autoTable({
                    head: [['Customer', 'Description', 'Deadline', 'Responsible', 'Status']],
                    body: taskData,
                    startY: currentY,
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [52, 152, 219] },
                    columnStyles: {
                        1: { cellWidth: 45 }
                    }
                });
            }
            
            // Save the PDF
            const timestamp = new Date().toISOString().split('T')[0];
            doc.save(`crm-complete-report-${timestamp}.pdf`);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please ensure the PDF library is loaded.');
        }
    }

    // Helper method to get status label
    getStatusLabel(status) {
        const statusMap = {
            'pending': 'Pending',
            'in-progress': 'In Progress',
            'completed': 'Completed'
        };
        return statusMap[status] || status;
    }
}

// Create global PDF manager instance
const pdfManager = new PDFManager();
