import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    // Sử dụng chung biến DATABASE_URL trong file .env của bạn
    connectionString: process.env.DATABASE_URL,
});

// Lắng nghe sự kiện để báo lỗi nếu DB sập
pool.on('error', (err) => {
    console.error('❌ Lỗi kết nối PostgreSQL (Unexpected Error):', err);
});

export default pool;