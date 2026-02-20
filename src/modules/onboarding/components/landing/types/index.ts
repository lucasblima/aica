export interface DemoMessage {
  id: string;
  text: string;
  timestamp: Date;
  sender: 'user' | 'contact';
  senderName: string;
  chaos_level: number; // 0-100
  category?: 'atlas' | 'journey' | 'studio' | 'connections';
}

export interface ProcessedModules {
  atlas: AtlasTask[];
  journey: JourneyMoment[];
  studio: StudioEpisode[];
  connections: Connection[];
}

export interface AtlasTask {
  id: string;
  title: string;
  scheduled_time: string | null;
  priority: 'urgent_important' | 'not_urgent_important' | 'urgent_not_important' | 'not_urgent_not_important';
  source: string;
  auto_created: boolean;
}

export interface JourneyMoment {
  id: string;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  tags: string[];
  consciousness_points: number;
}

export interface StudioEpisode {
  id: string;
  title: string;
  status: 'idea' | 'preparation' | 'recording' | 'published';
  potential_guests: string[];
  topics: string[];
}

export interface Connection {
  name: string;
  last_interaction: Date;
  relationship_health: 'strong' | 'moderate' | 'declining';
}

export type ProcessingStage = 'analyzing' | 'embedding' | 'classifying' | 'organizing';
