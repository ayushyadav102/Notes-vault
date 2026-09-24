export type EducationLevel = 'school' | 'college' | 'coaching';

export interface StudentUser {
  id: string;
  studentId: string;
  name: string;
  educationLevel?: EducationLevel;
  grade?: number;
  semester?: number;
  coachingStream?: string;
  academicLevelLabel?: string;
  schoolName?: string;
  role?: string;
  createdAt?: any;
}

export interface Note {
  id: string;
  title: string;
  subject: string;
  department: string;
  educationLevel?: EducationLevel;
  grade: number;
  semester?: number;
  coachingStream?: string;
  academicLevelLabel?: string;
  schoolName?: string;
  schoolCode?: string;
  tags?: string[];
  pages: number;
  sizeMB: number;
  rating: number;
  reviews: number;
  author: {
    name: string;
    initials: string;
    badge: string;
    badgeStyle?: string;
  };
  thumbnailUrl: string;
  isPdf: boolean;
  fileName?: string;
  fileType?: string;
  fileData?: string;
  hasChunks?: boolean;
  totalChunks?: number;
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
}
