/**
 * Tests for PodcastWorkspaceContext reducer
 *
 * Tests the workspaceReducer function directly, covering:
 * - Initial state shape via createInitialState
 * - Navigation actions (SET_STAGE, MARK_STAGE_VISITED)
 * - Setup actions (UPDATE_SETUP, SET_GUEST_TYPE, SET_GUEST_NAME, SET_THEME, SET_SEARCH_RESULTS)
 * - Research actions (UPDATE_RESEARCH, SET_DOSSIER, ADD/REMOVE_CUSTOM_SOURCE, generation lifecycle)
 * - Suggestion card actions (SET_SUGGESTION_CARDS, UPDATE_CARD_STATUS/TEXT, INSERT_CARD_TO_DOSSIER)
 * - Pauta actions (SET_TOPICS, ADD/UPDATE/REMOVE/REORDER_TOPICS, categories)
 * - Production actions (START/PAUSE/RESUME/STOP_RECORDING, UPDATE_DURATION, SET_CURRENT_TOPIC)
 * - Global actions (HYDRATE, MARK_SAVED, MARK_DIRTY, SET_LOADING, SET_ERROR, RESET_WORKSPACE)
 * - Edge cases (unknown actions, nested object updates)
 */

import { describe, it, expect } from 'vitest';
import { createInitialState } from '../PodcastWorkspaceContext';
import type {
  PodcastWorkspaceState,
  WorkspaceAction,
  Dossier,
  WorkspaceCustomSource,
  Topic,
  TopicCategory,
  SuggestionCard,
} from '../../types';

// Since the reducer is not exported directly, we need to access it.
// The reducer is used internally via useReducer. To test it directly,
// we'll re-implement the import by testing through createInitialState
// and simulating dispatch manually.
//
// However, workspaceReducer is a private function. We need to test it
// through the module's exports or extract it. Since the task says
// "Test the reducer function directly (import and call with state + action)",
// we'll import the module and access the reducer.

// The reducer is not exported, so we'll create a helper that re-exports it
// for testing purposes. Instead, we'll test via the context provider with
// React Testing Library, OR we can test the reducer by extracting the logic.
//
// Since the reducer function is not exported, we test the createInitialState
// function and verify the state shape, then use a workaround to test the reducer.

// Workaround: We can import the entire module and test using require
// Since workspaceReducer is not exported, we need to test via the provider.
// BUT the task says "test the reducer function directly". Let's check if we
// can access it through a non-default export path.

// SOLUTION: We'll test createInitialState (exported) and create a lightweight
// test harness using React's useReducer through renderHook, which exercises
// the reducer logic directly.

// Actually, looking at the context file more carefully:
// - createInitialState IS exported
// - workspaceReducer is NOT exported
// - The PodcastWorkspaceProvider uses useReducer(workspaceReducer, initialState)
//
// To test the reducer directly, we'll use renderHook with the provider.
// But for pure reducer testing without React, we need to export it.
//
// PRAGMATIC APPROACH: Test via renderHook + the usePodcastWorkspace hook,
// dispatching actions and verifying state transitions. This tests the actual
// reducer behavior without needing to export it separately.

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { PodcastWorkspaceProvider, usePodcastWorkspace } from '../PodcastWorkspaceContext';

// ============================================
// HELPERS
// ============================================

const TEST_EPISODE_ID = 'ep-test-001';
const TEST_SHOW_ID = 'show-test-001';
const TEST_SHOW_TITLE = 'Test Show';

function createTestState(): PodcastWorkspaceState {
  return createInitialState(TEST_EPISODE_ID, TEST_SHOW_ID, TEST_SHOW_TITLE);
}

function renderWorkspaceHook(initialState?: PodcastWorkspaceState) {
  const state = initialState || createTestState();
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(PodcastWorkspaceProvider, { initialState: state, children });

  return renderHook(() => usePodcastWorkspace(), { wrapper });
}

function createTestDossier(overrides?: Partial<Dossier>): Dossier {
  return {
    guestName: 'Test Guest',
    episodeTheme: 'Technology',
    biography: 'A long biography that describes the guest in detail for testing purposes and is over 200 characters to meet the complete threshold for research completion calculations in the workspace context.',
    technicalSheet: { fullName: 'Test Guest Full Name' },
    controversies: ['Controversy 1'],
    suggestedTopics: ['Topic 1', 'Topic 2'],
    iceBreakers: ['Ice breaker 1'],
    ...overrides,
  };
}

function createTestTopic(overrides?: Partial<Topic>): Topic {
  return {
    id: `topic-${Date.now()}`,
    text: 'Test topic question',
    completed: false,
    order: 0,
    archived: false,
    ...overrides,
  };
}

function createTestCustomSource(overrides?: Partial<WorkspaceCustomSource>): WorkspaceCustomSource {
  return {
    id: `source-${Date.now()}`,
    type: 'url',
    content: 'https://example.com/article',
    label: 'Test Source',
    createdAt: new Date(),
    ...overrides,
  };
}

// ============================================
// TESTS
// ============================================

describe('PodcastWorkspaceContext', () => {
  describe('createInitialState', () => {
    it('should create initial state with correct shape and IDs', () => {
      const state = createInitialState('ep-1', 'show-1', 'My Show');

      expect(state.episodeId).toBe('ep-1');
      expect(state.showId).toBe('show-1');
      expect(state.showTitle).toBe('My Show');
      expect(state.currentStage).toBe('setup');
      expect(state.visitedStages).toEqual(['setup']);
      expect(state.isDirty).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastSaved).toBeNull();
    });

    it('should initialize setup state with empty fields', () => {
      const state = createTestState();

      expect(state.setup.guestType).toBeNull();
      expect(state.setup.guestName).toBe('');
      expect(state.setup.guestReference).toBe('');
      expect(state.setup.theme).toBe('');
      expect(state.setup.isSearching).toBe(false);
      expect(state.setup.searchResults).toBeNull();
    });

    it('should initialize research state with null dossier', () => {
      const state = createTestState();

      expect(state.research.dossier).toBeNull();
      expect(state.research.customSources).toEqual([]);
      expect(state.research.isGenerating).toBe(false);
      expect(state.research.lastGenerated).toBeNull();
      expect(state.research.error).toBeNull();
      expect(state.research.suggestionCards).toEqual([]);
      expect(state.research.chatOpen).toBe(false);
    });

    it('should initialize pauta state with empty topics', () => {
      const state = createTestState();

      expect(state.pauta.topics).toEqual([]);
      expect(state.pauta.categories).toEqual([]);
      expect(state.pauta.savedPautas).toEqual([]);
      expect(state.pauta.activePautaId).toBeNull();
      expect(state.pauta.isGenerating).toBe(false);
    });

    it('should initialize production state as not recording', () => {
      const state = createTestState();

      expect(state.production.isRecording).toBe(false);
      expect(state.production.isPaused).toBe(false);
      expect(state.production.duration).toBe(0);
      expect(state.production.startedAt).toBeNull();
      expect(state.production.finishedAt).toBeNull();
      expect(state.production.currentTopicId).toBeNull();
    });
  });

  describe('Navigation actions', () => {
    it('SET_STAGE should change the current stage and add to visited', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'SET_STAGE', payload: 'research' });
      });

      expect(result.current.state.currentStage).toBe('research');
      expect(result.current.state.visitedStages).toContain('research');
      expect(result.current.state.visitedStages).toContain('setup');
    });

    it('SET_STAGE should not duplicate visited stages', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'SET_STAGE', payload: 'research' });
      });
      act(() => {
        result.current.dispatch({ type: 'SET_STAGE', payload: 'research' });
      });

      const researchCount = result.current.state.visitedStages.filter(s => s === 'research').length;
      expect(researchCount).toBe(1);
    });

    it('MARK_STAGE_VISITED should add stage without changing current', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'MARK_STAGE_VISITED', payload: 'pauta' });
      });

      expect(result.current.state.currentStage).toBe('setup'); // unchanged
      expect(result.current.state.visitedStages).toContain('pauta');
    });
  });

  describe('Setup actions', () => {
    it('UPDATE_SETUP should merge partial updates and mark dirty', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({
          type: 'UPDATE_SETUP',
          payload: { guestName: 'John Doe', theme: 'Technology' },
        });
      });

      expect(result.current.state.setup.guestName).toBe('John Doe');
      expect(result.current.state.setup.theme).toBe('Technology');
      expect(result.current.state.setup.guestType).toBeNull(); // unchanged
      expect(result.current.state.isDirty).toBe(true);
    });

    it('SET_GUEST_TYPE should update guest type and mark dirty', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'SET_GUEST_TYPE', payload: 'public_figure' });
      });

      expect(result.current.state.setup.guestType).toBe('public_figure');
      expect(result.current.state.isDirty).toBe(true);
    });

    it('SET_GUEST_NAME should update guest name and mark dirty', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'SET_GUEST_NAME', payload: 'Jane Smith' });
      });

      expect(result.current.state.setup.guestName).toBe('Jane Smith');
      expect(result.current.state.isDirty).toBe(true);
    });

    it('SET_THEME should update theme and mark dirty', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'SET_THEME', payload: 'AI and Future' });
      });

      expect(result.current.state.setup.theme).toBe('AI and Future');
      expect(result.current.state.isDirty).toBe(true);
    });

    it('SET_SEARCH_RESULTS should update results and clear isSearching', () => {
      const { result } = renderWorkspaceHook();

      // First set isSearching to true
      act(() => {
        result.current.dispatch({
          type: 'UPDATE_SETUP',
          payload: { isSearching: true },
        });
      });

      const mockResults = { name: 'Found Guest', bio: 'Bio text' };
      act(() => {
        result.current.dispatch({ type: 'SET_SEARCH_RESULTS', payload: mockResults });
      });

      expect(result.current.state.setup.searchResults).toEqual(mockResults);
      expect(result.current.state.setup.isSearching).toBe(false);
    });
  });

  describe('Research actions', () => {
    it('UPDATE_RESEARCH should merge research state and mark dirty', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({
          type: 'UPDATE_RESEARCH',
          payload: { isGenerating: true, error: null },
        });
      });

      expect(result.current.state.research.isGenerating).toBe(true);
      expect(result.current.state.isDirty).toBe(true);
    });

    it('SET_DOSSIER should set dossier, clear isGenerating, and set lastGenerated', () => {
      const { result } = renderWorkspaceHook();
      const dossier = createTestDossier();

      act(() => {
        result.current.dispatch({ type: 'SET_DOSSIER', payload: dossier });
      });

      expect(result.current.state.research.dossier).toEqual(dossier);
      expect(result.current.state.research.isGenerating).toBe(false);
      expect(result.current.state.research.lastGenerated).toBeInstanceOf(Date);
      expect(result.current.state.isDirty).toBe(true);
    });

    it('ADD_CUSTOM_SOURCE should append source and mark dirty', () => {
      const { result } = renderWorkspaceHook();
      const source = createTestCustomSource({ id: 'src-1' });

      act(() => {
        result.current.dispatch({ type: 'ADD_CUSTOM_SOURCE', payload: source });
      });

      expect(result.current.state.research.customSources).toHaveLength(1);
      expect(result.current.state.research.customSources[0].id).toBe('src-1');
      expect(result.current.state.isDirty).toBe(true);
    });

    it('REMOVE_CUSTOM_SOURCE should filter out source by id and mark dirty', () => {
      const { result } = renderWorkspaceHook();
      const source1 = createTestCustomSource({ id: 'src-1' });
      const source2 = createTestCustomSource({ id: 'src-2' });

      act(() => {
        result.current.dispatch({ type: 'ADD_CUSTOM_SOURCE', payload: source1 });
      });
      act(() => {
        result.current.dispatch({ type: 'ADD_CUSTOM_SOURCE', payload: source2 });
      });
      act(() => {
        result.current.dispatch({ type: 'REMOVE_CUSTOM_SOURCE', payload: 'src-1' });
      });

      expect(result.current.state.research.customSources).toHaveLength(1);
      expect(result.current.state.research.customSources[0].id).toBe('src-2');
    });

    it('START_DOSSIER_GENERATION should set isGenerating and clear error', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'START_DOSSIER_GENERATION' });
      });

      expect(result.current.state.research.isGenerating).toBe(true);
      expect(result.current.state.research.error).toBeNull();
    });

    it('FINISH_DOSSIER_GENERATION should set dossier, clear isGenerating, and set lastGenerated', () => {
      const { result } = renderWorkspaceHook();
      const dossier = createTestDossier();

      act(() => {
        result.current.dispatch({ type: 'START_DOSSIER_GENERATION' });
      });
      act(() => {
        result.current.dispatch({ type: 'FINISH_DOSSIER_GENERATION', payload: dossier });
      });

      expect(result.current.state.research.dossier).toEqual(dossier);
      expect(result.current.state.research.isGenerating).toBe(false);
      expect(result.current.state.research.lastGenerated).toBeInstanceOf(Date);
      expect(result.current.state.isDirty).toBe(true);
    });

    it('SET_RESEARCH_ERROR should set error and clear isGenerating', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'START_DOSSIER_GENERATION' });
      });
      act(() => {
        result.current.dispatch({ type: 'SET_RESEARCH_ERROR', payload: 'API failed' });
      });

      expect(result.current.state.research.error).toBe('API failed');
      expect(result.current.state.research.isGenerating).toBe(false);
    });
  });

  describe('Suggestion card actions', () => {
    const testCard: SuggestionCard = {
      id: 'card-1',
      type: 'carreira',
      title: 'Career highlight',
      previewText: 'Short preview',
      fullText: 'Full detailed text about career',
      targetSection: 'bio',
      relevanceScore: 85,
      status: 'pending',
    };

    it('SET_SUGGESTION_CARDS should set cards and clear isAnalyzingGaps', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'SET_ANALYZING_GAPS', payload: true });
      });
      act(() => {
        result.current.dispatch({ type: 'SET_SUGGESTION_CARDS', payload: [testCard] });
      });

      expect(result.current.state.research.suggestionCards).toHaveLength(1);
      expect(result.current.state.research.isAnalyzingGaps).toBe(false);
    });

    it('UPDATE_CARD_STATUS should update a specific card status', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'SET_SUGGESTION_CARDS', payload: [testCard] });
      });
      act(() => {
        result.current.dispatch({
          type: 'UPDATE_CARD_STATUS',
          payload: { cardId: 'card-1', status: 'expanded' },
        });
      });

      expect(result.current.state.research.suggestionCards[0].status).toBe('expanded');
    });

    it('UPDATE_CARD_TEXT should update a specific card fullText', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'SET_SUGGESTION_CARDS', payload: [testCard] });
      });
      act(() => {
        result.current.dispatch({
          type: 'UPDATE_CARD_TEXT',
          payload: { cardId: 'card-1', fullText: 'Updated career text' },
        });
      });

      expect(result.current.state.research.suggestionCards[0].fullText).toBe('Updated career text');
    });

    it('INSERT_CARD_TO_DOSSIER with bio section should append to biography', () => {
      const { result } = renderWorkspaceHook();
      const dossier = createTestDossier({ biography: 'Existing bio' });

      act(() => {
        result.current.dispatch({ type: 'SET_DOSSIER', payload: dossier });
      });
      act(() => {
        result.current.dispatch({ type: 'SET_SUGGESTION_CARDS', payload: [testCard] });
      });
      act(() => {
        result.current.dispatch({
          type: 'INSERT_CARD_TO_DOSSIER',
          payload: { cardId: 'card-1', targetSection: 'bio', text: 'New bio section' },
        });
      });

      expect(result.current.state.research.dossier!.biography).toContain('Existing bio');
      expect(result.current.state.research.dossier!.biography).toContain('New bio section');
      expect(result.current.state.research.suggestionCards[0].status).toBe('inserted');
      expect(result.current.state.isDirty).toBe(true);
    });

    it('INSERT_CARD_TO_DOSSIER with noticias section should append to controversies', () => {
      const { result } = renderWorkspaceHook();
      const dossier = createTestDossier({ controversies: ['Existing controversy'] });

      act(() => {
        result.current.dispatch({ type: 'SET_DOSSIER', payload: dossier });
      });
      act(() => {
        result.current.dispatch({ type: 'SET_SUGGESTION_CARDS', payload: [testCard] });
      });
      act(() => {
        result.current.dispatch({
          type: 'INSERT_CARD_TO_DOSSIER',
          payload: { cardId: 'card-1', targetSection: 'noticias', text: 'News item' },
        });
      });

      expect(result.current.state.research.dossier!.controversies).toContain('Existing controversy');
      expect(result.current.state.research.dossier!.controversies).toContain('News item');
    });

    it('INSERT_CARD_TO_DOSSIER should return unchanged state if no dossier exists', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'SET_SUGGESTION_CARDS', payload: [testCard] });
      });

      const stateBefore = result.current.state;
      act(() => {
        result.current.dispatch({
          type: 'INSERT_CARD_TO_DOSSIER',
          payload: { cardId: 'card-1', targetSection: 'bio', text: 'Text' },
        });
      });

      // Dossier is still null, so insert should be a no-op
      expect(result.current.state.research.dossier).toBeNull();
    });

    it('SET_FILE_SEARCH_STORE should update fileSearchStoreId', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'SET_FILE_SEARCH_STORE', payload: 'store-123' });
      });

      expect(result.current.state.research.fileSearchStoreId).toBe('store-123');
    });

    it('TOGGLE_CHAT should toggle chatOpen', () => {
      const { result } = renderWorkspaceHook();

      expect(result.current.state.research.chatOpen).toBe(false);

      act(() => {
        result.current.dispatch({ type: 'TOGGLE_CHAT' } as WorkspaceAction);
      });
      expect(result.current.state.research.chatOpen).toBe(true);

      act(() => {
        result.current.dispatch({ type: 'TOGGLE_CHAT', payload: false });
      });
      expect(result.current.state.research.chatOpen).toBe(false);
    });
  });

  describe('Pauta actions', () => {
    it('SET_TOPICS should replace all topics and mark dirty', () => {
      const { result } = renderWorkspaceHook();
      const topics = [createTestTopic({ id: 't1' }), createTestTopic({ id: 't2' })];

      act(() => {
        result.current.dispatch({ type: 'SET_TOPICS', payload: topics });
      });

      expect(result.current.state.pauta.topics).toHaveLength(2);
      expect(result.current.state.isDirty).toBe(true);
    });

    it('ADD_TOPIC should append a new topic', () => {
      const { result } = renderWorkspaceHook();
      const topic = createTestTopic({ id: 't1', text: 'First question' });

      act(() => {
        result.current.dispatch({ type: 'ADD_TOPIC', payload: topic });
      });

      expect(result.current.state.pauta.topics).toHaveLength(1);
      expect(result.current.state.pauta.topics[0].text).toBe('First question');
      expect(result.current.state.isDirty).toBe(true);
    });

    it('UPDATE_TOPIC should update specific topic by ID', () => {
      const { result } = renderWorkspaceHook();
      const topic = createTestTopic({ id: 't1', text: 'Original', completed: false });

      act(() => {
        result.current.dispatch({ type: 'ADD_TOPIC', payload: topic });
      });
      act(() => {
        result.current.dispatch({
          type: 'UPDATE_TOPIC',
          payload: { id: 't1', updates: { text: 'Updated', completed: true } },
        });
      });

      expect(result.current.state.pauta.topics[0].text).toBe('Updated');
      expect(result.current.state.pauta.topics[0].completed).toBe(true);
    });

    it('REMOVE_TOPIC should remove topic by ID', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'ADD_TOPIC', payload: createTestTopic({ id: 't1' }) });
      });
      act(() => {
        result.current.dispatch({ type: 'ADD_TOPIC', payload: createTestTopic({ id: 't2' }) });
      });
      act(() => {
        result.current.dispatch({ type: 'REMOVE_TOPIC', payload: 't1' });
      });

      expect(result.current.state.pauta.topics).toHaveLength(1);
      expect(result.current.state.pauta.topics[0].id).toBe('t2');
    });

    it('REORDER_TOPICS should replace topics array with new order', () => {
      const { result } = renderWorkspaceHook();
      const t1 = createTestTopic({ id: 't1', order: 0 });
      const t2 = createTestTopic({ id: 't2', order: 1 });

      act(() => {
        result.current.dispatch({ type: 'SET_TOPICS', payload: [t1, t2] });
      });
      act(() => {
        result.current.dispatch({
          type: 'REORDER_TOPICS',
          payload: [{ ...t2, order: 0 }, { ...t1, order: 1 }],
        });
      });

      expect(result.current.state.pauta.topics[0].id).toBe('t2');
      expect(result.current.state.pauta.topics[1].id).toBe('t1');
    });

    it('SET_CATEGORIES should set categories and mark dirty', () => {
      const { result } = renderWorkspaceHook();
      const categories: TopicCategory[] = [
        { id: 'cat-1', name: 'Intro', color: '#ff0000', episode_id: TEST_EPISODE_ID },
      ];

      act(() => {
        result.current.dispatch({ type: 'SET_CATEGORIES', payload: categories });
      });

      expect(result.current.state.pauta.categories).toHaveLength(1);
      expect(result.current.state.pauta.categories[0].name).toBe('Intro');
      expect(result.current.state.isDirty).toBe(true);
    });

    it('ADD_CATEGORY should append a category', () => {
      const { result } = renderWorkspaceHook();
      const cat: TopicCategory = { id: 'cat-1', name: 'Deep Dive', color: '#00ff00', episode_id: TEST_EPISODE_ID };

      act(() => {
        result.current.dispatch({ type: 'ADD_CATEGORY', payload: cat });
      });

      expect(result.current.state.pauta.categories).toHaveLength(1);
      expect(result.current.state.isDirty).toBe(true);
    });

    it('SET_SAVED_PAUTAS should set saved pautas without marking dirty', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'SET_SAVED_PAUTAS', payload: [{ id: 'p1' } as any] });
      });

      expect(result.current.state.pauta.savedPautas).toHaveLength(1);
      // SET_SAVED_PAUTAS does NOT mark dirty (it's loading from DB)
      expect(result.current.state.isDirty).toBe(false);
    });

    it('SET_ACTIVE_PAUTA should set activePautaId without marking dirty', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'SET_ACTIVE_PAUTA', payload: 'pauta-1' });
      });

      expect(result.current.state.pauta.activePautaId).toBe('pauta-1');
      expect(result.current.state.isDirty).toBe(false);
    });
  });

  describe('Production actions', () => {
    it('START_RECORDING should set isRecording, clear isPaused, and set startedAt', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'START_RECORDING' });
      });

      expect(result.current.state.production.isRecording).toBe(true);
      expect(result.current.state.production.isPaused).toBe(false);
      expect(result.current.state.production.startedAt).toBeInstanceOf(Date);
      expect(result.current.state.isDirty).toBe(true);
    });

    it('PAUSE_RECORDING should set isPaused to true', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'START_RECORDING' });
      });
      act(() => {
        result.current.dispatch({ type: 'PAUSE_RECORDING' });
      });

      expect(result.current.state.production.isPaused).toBe(true);
      expect(result.current.state.production.isRecording).toBe(true);
    });

    it('RESUME_RECORDING should set isPaused to false', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'START_RECORDING' });
      });
      act(() => {
        result.current.dispatch({ type: 'PAUSE_RECORDING' });
      });
      act(() => {
        result.current.dispatch({ type: 'RESUME_RECORDING' });
      });

      expect(result.current.state.production.isPaused).toBe(false);
    });

    it('STOP_RECORDING should clear isRecording/isPaused and set finishedAt', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'START_RECORDING' });
      });
      act(() => {
        result.current.dispatch({ type: 'STOP_RECORDING' });
      });

      expect(result.current.state.production.isRecording).toBe(false);
      expect(result.current.state.production.isPaused).toBe(false);
      expect(result.current.state.production.finishedAt).toBeInstanceOf(Date);
      expect(result.current.state.isDirty).toBe(true);
    });

    it('UPDATE_DURATION should update duration', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'UPDATE_DURATION', payload: 120 });
      });

      expect(result.current.state.production.duration).toBe(120);
    });

    it('SET_CURRENT_TOPIC should update currentTopicId', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'SET_CURRENT_TOPIC', payload: 'topic-42' });
      });

      expect(result.current.state.production.currentTopicId).toBe('topic-42');
    });
  });

  describe('Global actions', () => {
    it('HYDRATE should merge state and set isDirty to false', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({
          type: 'HYDRATE',
          payload: {
            currentStage: 'research',
            visitedStages: ['setup', 'research'],
          },
        });
      });

      expect(result.current.state.currentStage).toBe('research');
      expect(result.current.state.visitedStages).toEqual(['setup', 'research']);
      expect(result.current.state.isDirty).toBe(false);
    });

    it('MARK_SAVED should set lastSaved and clear isDirty', () => {
      const { result } = renderWorkspaceHook();

      // Make dirty first
      act(() => {
        result.current.dispatch({ type: 'MARK_DIRTY' });
      });
      expect(result.current.state.isDirty).toBe(true);

      act(() => {
        result.current.dispatch({ type: 'MARK_SAVED' });
      });

      expect(result.current.state.lastSaved).toBeInstanceOf(Date);
      expect(result.current.state.isDirty).toBe(false);
    });

    it('MARK_DIRTY should set isDirty to true', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'MARK_DIRTY' });
      });

      expect(result.current.state.isDirty).toBe(true);
    });

    it('SET_LOADING should update isLoading flag', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'SET_LOADING', payload: true });
      });
      expect(result.current.state.isLoading).toBe(true);

      act(() => {
        result.current.dispatch({ type: 'SET_LOADING', payload: false });
      });
      expect(result.current.state.isLoading).toBe(false);
    });

    it('SET_ERROR should set error and clear isLoading', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'SET_LOADING', payload: true });
      });
      act(() => {
        result.current.dispatch({ type: 'SET_ERROR', payload: 'Something went wrong' });
      });

      expect(result.current.state.error).toBe('Something went wrong');
      expect(result.current.state.isLoading).toBe(false);
    });

    it('SET_ERROR with null should clear the error', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'SET_ERROR', payload: 'Error!' });
      });
      act(() => {
        result.current.dispatch({ type: 'SET_ERROR', payload: null });
      });

      expect(result.current.state.error).toBeNull();
    });

    it('RESET_WORKSPACE should return to initial state with same IDs', () => {
      const { result } = renderWorkspaceHook();

      // Modify state significantly
      act(() => {
        result.current.dispatch({ type: 'SET_STAGE', payload: 'production' });
      });
      act(() => {
        result.current.dispatch({ type: 'SET_GUEST_NAME', payload: 'Modified Name' });
      });
      act(() => {
        result.current.dispatch({ type: 'START_RECORDING' });
      });

      // Reset
      act(() => {
        result.current.dispatch({ type: 'RESET_WORKSPACE' });
      });

      expect(result.current.state.currentStage).toBe('setup');
      expect(result.current.state.setup.guestName).toBe('');
      expect(result.current.state.production.isRecording).toBe(false);
      expect(result.current.state.episodeId).toBe(TEST_EPISODE_ID);
      expect(result.current.state.showId).toBe(TEST_SHOW_ID);
      expect(result.current.state.showTitle).toBe(TEST_SHOW_TITLE);
      expect(result.current.state.isDirty).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('Unknown action type should return state unchanged', () => {
      const { result } = renderWorkspaceHook();
      const stateBefore = result.current.state;

      act(() => {
        // @ts-expect-error Testing unknown action type
        result.current.dispatch({ type: 'UNKNOWN_ACTION', payload: 'test' });
      });

      // State reference should be the same (reducer returns state as-is for default)
      expect(result.current.state.currentStage).toBe(stateBefore.currentStage);
      expect(result.current.state.isDirty).toBe(stateBefore.isDirty);
    });

    it('UPDATE_PRODUCTION should merge partial production state and mark dirty', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({
          type: 'UPDATE_PRODUCTION',
          payload: { duration: 300, recordingFilePath: '/path/to/file.mp3' },
        });
      });

      expect(result.current.state.production.duration).toBe(300);
      expect(result.current.state.production.recordingFilePath).toBe('/path/to/file.mp3');
      expect(result.current.state.production.isRecording).toBe(false); // unchanged
      expect(result.current.state.isDirty).toBe(true);
    });

    it('UPDATE_PAUTA should merge partial pauta state', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({
          type: 'UPDATE_PAUTA',
          payload: { isGenerating: true },
        });
      });

      expect(result.current.state.pauta.isGenerating).toBe(true);
      expect(result.current.state.pauta.topics).toEqual([]); // unchanged
      expect(result.current.state.isDirty).toBe(true);
    });

    it('SET_ANALYZING_GAPS should update isAnalyzingGaps', () => {
      const { result } = renderWorkspaceHook();

      act(() => {
        result.current.dispatch({ type: 'SET_ANALYZING_GAPS', payload: true });
      });
      expect(result.current.state.research.isAnalyzingGaps).toBe(true);

      act(() => {
        result.current.dispatch({ type: 'SET_ANALYZING_GAPS', payload: false });
      });
      expect(result.current.state.research.isAnalyzingGaps).toBe(false);
    });
  });

  describe('usePodcastWorkspace hook', () => {
    it('should throw error when used outside provider', () => {
      // renderHook without a wrapper should throw
      expect(() => {
        const { result } = renderHook(() => usePodcastWorkspace());
        // Access result to trigger the error
        result.current;
      }).toThrow('usePodcastWorkspace must be used within a PodcastWorkspaceProvider');
    });
  });
});
