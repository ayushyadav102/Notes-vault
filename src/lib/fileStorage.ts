import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import { Note } from '../types';

// IndexedDB helper for robust cross-session client-side storage of full notes files
const DB_NAME = 'NotesVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'notes_files';

interface StoredFile {
  noteId: string;
  blob: Blob;
  fileName: string;
  fileType: string;
  savedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'noteId' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function storeLocalFile(
  noteId: string,
  file: File | Blob,
  fileName: string,
  fileType: string
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const data: StoredFile = {
        noteId,
        blob: file,
        fileName,
        fileType,
        savedAt: Date.now(),
      };
      const req = store.put(data);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save file to IndexedDB:', err);
  }
}

export async function getLocalFile(
  noteId: string
): Promise<{ blob: Blob; fileName: string; fileType: string } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(noteId);
      req.onsuccess = () => {
        const res = req.result as StoredFile | undefined;
        if (res && res.blob) {
          resolve({
            blob: res.blob,
            fileName: res.fileName || 'note-document.pdf',
            fileType: res.fileType || res.blob.type || 'application/pdf',
          });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve file from IndexedDB:', err);
    return null;
  }
}

export async function deleteLocalFile(noteId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(noteId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to delete file from IndexedDB:', err);
  }
}

// Convert File to Base64 Data URL
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ==========================================
// FIRESTORE CHUNKING LOGIC FOR LARGE FILES
// ==========================================
// Base64 chunk size: ~450,000 characters (~330 KB), well below Firestore's 1MB doc limit
const CHUNK_SIZE = 450000;

export async function saveFileToFirestoreChunks(
  db: any,
  noteId: string,
  dataUrl: string
): Promise<number> {
  const totalChunks = Math.ceil(dataUrl.length / CHUNK_SIZE);
  for (let i = 0; i < totalChunks; i++) {
    const chunkData = dataUrl.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    const chunkRef = doc(db, 'notes', noteId, 'chunks', String(i));
    await setDoc(chunkRef, {
      chunkIndex: i,
      data: chunkData,
      totalChunks,
      updatedAt: Date.now(),
    });
  }
  return totalChunks;
}

export async function getFileFromFirestoreChunks(
  db: any,
  noteId: string
): Promise<string | null> {
  try {
    const chunksQuery = query(
      collection(db, 'notes', noteId, 'chunks'),
      orderBy('chunkIndex', 'asc')
    );
    const snap = await getDocs(chunksQuery);
    if (snap.empty) return null;

    let fullDataUrl = '';
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && typeof data.data === 'string') {
        fullDataUrl += data.data;
      }
    });

    return fullDataUrl.length > 0 ? fullDataUrl : null;
  } catch (err) {
    console.warn('Error fetching file chunks from Firestore:', err);
    return null;
  }
}

export async function deleteFileChunksFromFirestore(
  db: any,
  noteId: string
): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'notes', noteId, 'chunks'));
    const promises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(promises);
  } catch (err) {
    console.warn('Error deleting file chunks from Firestore:', err);
  }
}

// Reliable universal download trigger that works on mobile Android Chrome, iOS Safari, and Desktop
export function triggerUniversalDownload(
  dataOrBlob: Blob | string,
  fileName: string,
  mimeType = 'application/pdf'
): void {
  let blob: Blob;

  if (typeof dataOrBlob === 'string') {
    if (dataOrBlob.startsWith('data:')) {
      try {
        const parts = dataOrBlob.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const type = mimeMatch ? mimeMatch[1] : mimeType;
        const binary = atob(parts[1]);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        blob = new Blob([array], { type });
      } catch (e) {
        console.warn('Failed to parse data URL into blob, using text blob fallback', e);
        blob = new Blob([dataOrBlob], { type: mimeType });
      }
    } else {
      blob = new Blob([dataOrBlob], { type: mimeType });
    }
  } else {
    blob = dataOrBlob;
  }

  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = blobUrl;
  anchor.download = fileName;
  anchor.setAttribute('download', fileName);

  document.body.appendChild(anchor);
  anchor.click();

  // Mobile browsers take a short moment to dispatch the download intent to the OS
  // Retain element in DOM briefly and delay URL revocation by 30 seconds
  setTimeout(() => {
    try {
      if (anchor.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Ignored cleanup error
    }
  }, 30000);
}

// Helper to get subject-specific study content for seed/curated academic notes
function getEducationalSections(note: Note): { heading: string; body: string }[] {
  const subj = (note.subject || '').toLowerCase();
  const title = note.title;

  if (subj.includes('physics') || subj.includes('electro')) {
    return [
      {
        heading: '1. Chapter Overview & Fundamental Laws',
        body: `This academic unit focuses on "${title}". Key principles include Coulomb's Law of Electrostatic Forces, Principle of Superposition, Electric Field Intensity E = F/q, and Electric Dipole Moment p = 2aq. Electric field lines always originate from positive charges and terminate on negative charges.`
      },
      {
        heading: '2. Gauss Theorem & Crucial Derivations',
        body: 'Gauss Law states that the total electric flux through a closed surface is equal to 1/ε₀ times the net charge enclosed: ∮ E·dS = q_enclosed / ε₀. Essential derivations include: (a) Electric field due to an infinitely long straight charged wire, (b) Field due to uniformly charged infinite plane sheet, and (c) Field inside and outside a spherical shell.'
      },
      {
        heading: '3. Current Electricity & Circuit Laws',
        body: "Ohm's Law in microscopic form: J = σE = E/ρ. Drift velocity expression: vd = -eEτ/m. Temperature dependence of resistance: R(T) = R₀(1 + αΔT). Kirchhoff's Current Law (junction rule based on charge conservation) and Kirchhoff's Voltage Law (loop rule based on energy conservation). Wheatstone Bridge balance condition: P/Q = R/S."
      },
      {
        heading: '4. High-Yield Exam Formulas & Units',
        body: '• Force: F = (1 / 4πε₀) · (|q₁q₂| / r²)  [Newton, N]\n• Potential: V = W/q = (1 / 4πε₀) · (q / r)  [Volt, V]\n• Capacitance: C = ε₀A / d (parallel plate with air)  [Farad, F]\n• Energy stored: U = ½ CV² = ½ Q²/C  [Joule, J]\n• Current density: J = I/A = n e vd  [A/m²]'
      },
      {
        heading: '5. High-Frequency Exam Questions & Tips',
        body: '1. Derive the expression for electric field intensity at an axial point of a dipole.\n2. State and prove Gauss theorem in electrostatics.\n3. Why do electric lines of force never cross each other?\n4. Explain how dielectric material increases the capacitance of a capacitor.'
      }
    ];
  }

  if (subj.includes('math') || subj.includes('linear') || subj.includes('algebra')) {
    return [
      {
        heading: '1. Core Concepts & Algebraic Framework',
        body: `This study guide covers "${title}". A linear equation in one variable is an equation of the form ax + b = 0, where a ≠ 0 and x is the unknown variable. Standard algebraic identities provide shorthand tools for factoring polynomials and solving polynomial equations.`
      },
      {
        heading: '2. Essential Algebraic Identities',
        body: '1. (a + b)² = a² + 2ab + b²\n2. (a - b)² = a² - 2ab + b²\n3. a² - b² = (a + b)(a - b)\n4. (x + a)(x + b) = x² + (a + b)x + ab\n5. (a + b + c)² = a² + b² + c² + 2(ab + bc + ca)\n6. (a + b)³ = a³ + b³ + 3ab(a + b)\n7. (a - b)³ = a³ - b³ - 3ab(a - b)'
      },
      {
        heading: '3. Step-by-Step Solving Methodology',
        body: 'Step 1: Simplify both sides by opening brackets and collecting like terms.\nStep 2: Use transposition to move variable terms to LHS and constants to RHS.\nStep 3: Clear any denominators by multiplying through by the LCM.\nStep 4: Isolate the unknown variable and verify the solution by substituting back into original equation.'
      },
      {
        heading: '4. Model Word Problems & Applications',
        body: 'Application types include age-based problems, perimeter/area relations, upstream/downstream speed calculations, and consecutive integers. Always clearly declare variable definitions (e.g., Let the present age of father be x years).'
      }
    ];
  }

  if (subj.includes('bio') || subj.includes('cell') || subj.includes('sci')) {
    return [
      {
        heading: '1. Chapter Overview: The Fundamental Unit of Life',
        body: `Comprehensive study module for "${title}". The cell is the basic structural and functional unit of all living organisms, first discovered by Robert Hooke (1665). The cell theory was formulated by Schleiden & Schwann and expanded by Rudolf Virchow (Omnis cellula-e cellula).`
      },
      {
        heading: '2. Prokaryotic vs Eukaryotic Organization',
        body: '• Prokaryotic cells: Lack membrane-bound nucleus and organelles; genetic material lies in nucleoid region; 70S ribosomes.\n• Eukaryotic cells: Possess well-defined nucleus with nuclear membrane; membrane-bound organelles (mitochondria, ER, Golgi); 80S ribosomes.'
      },
      {
        heading: '3. Cell Organelles & Functions',
        body: '• Mitochondria: "Powerhouse of the cell", produces ATP via cellular respiration.\n• Endoplasmic Reticulum (RER & SER): Protein synthesis (RER with ribosomes) and lipid synthesis/detoxification (SER).\n• Golgi Apparatus: Packaging, modification, and dispatch of cellular secretions.\n• Lysosomes: "Suicide bags", contain hydrolytic enzymes for intracellular digestion.\n• Plastids (Chloroplasts): Kitchen of the plant cell containing chlorophyll.'
      },
      {
        heading: '4. Plant Cell vs Animal Cell Comparison',
        body: 'Plant cells possess a rigid cellulose cell wall, large central vacuole, and plastids, but lack centrosomes. Animal cells have no cell wall, small scattered vacuoles, and contain centrioles for cell division.'
      }
    ];
  }

  if (subj.includes('history') || subj.includes('sst') || subj.includes('social') || subj.includes('revolution')) {
    return [
      {
        heading: '1. Historical Context & Root Causes',
        body: `Analytical revision summary for "${title}". Explores the socio-economic conditions, the division of the Ancien Régime into Three Estates (Clergy, Nobility, Third Estate), feudal dues, and the financial crisis leading to the convocation of the Estates-General in 1789.`
      },
      {
        heading: '2. Chronological Milestones & Key Events',
        body: '• May 1789: Meeting of the Estates-General at Versailles.\n• June 1789: Formation of National Assembly and Tennis Court Oath.\n• July 14, 1789: Storming of the Bastille prison.\n• August 1789: Declaration of the Rights of Man and of the Citizen.\n• 1793-1794: Reign of Terror under Maximilien Robespierre.\n• 1804: Rise of Napoleon Bonaparte and introduction of Napoleonic Code.'
      },
      {
        heading: '3. Ideological Contributions of Philosophers',
        body: '• John Locke (Two Treatises of Government): Refuted the divine right of the monarch.\n• Jean-Jacques Rousseau (The Social Contract): Proposed government based on democratic agreement.\n• Montesquieu (The Spirit of the Laws): Advocated separation of powers among legislative, executive, and judiciary.'
      }
    ];
  }

  // Default Subject Academic Format
  return [
    {
      heading: '1. Chapter Objectives & Topic Outline',
      body: `Complete study guide and structured revision notes for "${title}". This document covers essential syllabus requirements, foundational definitions, analytical explanations, and core academic competencies required for Class ${note.grade} examinations.`
    },
    {
      heading: '2. Key Concepts & Structured Summary',
      body: `Detailed analysis of "${note.subject}" principles: Study key relationships, cause-and-effect processes, systematic classifications, and practical examples verified by ${note.schoolName || 'NotesVault Archive'}. Review definitions thoroughly to ensure accurate terminology in assessments.`
    },
    {
      heading: '3. Important Examination Insights',
      body: '• Maintain structured step-by-step presentation in answers.\n• Highlight keywords and standard scientific/mathematical symbols.\n• Always double check units, labeling, and supporting diagrammatic representations.\n• Review past years question patterns related to this topic.'
    }
  ];
}

// Generate formatted PDF for curated or fallback study notes
export function generateSubjectStudyPdf(note: Note): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const uniqueCode = note.schoolCode || `NV-${note.id.slice(0, 6).toUpperCase()}`;

  const renderHeader = () => {
    // Deep Navy Top Bar
    doc.setFillColor(11, 31, 59); // #0b1f3b
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Title & Brand
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text('NOTESVAULT', margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(147, 197, 253);
    doc.text('VERIFIED ACADEMIC STUDY NOTES & REVISION ARCHIVE', margin, 18);

    // Code Pill Badge
    doc.setFillColor(37, 99, 235); // #2563eb
    doc.roundedRect(pageWidth - margin - 34, 7, 34, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(uniqueCode, pageWidth - margin - 17, 15.5, { align: 'center' });
  };

  const renderFooter = (pageNum: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`NotesVault Archive  •  ${uniqueCode}  •  ${note.schoolName || 'Academic Repository'}`, margin, pageHeight - 7);
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  };

  renderHeader();

  // Document Metadata Card
  let y = 35;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 34, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(note.title, contentWidth - 10);
  doc.text(titleLines[0] || note.title, margin + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Subject: ${note.subject}   |   Class: Class ${note.grade}   |   Reference: ${uniqueCode}`, margin + 5, y + 16);
  doc.text(`Institution: ${note.schoolName || 'General School Archive'}`, margin + 5, y + 22);
  doc.text(`Author: ${note.author?.name || 'Verified Contributor'} (${note.author?.badge || 'Student Contributor'})`, margin + 5, y + 28);

  // Decorative Rule
  y = 75;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  // Render Educational Sections
  y = 83;
  let pageNum = 1;
  const sections = getEducationalSections(note);

  sections.forEach((sec) => {
    const lines = doc.splitTextToSize(sec.body, contentWidth);
    const requiredHeight = 7 + lines.length * 4.2 + 6;

    if (y + requiredHeight > pageHeight - 18) {
      renderFooter(pageNum);
      doc.addPage();
      pageNum++;
      renderHeader();
      y = 35;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 58, 138);
    doc.text(sec.heading, margin, y);
    y += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(lines, margin, y);
    y += lines.length * 4.2 + 5;
  });

  renderFooter(pageNum);

  return doc.output('blob');
}
