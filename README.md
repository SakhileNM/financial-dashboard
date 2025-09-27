# Financial Data Visualization Dashboard

A full-stack web application for uploading and visualizing financial data from Excel files.

## Features

- Excel file upload with validation
- MySQL database integration
- Data visualization with tables and charts
- Responsive design
- Comprehensive error handling
- Security measures for file uploads

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript, Chart.js
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **File Processing**: Multer, XLSX

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- Git

## Usage

### Step 1: Initial Setup

**Clone the Repository**
```bash
git clone https://github.com/SakhileNM/financial-dashboard.git
cd financial-dashboard
```

**Database Setup**
```bash
mysql -u root -p < database/schema.sql

# Edit backend/server.js and update your MySQL password:
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'your_mysql_password_here', // ← Update this
    database: 'financial_dashboard'
};
```

**Backend Setup**
```bash
# Navigate to the backend directory
cd backend

# Install dependencies (if not done already)
npm install

# Start the server
node server.js
```
The backend will run on http://localhost:3000

### Step 2: Open the Frontend
Open ```frontend/index.html``` in your web browser.
You can:
 - Double-click the file
   OR
 - Use a local server like Live Server in VS Code

### Step 3: Upload Financial Data
- **User ID**: Enter ```1``` for Jane Doe or ```2``` for John Smith
- **Year**: Enter the financial year (e.g., ```2025```)
- **File**: Click "Choose File" and select an Excel file

**Click Upload**

### Step 4: View Results

**Expected Result**: Dashboard showing {user's} {year} financial data with available months of data.

**Excel File Format Requirements**
- Your Excel file must have this exact structure:
  - Columns: "Month" and "Amount" (case-sensitive)
  - Months: Full names (January, February, etc.)
  - Amounts: Numeric values (invalid amounts default to R 0)

```bash
Example:
Month	Amount
January	1500.00
February	2200.50
```
