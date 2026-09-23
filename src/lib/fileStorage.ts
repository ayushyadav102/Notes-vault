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

// Convert File to Base64 Data URL
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
