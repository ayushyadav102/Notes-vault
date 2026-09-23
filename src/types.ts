export interface Note {
  id: string;
  title: string;
  subject: string;
  department: string;
  grade: number;
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
  ownerId: string;
  createdAt?: any;
}
