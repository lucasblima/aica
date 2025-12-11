/**
 * ModuleProgressTracker Component
 * PHASE 3.3: Learning Feedback Loop for Recommendations
 *
 * Displays and manages module progress tracking.
 * Shows:
 * - Progress bar (0-100%)
 * - Completion status
 * - Time spent
 * - Lessons completed
 * - Star rating interface
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, CheckCircle, AlertCircle, BookOpen } from 'lucide-react';
import { feedbackLoopService } from '@/services/feedbackLoopService';

interface ModuleProgressTrackerProps {
  userId: string;
  moduleId: string;
  moduleName: string;
  estimatedMinutes?: number;
  totalLessons?: number;
  onProgressUpdate?: (progress: number) => void;
  onComplete?: (rating?: number) => void;
}

interface ProgressState {
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  rating?: number;
  completedAt?: string;
  timeSpent?: number;
}

export const ModuleProgressTracker: React.FC<ModuleProgressTrackerProps> = ({
  userId,
  moduleId,
  moduleName,
  estimatedMinutes = 30,
  totalLessons = 5,
  onProgressUpdate,
  onComplete,
}) => {
  const [progressState, setProgressState] = useState<ProgressState>({
    status: 'not_started',
    progress: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState(Date.now());

  // Fetch current progress
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const status = await feedbackLoopService.getModuleCompletionStatus(userId, moduleId);
        setProgressState({
          status: status.status as any,
          progress: status.progress,
          rating: status.rating,
          completedAt: status.completedAt,
        });
      } catch (error) {
        console.error('Failed to fetch progress:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [userId, moduleId]);

  // Handle progress update
  const handleProgressUpdate = (newProgress: number) => {
    const clamped = Math.max(0, Math.min(100, newProgress));
    setProgressState((prev) => ({
      ...prev,
      progress: clamped,
      status: clamped > 0 ? 'in_progress' : prev.status,
    }));
    onProgressUpdate?.(clamped);
  };

  // Handle mark as complete
  const handleMarkComplete = async (rating?: number) => {
    setIsSubmitting(true);
    try {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000 / 60); // minutes

      const result = await feedbackLoopService.handleModuleCompletion(userId, moduleId, {
        rating,
        timeSpent,
      });

      setProgressState((prev) => ({
        ...prev,
        status: 'completed',
        progress: 100,
        rating,
        completedAt: new Date().toISOString(),
      }));

      onComplete?.(rating);

      // Show completion notification
      alert(
        `🎉 Congratulations! You earned ${result.xpAwarded} CP points!\n${
          result.achievement_unlocked ? `Achievement Unlocked: ${result.achievement_unlocked}` : ''
        }`
      );
    } catch (error) {
      console.error('Failed to mark complete:', error);
      alert('Failed to save completion. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate completed lessons
  const completedLessons = Math.floor((progressState.progress / 100) * totalLessons);

  // Format time spent
  const formatTimeSpent = (minutes?: number) => {
    if (!minutes) return 'Not started';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading progress...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      {/* Header */}
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{moduleName}</CardTitle>
            <CardDescription>Track your progress through this module</CardDescription>
          </div>
          <Badge variant="outline">
            {progressState.status === 'completed' && 'Completed'}
            {progressState.status === 'in_progress' && 'In Progress'}
            {progressState.status === 'not_started' && 'Not Started'}
          </Badge>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
            <span className="text-sm font-bold text-blue-600">{progressState.progress}%</span>
          </div>
          <Progress value={progressState.progress} className="h-3" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Lessons Completed */}
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{completedLessons}</div>
            <div className="text-xs text-gray-600">
              of {totalLessons} lessons
            </div>
          </div>

          {/* Time Spent */}
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-sm font-bold text-gray-800">
              {Math.floor((Date.now() - startTime) / 1000 / 60)}
            </div>
            <div className="text-xs text-gray-600">
              / {estimatedMinutes} min
            </div>
          </div>

          {/* Completion Status */}
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle
                className={`w-4 h-4 ${
                  progressState.status === 'completed' ? 'text-green-600' : 'text-gray-400'
                }`}
              />
            </div>
            <div className="text-xs text-gray-600">
              {progressState.status === 'completed' ? 'Complete' : 'In Progress'}
            </div>
          </div>
        </div>

        {/* Progress Controls */}
        {progressState.status !== 'completed' && (
          <div className="space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm font-semibold text-blue-900">Update Your Progress</div>

            {/* Progress Slider */}
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="100"
                value={progressState.progress}
                onChange={(e) => handleProgressUpdate(parseInt(e.target.value))}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-blue-700">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Quick Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => handleProgressUpdate(25)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                25%
              </Button>
              <Button
                onClick={() => handleProgressUpdate(50)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                50%
              </Button>
              <Button
                onClick={() => handleProgressUpdate(75)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                75%
              </Button>
              <Button
                onClick={() => handleProgressUpdate(100)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Complete
              </Button>
            </div>
          </div>
        )}

        {/* Completion Section */}
        {progressState.progress >= 80 && progressState.status !== 'completed' && (
          <div className="space-y-4 bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-green-900">
                  Ready to complete this module?
                </div>
                <p className="text-xs text-green-800 mt-1">
                  You're almost there! Rate your experience and mark this module as complete.
                </p>
              </div>
            </div>

            {/* Star Rating for Completion */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 block">
                Rate this module (optional)
              </label>
              <div className="flex gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setProgressState((p) => ({ ...p, rating: star }))}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    disabled={isSubmitting}
                    className="transition-transform hover:scale-110 disabled:opacity-50"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        (hoverRating || progressState.rating) &&
                        star <= (hoverRating || progressState.rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {progressState.rating && (
                <span className="text-xs text-gray-600">{progressState.rating}/5 stars</span>
              )}
            </div>

            {/* Complete Button */}
            <Button
              onClick={() => handleMarkComplete(progressState.rating)}
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? 'Saving...' : 'Mark as Complete'}
            </Button>
          </div>
        )}

        {/* Completed State */}
        {progressState.status === 'completed' && (
          <div className="space-y-3 bg-green-50 p-4 rounded-lg border border-green-300">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-900">Module Completed!</span>
            </div>

            {progressState.rating && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= progressState.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-700">
                  You rated this {progressState.rating}/5
                </span>
              </div>
            )}

            {progressState.completedAt && (
              <div className="text-xs text-gray-600">
                Completed on {new Date(progressState.completedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            Your progress is automatically saved. You can continue from where you left off anytime.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModuleProgressTracker;
