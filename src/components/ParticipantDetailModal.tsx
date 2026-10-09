import React from 'react';
import {
  Trophy,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Code2,
  Image as ImageIcon,
  Sparkles,
  MapPin,
  X,
  Crown
} from 'lucide-react';
import { Participant, Submission } from '../types';

interface ParticipantDetailModalProps {
  participant: Participant | null;
  submissions: Submission[];
  onClose: () => void;
}

export const ParticipantDetailModal: React.FC<ParticipantDetailModalProps> = ({
  participant,
  submissions,
  onClose
}) => {
  if (!participant) return null;

  const participantSubmissions = submissions.filter(
    (s) => s.participantId === participant.id || s.registrationId === participant.registrationId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#F4F4F0] border-4 border-black rounded-2xl p-5 sm:p-6 shadow-[10px_10px_0_#000] space-y-5 my-6 max-h-[90vh] overflow-y-auto">

        {/* Header - Loot Drop Style */}
        <div className="bg-white border-3 border-black p-4 rounded-xl shadow-[4px_4px_0_#000] flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <img
              src={participant.avatar}
              alt={participant.name}
              className="w-16 h-16 rounded-xl border-3 border-black object-cover shadow-[3px_3px_0_#000] bg-neutral-100"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading font-black text-black text-lg sm:text-xl uppercase">
                  {participant.name}
                </h3>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-[#FFD600] text-black border-2 border-black font-black shadow-[2px_2px_0_#000]">
                  RANK #{participant.rank}
                </span>
              </div>
              <p className="text-xs font-mono font-bold text-black/70 mt-0.5">{participant.college}</p>
              <div className="text-[11px] font-mono font-bold text-black/50 mt-0.5">
                REG ID: {participant.registrationId} · {participant.email}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="bg-white border-2 border-black text-black hover:bg-[#FF4081] hover:text-white p-1.5 rounded-lg shadow-[2px_2px_0_#000] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Summary Grid (Loot Drop Chunky Pill Blocks) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center font-mono text-xs">
          <div className="bg-white p-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0_#000]">
            <div className="text-[10px] text-black/60 font-black uppercase">R1 PICTURE</div>
            <div className="text-lg font-black text-black mt-0.5">{participant.round1Score}</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0_#000]">
            <div className="text-[10px] text-black/60 font-black uppercase">R2 SCENARIO</div>
            <div className="text-lg font-black text-black mt-0.5">{participant.round2Score}</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0_#000]">
            <div className="text-[10px] text-black/60 font-black uppercase">R3 PRODUCT</div>
            <div className="text-lg font-black text-black mt-0.5">{participant.round3Score}</div>
          </div>
          <div className="bg-[#00C853] p-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0_#000] text-black">
            <div className="text-[10px] font-black uppercase">ML BONUS</div>
            <div className="text-lg font-black mt-0.5">+{participant.authenticityBonusTotal}</div>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-[#FFD600] p-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0_#000]">
            <div className="text-[10px] text-black font-black uppercase">TOTAL</div>
            <div className="text-xl font-black text-black mt-0.5">{participant.totalScore}</div>
          </div>
        </div>

        {/* Submissions List */}
        <div className="space-y-3.5">
          <h4 className="text-xs font-heading font-black text-black uppercase tracking-wider">
            TOURNAMENT SUBMISSIONS & PROMPTS:
          </h4>

          {participantSubmissions.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono font-bold text-black/60 bg-white rounded-xl border-3 border-black shadow-[3px_3px_0_#000]">
              NO SUBMISSIONS RECORDED YET FOR THIS CONTESTANT.
            </div>
          ) : (
            participantSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border-3 border-black space-y-3 shadow-[4px_4px_0_#000]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-black text-white text-xs font-mono font-black uppercase">
                      ROUND 0{sub.roundId}
                    </span>
                    <span className="text-xs text-black font-mono font-bold line-clamp-1">
                      {sub.assignedThemeOrChit}
                    </span>
                  </div>

                  <span className={`text-xs font-mono px-2 py-0.5 rounded-md font-black border border-black ${sub.authenticity.isAiGenerated
                    ? 'bg-[#FF4081] text-white'
                    : 'bg-[#00C853] text-black'
                    }`}>
                    {sub.authenticity.authenticityScore}% HUMAN
                  </span>
                </div>

                {/* Prompt Text */}
                <div className="p-3 bg-[#F4F4F0] rounded-xl border-2 border-black text-xs font-mono text-black leading-relaxed">
                  <div className="text-[10px] text-black/60 font-black uppercase mb-1">PROMPT ({sub.aiToolUsed}):</div>
                  {sub.promptText}
                </div>

                {/* Screenshot or Prototype */}
                {sub.screenshotUrl && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono text-black font-black uppercase">SCREENSHOT DELIVERABLE:</div>
                    <div className="rounded-xl overflow-hidden border-2 border-black max-h-48 flex items-center justify-center bg-[#F4F4F0] p-1.5">
                      <img src={sub.screenshotUrl} alt="Screenshot" className="max-h-44 object-contain rounded" />
                    </div>
                  </div>
                )}

                {sub.demoUrl && (
                  <div className="flex items-center space-x-3 pt-1">
                    <a
                      href={sub.demoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono font-bold text-black hover:underline flex items-center space-x-1 bg-[#00E5FF] px-2.5 py-1 rounded border border-black shadow-[1px_1px_0_#000]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>LIVE DEMO: {sub.demoUrl}</span>
                    </a>
                    {sub.repoUrl && (
                      <a
                        href={sub.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono font-bold text-black hover:underline flex items-center space-x-1 bg-neutral-200 px-2.5 py-1 rounded border border-black shadow-[1px_1px_0_#000]"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>CODE REPO</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Judges' Scores & Feedback if graded */}
                {sub.scores && (
                  <div className="pt-2.5 border-t-2 border-black text-xs font-mono space-y-1">
                    <div className="flex justify-between items-center text-black">
                      <span className="font-bold">JUDGES' ASSESSMENT ({sub.scores.gradedBy}):</span>
                      <span className="font-black bg-[#FFD600] px-2 py-0.5 rounded border border-black">
                        {sub.scores.totalScore} / 100 PTS
                      </span>
                    </div>
                    {sub.scores.feedback && (
                      <p className="font-mono text-xs text-black/80 italic bg-[#F4F4F0] p-2 rounded-lg border border-black mt-1">
                        "{sub.scores.feedback}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
