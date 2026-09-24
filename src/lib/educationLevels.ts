export type EducationLevel = 'school' | 'college' | 'coaching';

export interface EducationCategoryConfig {
  id: EducationLevel;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

export const EDUCATION_CATEGORIES: EducationCategoryConfig[] = [
  {
    id: 'school',
    label: 'School (Class 5 - 12)',
    shortLabel: 'School',
    icon: 'school',
    description: 'CBSE, ICSE & State Board classes 5th to 12th'
  },
  {
    id: 'college',
    label: 'College (Semester 1 - 8)',
    shortLabel: 'College / Sem 1-8',
    icon: 'account_balance',
    description: 'B.Tech, B.Sc, B.Com, BCA, B.A, MCA college semester notes'
  },
  {
    id: 'coaching',
    label: 'Coaching & Competitive Exams',
    shortLabel: 'Coaching / Exams',
    icon: 'psychology',
    description: 'JEE, NEET, UPSC, SSC, Banking, GATE, CAT & Entrance tests'
  }
];

export const SCHOOL_CLASSES = [5, 6, 7, 8, 9, 10, 11, 12];
export const COLLEGE_SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
export const COACHING_STREAMS = [
  'JEE (Main & Adv) / NEET',
  'UPSC / Civil Services',
  'SSC / Banking / Railways',
  'GATE / PSUs',
  'CAT / MBA Entrance',
  'Foundation & Olympiad',
  'State PSC / Defence / NDA',
  'General Competitive Prep'
];

export function getAcademicLevelLabel(item: {
  educationLevel?: string;
  grade?: number;
  semester?: number;
  coachingStream?: string;
  academicLevelLabel?: string;
}): string {
  if (item.academicLevelLabel && item.academicLevelLabel.trim()) {
    return item.academicLevelLabel.trim();
  }
  if (item.educationLevel === 'college' || item.semester) {
    if (item.semester) return `Semester ${item.semester}`;
    if (item.grade && item.grade >= 1 && item.grade <= 8) return `Semester ${item.grade}`;
    return 'College';
  }
  if (item.educationLevel === 'coaching' || item.coachingStream) {
    return item.coachingStream || 'Coaching / Exam';
  }
  if (item.grade && item.grade >= 1 && item.grade <= 12) {
    return `Class ${item.grade}`;
  }
  return 'Study Material';
}
