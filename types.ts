import type { CSSProperties, ReactNode } from 'react';

export interface User {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface BookletStats {
  views: number;
  uniqueReaders: number;
  avgTimeSeconds: number;
  shares: number;
}

export interface Booklet {
  id: string;
  title: string;
  description: string;
  url: string; // The PDF URL
  coverUrl?: string; // Optional generated cover image
  createdAt: number;
  ownerId?: string; // ID of the user who uploaded it
  ownerName?: string; // Display Name of the user who uploaded it
  stats?: BookletStats;
  status?: 'published' | 'draft' | 'scheduled';
  scheduledAt?: number | null;
}

export interface AppSettings {
  logoUrl?: string;
  companyName?: string;
}

export interface UploadState {
  progress: number;
  isUploading: boolean;
  error: string | null;
  complete: boolean;
}

// React-PageFlip types are often loose, defining props here
export interface FlipBookProps {
  width: number;
  height: number;
  size: 'fixed' | 'stretch';
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  showCover: boolean;
  mobileScrollSupport: boolean;
  onFlip?: (e: any) => void;
  className?: string;
  style?: CSSProperties;
  ref?: any;
  children: ReactNode;
}