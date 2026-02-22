/**
 * Shared types for scene components
 */

/** Minimal child info for rendering characters in scenes */
export interface SceneChild {
  child_id: string;
  avatar_emoji?: string | null;
  avatar_color?: string | null;
}

export interface SceneChildProps {
  children?: SceneChild[];
  isAnimating?: boolean;
}
