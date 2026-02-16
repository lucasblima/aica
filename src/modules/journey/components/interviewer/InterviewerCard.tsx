import { motion } from 'framer-motion'
import { ClipboardDocumentListIcon } from '@heroicons/react/24/solid'
import { cardElevationVariants } from '@/lib/animations/ceramic-motion'
import { useInterviewStats } from '../../hooks/useInterviewer'

interface InterviewerCardProps {
  compact?: boolean
  onClick?: () => void
}

export function InterviewerCard({ compact, onClick }: InterviewerCardProps) {
  const { stats } = useInterviewStats()

  if (!compact) return null // Only compact version for now

  const percentage = stats.completion_percentage || 0
  const answered = stats.total_answered || 0

  return (
    <motion.div
      className="ceramic-card relative overflow-hidden p-3 min-h-[100px] flex flex-col group"
      style={{ background: 'linear-gradient(135deg, #F0EFE9 0%, #FEF3C7 100%)' }}
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
      whileTap="pressed"
      onClick={onClick}
    >
      <ClipboardDocumentListIcon className="absolute -right-2 -bottom-2 w-20 h-20 text-amber-500 opacity-10" />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="ceramic-inset p-1.5">
              <ClipboardDocumentListIcon className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">Entrevista</span>
          </div>
          {percentage > 0 && (
            <div className="ceramic-inset px-2 py-0.5 rounded-full">
              <span className="text-[10px] font-bold text-amber-600">{percentage}%</span>
            </div>
          )}
        </div>
        <p className="text-xs text-ceramic-text-secondary line-clamp-1">
          {answered === 0 ? 'Conheça seu perfil' : `${answered} perguntas respondidas`}
        </p>
      </div>
    </motion.div>
  )
}
