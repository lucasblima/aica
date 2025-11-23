
export interface User {
  id: string; 
  name: string;
  role: string;
  phone: string; 
  credits_balance: number;
  user_status: 'visitor' | 'registered' | 'connected';
  photo_url?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'finance' | 'health' | 'work' | 'education' | 'home';
  colorBg: string; // Tailwind gradient/color class
  colorText: string; // Tailwind text color
  iconName: string;
  description: string;
}

export interface WorkItem {
  id: string;
  title: string;
  description: string | null;
  categoryId: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  isCompleted: boolean;
  
  // Timeline specific
  startTime: string; // "HH:MM" format (24h)
  endTime: string;   // "HH:MM" format
  durationLabel: string; // "1h", "30min"
}

export interface Connection {
  id: string;
  name: string;
  role: string;
  initials: string;
  status: 'online' | 'offline' | 'busy';
  photoBg: string;
}

export type ViewState = 'life-dashboard' | 'timeline-agenda';
