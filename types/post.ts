// types/post.ts
import { GeoPoint, Timestamp } from 'firebase/firestore';

export type Category = 'janazah' | 'events' | 'jobs' | 'pub' | 'poll';

export type BasePost = {
  id?: string;

  // Existing fields
  ownerId: string;
  groupId: string;
  category: Category;
  title: string;
  description: string;
  images?: string[];
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  publishedAt?: Timestamp;
  location?: GeoPoint;
  tags?: string[];

  // 👇 ADD THESE — required for posts.ts activity logging
  authorId?: string | null;
  authorName?: string | null;
  authorCity?: string | null;
  authorState?: string | null;
};


export type JanazahDetails = {
  deceasedName?: string;
  funeralDate?: string; // ISO date
  funeralTime?: string; // HH:mm
  mosqueName?: string;
  address?: string;
  burialLocation?: string;
  contactPhone?: string;
};

export type EventDetails = {
  eventDate?: string;
  eventTime?: string;
  venue?: string;
  address?: string;
  ticketPrice?: number;
};

export type JobDetails = {
  company?: string;
  ratePerHour?: number;
  employmentType?: 'full-time' | 'part-time' | 'contract';
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
};

export type PubDetails = {
  placeName?: string;
  address?: string;
  phone?: string;
  openingHours?: string;
  website?: string;
};

export type PollOption = {
  id: string;
  text: string;
};

export type PollDetails = {
  // We’ll keep votes in a subcollection, so options just need id + text
  options: PollOption[];
};

export type Post =
    | (BasePost & { category: 'janazah'; details: JanazahDetails })
    | (BasePost & { category: 'events'; details: EventDetails })
    | (BasePost & { category: 'jobs'; details: JobDetails })
    | (BasePost & { category: 'pub'; details: PubDetails })
    | (BasePost & { category: 'poll'; details: PollDetails });
