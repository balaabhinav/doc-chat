import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import uploadRoute from './routes/upload.route';
import fileRoute from './routes/file.route';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from uploaded_files directory (for local development)
if (process.env.NODE_ENV !== 'production') {
  const uploadDir = path.resolve(process.cwd(), 'uploaded_files');
  app.use('/uploads', express.static(uploadDir));
}

// API routes
app.use('/api/upload', uploadRoute);
app.use('/api/files', fileRoute);

app.get('/', (req: Request, res: Response) => {
    res.send('Doc-Chat Server is running');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
