import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { INITIAL_NOTES, INITIAL_CLASSES } from './src/data';

const app = express();

// Parse command line arguments for port
const args = process.argv.slice(2);
let port = 3000;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
  } else if (args[i].startsWith('--port=')) {
    port = parseInt(args[i].split('=')[1], 10);
  }
}
if (!port || isNaN(port)) {
  port = parseInt(process.env.PORT || '3000', 10);
}

// Enable 50MB payload for PDFs & rich notes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure data directory exists
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');

// Helper to read and write JSON safely
function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch (err) {
    console.warn(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Pre-seed accounts so user doesn't get locked out across devices
interface UserRecord {
  id: string;
  studentId: string;
  name: string;
  password: string;
  role: string;
  educationLevel?: string;
  grade?: number;
  semester?: number;
  coachingStream?: string;
  academicLevelLabel?: string;
  schoolName?: string;
  createdAt: string;
  lastLoginAt: string;
}

// Initialize users database
let users: Record<string, UserRecord> = readJsonFile<Record<string, UserRecord>>(USERS_FILE, {});

// Ensure default accounts exist for Ayush and demo
const defaultAccounts: UserRecord[] = [
  {
    id: 'ahirayush2121@gmail.com',
    studentId: 'ahirayush2121@gmail.com',
    name: 'Ayush Ahir',
    password: 'ayush@123',
    role: 'student',
    educationLevel: 'school',
    grade: 10,
    academicLevelLabel: 'Class 10',
    schoolName: 'Delhi Public School',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  },
  {
    id: 'ayush@123gmail.com',
    studentId: 'ayush@123gmail.com',
    name: 'Ayush',
    password: 'ayush@123',
    role: 'student',
    educationLevel: 'school',
    grade: 10,
    academicLevelLabel: 'Class 10',
    schoolName: 'Central Public School',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  }
];

let usersModified = false;
for (const acc of defaultAccounts) {
  if (!users[acc.id.toLowerCase()]) {
    users[acc.id.toLowerCase()] = acc;
    usersModified = true;
  }
}
if (usersModified) {
  writeJsonFile(USERS_FILE, users);
}

// Initialize notes database
let storedNotes = readJsonFile<any[]>(NOTES_FILE, []);
if (storedNotes.length === 0) {
  storedNotes = [...INITIAL_NOTES];
  writeJsonFile(NOTES_FILE, storedNotes);
}

// ======================== API ROUTES ========================

// 1. Register student
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, studentId, password, educationLevel, grade, semester, coachingStream, academicLevelLabel, schoolName } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }
    if (!studentId || !studentId.trim()) {
      return res.status(400).json({ error: 'Please enter a User ID.' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Please enter a password.' });
    }

    const normId = studentId.trim().toLowerCase();
    users = readJsonFile<Record<string, UserRecord>>(USERS_FILE, {});

    const now = new Date().toISOString();
    const newUser: UserRecord = {
      id: normId,
      studentId: normId,
      name: name.trim(),
      password: String(password),
      role: 'student',
      educationLevel: educationLevel || 'school',
      grade: grade ? Number(grade) : 10,
      semester: semester ? Number(semester) : undefined,
      coachingStream: coachingStream || undefined,
      academicLevelLabel: academicLevelLabel || (educationLevel === 'college' ? 'College' : `Class ${grade || 10}`),
      schoolName: schoolName ? schoolName.trim() : 'Study Notes Vault Archive',
      createdAt: now,
      lastLoginAt: now
    };

    // If user already exists, update their record or allow seamless re-registration
    users[normId] = newUser;
    writeJsonFile(USERS_FILE, users);

    // Return sanitized user (without password)
    const { password: _, ...safeUser } = newUser;
    console.log(`[AUTH] Registered/updated user: ${normId} across all devices!`);
    return res.status(200).json({
      success: true,
      message: 'Account registered successfully on central database!',
      user: safeUser
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error during registration.' });
  }
});

// 2. Login student
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { studentId, password } = req.body;

    if (!studentId || !studentId.trim()) {
      return res.status(400).json({ error: 'Please enter your User ID.' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Please enter your password.' });
    }

    const normId = studentId.trim().toLowerCase();
    users = readJsonFile<Record<string, UserRecord>>(USERS_FILE, {});

    let foundUser = users[normId];

    // If not found directly, check if username matches prefix (e.g. ayush@123 vs ayush@123gmail.com)
    if (!foundUser) {
      const matchingKey = Object.keys(users).find(k => k === normId || k.startsWith(normId + '@') || normId.startsWith(k.split('@')[0]));
      if (matchingKey) {
        foundUser = users[matchingKey];
      }
    }

    if (!foundUser) {
      return res.status(404).json({
        error: `User ID "${normId}" not found. Please click "Register" to create your account first.`
      });
    }

    // Verify password
    if (foundUser.password !== String(password).trim()) {
      return res.status(401).json({
        error: 'Incorrect password! Please check and try again.'
      });
    }

    // Update last login
    foundUser.lastLoginAt = new Date().toISOString();
    users[foundUser.id.toLowerCase()] = foundUser;
    writeJsonFile(USERS_FILE, users);

    const { password: _, ...safeUser } = foundUser;
    console.log(`[AUTH] Login successful for user: ${foundUser.id} on device!`);
    return res.status(200).json({
      success: true,
      user: safeUser
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error during login.' });
  }
});

// 3. Get single user
app.get('/api/auth/user/:id', (req: Request, res: Response) => {
  const normId = req.params.id.trim().toLowerCase();
  users = readJsonFile<Record<string, UserRecord>>(USERS_FILE, {});
  const user = users[normId];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const { password: _, ...safeUser } = user;
  return res.json(safeUser);
});

// 4. Get all notes
app.get('/api/notes', (req: Request, res: Response) => {
  try {
    storedNotes = readJsonFile<any[]>(NOTES_FILE, INITIAL_NOTES);
    return res.json(storedNotes);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Create / Upload note
app.post('/api/notes', (req: Request, res: Response) => {
  try {
    const noteData = req.body;
    if (!noteData.title || !noteData.subject) {
      return res.status(400).json({ error: 'Title and subject are required.' });
    }

    storedNotes = readJsonFile<any[]>(NOTES_FILE, INITIAL_NOTES);
    
    // Check if note already exists, if so update it, otherwise prepend
    const existingIndex = storedNotes.findIndex(n => n.id === noteData.id);
    if (existingIndex >= 0) {
      storedNotes[existingIndex] = {
        ...storedNotes[existingIndex],
        ...noteData,
        updatedAt: new Date().toISOString()
      };
    } else {
      storedNotes.unshift({
        ...noteData,
        id: noteData.id || `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString()
      });
    }

    writeJsonFile(NOTES_FILE, storedNotes);
    console.log(`[NOTES] Saved note "${noteData.title}" (${noteData.id}) to central database!`);
    return res.status(200).json({ success: true, note: noteData });
  } catch (err: any) {
    console.error('Save note error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 6. Get single note
app.get('/api/notes/:id', (req: Request, res: Response) => {
  storedNotes = readJsonFile<any[]>(NOTES_FILE, INITIAL_NOTES);
  const note = storedNotes.find(n => n.id === req.params.id);
  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }
  return res.json(note);
});

// 7. Get curriculum classes
app.get('/api/classes', (_req: Request, res: Response) => {
  return res.json(INITIAL_CLASSES);
});

// ======================== VITE / STATIC SERVING ========================

async function start() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`>>> NotesVault Server running on http://0.0.0.0:${port} (${isProd ? 'production' : 'development'})`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
