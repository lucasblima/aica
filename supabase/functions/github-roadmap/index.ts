import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface GitHubMilestone {
  id: number;
  title: string;
  description: string | null;
  state: 'open' | 'closed';
  open_issues: number;
  closed_issues: number;
  due_on: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

interface RoadmapItem {
  id: number;
  title: string;
  description: string;
  progress: number;
  status: 'planned' | 'in_progress' | 'completed';
  due_date: string | null;
  url: string;
  open_issues: number;
  closed_issues: number;
  total_issues: number;
}

// ============================================================================
// CACHE
// ============================================================================

let cachedData: { items: RoadmapItem[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// GITHUB API
// ============================================================================

const REPO = 'lucasblima/Aica_frontend';

async function fetchMilestones(): Promise<RoadmapItem[]> {
  const now = Date.now();

  if (cachedData && now - cachedData.timestamp < CACHE_TTL_MS) {
    return cachedData.items;
  }

  const githubToken = Deno.env.get('GITHUB_TOKEN');
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'AICA-StatusPage',
  };

  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
  }

  const url = `https://api.github.com/repos/${REPO}/milestones?state=all&sort=due_on&direction=asc&per_page=20`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[github-roadmap] GitHub API error ${response.status}: ${errorText}`);
    throw new Error(`GitHub API returned ${response.status}`);
  }

  const milestones: GitHubMilestone[] = await response.json();

  const items: RoadmapItem[] = milestones.map((m) => {
    const total = m.open_issues + m.closed_issues;
    const progress = total > 0 ? Math.round((m.closed_issues / total) * 100) : 0;

    let status: RoadmapItem['status'];
    if (m.state === 'closed') {
      status = 'completed';
    } else if (m.closed_issues > 0) {
      status = 'in_progress';
    } else {
      status = 'planned';
    }

    return {
      id: m.id,
      title: m.title,
      description: m.description || '',
      progress,
      status,
      due_date: m.due_on,
      url: m.html_url,
      open_issues: m.open_issues,
      closed_issues: m.closed_issues,
      total_issues: total,
    };
  });

  cachedData = { items, timestamp: now };
  return items;
}

// ============================================================================
// HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const items = await fetchMilestones();

    return new Response(
      JSON.stringify({ success: true, data: items }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const err = error as Error;
    console.error('[github-roadmap] Error:', err.message);

    // Return cached data if available even if refresh failed
    if (cachedData) {
      return new Response(
        JSON.stringify({ success: true, data: cachedData.items, cached: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to fetch roadmap' }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
