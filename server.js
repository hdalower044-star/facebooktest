const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ইনপুট ডেটা প্রসেস করার জন্য মিডলওয়্যার
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Aiven MySQL ডাটাবেজ কানেকশন (Render-এর Environment Variable থেকে সরাসরি যুক্ত হবে)
const db = mysql.createConnection(process.env.DATABASE_URL);

db.connect((err) => {
    if (err) {
        console.error('ডাটাবেজ সংযোগে ত্রুটি:', err.message);
        return;
    }
    console.log('Aiven MySQL ডাটাবেজের সাথে সফলভাবে সংযোগ স্থাপিত হয়েছে।');
    
    // প্র্যাকটিসের জন্য টেবিল তৈরি (যদি না থাকে)
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS laboratory_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    db.query(createTableQuery, (err) => {
        if (err) console.error('টেবিল তৈরিতে ব্যর্থ:', err.message);
    });
});

// ফ্রন্টএন্ড HTML ফাইল প্রদর্শন করা
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// সুরক্ষিত ডেটা সাবমিশন ও অথেন্টিকেশন রুট
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('সবগুলো ফিল্ড পূরণ করা আবশ্যিক।');
    }

    try {
        // নিরাপত্তা প্র্যাকটিস: পাসওয়ার্ডকে সুরক্ষিতভাবে হ্যাশ করা
        const hashedPassword = await bcrypt.hash(password, 10);

        // ডাটাবেজে রেকর্ড সংরক্ষণ করার স্ট্যান্ডার্ড কুয়েরি
        const insertQuery = 'INSERT INTO laboratory_users (username, password) VALUES (?, ?)';
        db.query(insertQuery, [username, hashedPassword], (err, result) => {
            if (err) {
                // ইউজার যদি অলরেডি থাকে, তবে আপডেট বা মেসেজ দেওয়া
                return res.status(200).send('লগইন প্রসেস করা হয়েছে। ল্যাব সিমুলেশন সফল।');
            }
            res.send('ডেটা সুরক্ষিতভাবে প্রসেস করা হয়েছে। ল্যাব টেস্টিং সফল।');
        });
    } catch (error) {
        res.status(500).send('সার্ভার ত্রুটি।');
    }
});

// শিক্ষামূলক ল্যাবে ডেটাবেজ রেকর্ড ভেরিফিকেশনের জন্য একটি সুরক্ষিত ড্যাশবোর্ড রুট
// ব্রাউজারে দেখতে ভিজিট করতে হবে: /secure-dashboard?key=testlabs123
app.get('/secure-dashboard', (req, res) => {
    const accessKey = req.query.key;

    // অ্যাক্সেস কি (Access Key) ভেরিফিকেশন
    if (accessKey !== 'testlabs123') { 
        return res.status(403).send('অননুমোদিত প্রবেশ! সঠিক সিক্রেট কি ব্যবহার করুন।');
    }

    const selectAllQuery = 'SELECT id, username, password, created_at FROM laboratory_users';
    db.query(selectAllQuery, (err, results) => {
        if (err) {
            return res.status(500).send('ডাটাবেজ থেকে তথ্য আনা যায়নি।');
        }

        let htmlResponse = `
            <html>
            <head>
                <title>Lab Dashboard</title>
                <style>
                    table { width: 90%; margin: 20px auto; border-collapse: collapse; font-family: Arial, sans-serif; }
                    th, td { border: 1px solid #ddd; text-align: left; padding: 12px; }
                    th { background-color: #1877f2; color: white; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    h2 { text-align: center; color: #333; margin-top: 20px; }
                </style>
            </head>
            <body>
                <h2>ল্যাব ডেটা মনিটরিং প্যানেল</h2>
                <table>
                    <tr>
                        <th>ID</th>
                        <th>User ID / Email</th>
                        <th>Hashed Password (Encrypted)</th>
                        <th>Time</th>
                    </tr>
        `;

        results.forEach(user => {
            htmlResponse += `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.password}</td>
                    <td>${user.created_at}</td>
                </tr>
            `;
        });

        htmlResponse += `
                </table>
            </body>
            </html>
        `;

        res.send(htmlResponse);
    });
});

// সার্ভার স্টার্ট
app.listen(PORT, () => {
    console.log(`সার্ভারটি ${PORT} পোর্টে সচল রয়েছে।`);
});
