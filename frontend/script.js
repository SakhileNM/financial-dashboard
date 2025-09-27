class FinancialDashboard {
    constructor() {
        this.apiBase = 'http://localhost:3000/api/finances';
        this.monthOrder = {
            'January': 1, 'February': 2, 'March': 3, 'April': 4,
            'May': 5, 'June': 6, 'July': 7, 'August': 8,
            'September': 9, 'October': 10, 'November': 11, 'December': 12
        };
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const uploadForm = document.getElementById('uploadForm');
        uploadForm.addEventListener('submit', (e) => this.handleUpload(e));
    }

    async handleUpload(e) {
        e.preventDefault();
        
        const userId = document.getElementById('userId').value;
        const year = document.getElementById('year').value;
        const fileInput = document.getElementById('file');
        const messageDiv = document.getElementById('uploadMessage');

        if (!fileInput.files.length) {
            this.showMessage('Please select a file', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        try {
            messageDiv.innerHTML = 'Uploading...';
            messageDiv.className = 'message';

            const response = await fetch(`${this.apiBase}/upload/${userId}/${year}`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.errors?.[0]?.msg || 'Upload failed');
            }

            this.showMessage(result.message, 'success');
            await this.loadDashboard(userId, year);
            
        } catch (error) {
            this.showMessage(error.message, 'error');
            console.error('Upload error:', error);
        }
    }

    async loadDashboard(userId, year) {
        try {
            const response = await fetch(`${this.apiBase}/${userId}/${year}`);
            
            if (!response.ok) {
                throw new Error('Failed to load data');
            }

            const data = await response.json();
            this.displayDashboard(data);
            
        } catch (error) {
            this.showMessage('Failed to load dashboard data', 'error');
            console.error('Dashboard load error:', error);
        }
    }

    displayDashboard(data) {
        // Show dashboard section
        const dashboard = document.getElementById('dashboard');
        dashboard.style.display = 'block';

        // Update user info
        document.getElementById('userName').textContent = data.user.name;
        document.getElementById('yearInfo').textContent = `Year: ${data.year}`;

        // Sort records by month order
        const sortedRecords = data.records.sort((a, b) => 
            this.monthOrder[a.month] - this.monthOrder[b.month]
        );

        // Update table and chart with sorted data
        this.updateTable(sortedRecords);
        this.updateChart(sortedRecords, data.user.name, data.year);
    }

    updateTable(records) {
        const tbody = document.querySelector('#financialTable tbody');
        tbody.innerHTML = '';

        records.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.month}</td>
                <td>R ${record.amount.toLocaleString()}</td> 
            `;
            tbody.appendChild(row);
        });
    }

    updateChart(records, userName, year) {
        const ctx = document.getElementById('financialChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.chart) {
            this.chart.destroy();
        }

        const months = records.map(r => r.month);
        const amounts = records.map(r => r.amount);

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: `Amount (R) - ${year}`,
                    data: amounts,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Amount (R)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Month'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `Financial Data - ${userName} (${year})`
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Amount: R ${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                }
            }
        });
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('uploadMessage');
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new FinancialDashboard();
});