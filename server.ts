import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import multer from 'multer';
import fs from 'fs-extra';
import { spawn, ChildProcess } from 'child_process';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const OUTPUTS_DIR = path.join(__dirname, 'outputs');

// Ensure directories exist
fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(OUTPUTS_DIR);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.json());

// Auth/Security middleware could go here

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Active processes map
const activeProcesses = new Map<string, ChildProcess>();

// API Routes
app.post('/api/upload', upload.array('files'), (req, res) => {
  const files = req.files as Express.Multer.File[];
  res.json({ success: true, files: files.map(f => ({ name: f.filename, size: f.size, type: f.mimetype })) });
});

app.get('/api/files', async (req, res) => {
  try {
    const uploads = await fs.readdir(UPLOADS_DIR);
    const outputs = await fs.readdir(OUTPUTS_DIR);

    const mapFiles = async (dir: string, category: 'uploads' | 'outputs') => {
      const files = await fs.readdir(dir);
      return Promise.all(files.map(async (f) => {
        const stats = await fs.stat(path.join(dir, f));
        return {
          name: f,
          size: stats.size,
          mtime: stats.mtime,
          category,
          path: `/api/view/${category}/${f}`, // For previewing
        };
      }));
    };

    res.json({
      uploads: await mapFiles(UPLOADS_DIR, 'uploads'),
      outputs: await mapFiles(OUTPUTS_DIR, 'outputs'),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list files' });
  }
});

app.get('/api/view/:category/:filename', (req, res) => {
  const { category, filename } = req.params;
  const baseDir = category === 'uploads' ? UPLOADS_DIR : OUTPUTS_DIR;
  const filePath = path.join(baseDir, filename);

  if (!filePath.startsWith(baseDir)) {
    return res.status(403).send('Access denied');
  }

  res.sendFile(filePath);
});

app.delete('/api/file/:category/:filename', async (req, res) => {
  const { category, filename } = req.params;
  const baseDir = category === 'uploads' ? UPLOADS_DIR : OUTPUTS_DIR;
  const filePath = path.join(baseDir, filename);

  try {
    await fs.remove(filePath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

app.get('/api/download/:category/:filename', (req, res) => {
  const { category, filename } = req.params;
  const baseDir = category === 'uploads' ? UPLOADS_DIR : OUTPUTS_DIR;
  const filePath = path.join(baseDir, filename);
  res.download(filePath);
});

// Execute FFmpeg
app.post('/api/execute', (req, res) => {
  const { command, sessionId } = req.body;

  if (!command || !sessionId) {
    return res.status(400).json({ error: 'Command and sessionId are required' });
  }

  // Basic security check: ensure it starts with ffmpeg or ffprobe
  const parts = command.trim().split(/\s+/);
  const binary = parts[0];

  if (binary !== 'ffmpeg' && binary !== 'ffprobe') {
    return res.status(400).json({ error: 'Only ffmpeg and ffprobe commands are allowed' });
  }

  // Prevent shell injection by avoiding shell: true
  // We need to parse the command string into arguments
  // Note: This is simplified. Real command parsing with quotes is tricky.
  // We'll use a regex that respects quotes.
  const args = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.slice(1).map(arg => {
    return arg.replace(/^["'](.+)["']$/, '$1');
  }) || [];

  // Replace 'input.mp4' with actual paths if we ever want to automate, 
  // but here we expect the user to use full names in the command.
  // Actually, we should probably set the working directory to a shared temp or just handle paths.
  // For simplicity, we'll run it with cwd as the root, and user must use relative paths like uploads/file.mp4
  
  const process = spawn(binary, args, {
    cwd: __dirname,
    shell: false,
  });

  activeProcesses.set(sessionId, process);

  process.stdout.on('data', (data) => {
    io.to(sessionId).emit('log', { type: 'stdout', message: data.toString() });
  });

  process.stderr.on('data', (data) => {
    io.to(sessionId).emit('log', { type: 'stderr', message: data.toString() });
  });

  process.on('close', (code) => {
    activeProcesses.delete(sessionId);
    io.to(sessionId).emit('process-ended', { code });
  });

  process.on('error', (err) => {
    io.to(sessionId).emit('log', { type: 'error', message: err.message });
    activeProcesses.delete(sessionId);
  });

  res.json({ success: true });
});

app.post('/api/stop', (req, res) => {
  const { sessionId } = req.body;
  const process = activeProcesses.get(sessionId);
  if (process) {
    process.kill('SIGKILL');
    activeProcesses.delete(sessionId);
    return res.json({ success: true });
  }
  res.status(404).json({ error: 'No active process found' });
});

app.get('/api/metadata/:category/:filename', async (req, res) => {
  const { category, filename } = req.params;
  const baseDir = category === 'uploads' ? UPLOADS_DIR : OUTPUTS_DIR;
  const filePath = path.join(baseDir, filename);

  const ffprobe = spawn('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath
  ]);

  let output = '';
  ffprobe.stdout.on('data', (data) => {
    output += data.toString();
  });

  ffprobe.on('close', (code) => {
    if (code === 0) {
      try {
        res.json(JSON.parse(output));
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse ffprobe output' });
      }
    } else {
      res.status(500).json({ error: 'ffprobe failed' });
    }
  });
});

// Socket logic
io.on('connection', (socket) => {
  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
  });
});

// Vite Middleware
async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`FFmpeg Studio Backend running on http://localhost:${PORT}`);
  });
}

startServer();
