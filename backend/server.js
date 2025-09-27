const express = require('express');
const multer = require('multer');
const mysql = require('mysql2/promise');
const XLSX = require('xlsx');
const cors = require('cors');
const helmet = require('helmet');
const { body, validationResult, param } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'cput',
    database: 'financial_dashboard'
};

// Multer configuration for file upload
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed'), false);
        }
    }
});

// Database connection pool
const createPool = () => mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

let pool = createPool();

// Utility function to execute queries
async function executeQuery(query, params = []) {
    try {
        const [results] = await pool.execute(query, params);
        return results;
    } catch (error) {
        throw error;
    }
}

// Validation middleware
const validateUpload = [
    param('userId').isInt({ min: 1 }).withMessage('Invalid user ID'),
    param('year').isInt({ min: 2000, max: 2100 }).withMessage('Invalid year'),
    body().custom((value, { req }) => {
        if (!req.file) {
            throw new Error('Excel file is required');
        }
        return true;
    })
];

// POST /api/finances/upload/:userId/:year
app.post('/api/finances/upload/:userId/:year', 
    upload.single('file'),
    validateUpload,
    async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId, year } = req.params;
        
        // Verify user exists
        const user = await executeQuery('SELECT * FROM users WHERE user_id = ?', [userId]);
        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Parse Excel file
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        // Validate Excel structure
        if (data.length === 0) {
            return res.status(400).json({ error: 'Excel file is empty' });
        }

        const requiredColumns = ['Month', 'Amount'];
        const firstRow = data[0];
        const hasRequiredColumns = requiredColumns.every(col => col in firstRow);
        
        if (!hasRequiredColumns) {
            return res.status(400).json({ 
                error: 'Excel file must contain "Month" and "Amount" columns' 
            });
        }

        // Process data in transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Delete existing records for this user/year (overwrite behavior)
            await connection.execute(
                'DELETE FROM financial_records WHERE user_id = ? AND year = ?',
                [userId, year]
            );

            // Insert new records with enhanced validation
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                            'July', 'August', 'September', 'October', 'November', 'December'];
            
            const insertPromises = data.map(async (row, index) => {
                const month = String(row.Month || '').trim();
                let amount = row.Amount;
                
                // Validate month
                if (!monthNames.includes(month)) {
                    throw new Error(`Invalid month "${month}" at row ${index + 2}`);
                }
                
                // Validate amount - default to 0 for invalid values
                if (amount === null || amount === undefined || amount === '') {
                    console.warn(`Empty amount at row ${index + 2}, defaulting to 0.`);
                    amount = 0;
                } else {
                    amount = parseFloat(amount);
                    if (isNaN(amount)) {
                        console.warn(`Non-numeric amount "${row.Amount}" at row ${index + 2}, defaulting to 0.`);
                        amount = 0;
                    } else if (amount < 0) {
                        console.warn(`Negative amount "${row.Amount}" at row ${index + 2}, defaulting to 0.`);
                        amount = 0;
                    }
                }

                await connection.execute(
                    'INSERT INTO financial_records (user_id, year, month, amount) VALUES (?, ?, ?, ?)',
                    [userId, year, month, amount]
                );
            });

            await Promise.all(insertPromises);
            await connection.commit();

            res.json({ 
                message: `Successfully processed ${data.length} records for user ${userId}, year ${year}. Amounts displayed in Rands.` 
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            error: 'Failed to process upload',
            details: error.message 
        });
    }
});

// GET /api/finances/:userId/:year
app.get('/api/finances/:userId/:year', 
    [
        param('userId').isInt({ min: 1 }),
        param('year').isInt({ min: 2000, max: 2100 })
    ],
    async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId, year } = req.params;

        // Get user info and financial records
        const [user] = await executeQuery('SELECT * FROM users WHERE user_id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // In the GET /api/finances/:userId/:year endpoint, change the query:
        const records = await executeQuery(
            `SELECT * FROM financial_records 
            WHERE user_id = ? AND year = ? 
            ORDER BY 
                CASE month
                    WHEN 'January' THEN 1
                    WHEN 'February' THEN 2
                    WHEN 'March' THEN 3
                    WHEN 'April' THEN 4
                    WHEN 'May' THEN 5
                    WHEN 'June' THEN 6
                    WHEN 'July' THEN 7
                    WHEN 'August' THEN 8
                    WHEN 'September' THEN 9
                    WHEN 'October' THEN 10
                    WHEN 'November' THEN 11
                    WHEN 'December' THEN 12
                END`,
            [userId, year]
        );

        res.json({
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email
            },
            year: parseInt(year),
            records: records.map(record => ({
                month: record.month,
                amount: parseFloat(record.amount)
            }))
        });

    } catch (error) {
        console.error('Retrieval error:', error);
        res.status(500).json({ error: 'Failed to retrieve data' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large' });
        }
    }
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});