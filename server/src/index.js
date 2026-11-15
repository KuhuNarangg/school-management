import { app } from './app';
import { connectDB } from './db';
const PORT = Number(process.env.PORT || 4000);
async function startServer() {
    try {
        await connectDB();
        console.log('✅ Connected to MongoDB Atlas (northstar_school)');
        app.listen(PORT, () => {
            console.log(`🚀 Northstar Express API Server listening on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start Express server:', error);
        process.exit(1);
    }
}
startServer();
