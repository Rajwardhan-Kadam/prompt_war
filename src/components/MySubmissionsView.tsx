import React, { useEffect, useState } from 'react';
import { Submission, ParticipantUser } from '../types';
import { api } from '../services/api';
import { ShieldCheck, ShieldAlert, Award, FileText, CheckCircle2, Sparkles } from 'lucide-react';

interface MySubmissionsViewProps {
  currentUser: ParticipantUser;
}

export const MySubmissionsView: React.FC<MySubmissionsViewProps> = ({ currentUser }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMine = async () => {
      try {
        setIsLoading(true);
        const data = await api.getMySubmissions();
        setSubmissions(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load your submissions.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMine();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      
      {/* Header Banner */}
      <div className="bg-[#00E5FF] border-4 border-black p-6 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-block bg-black text-white px-2.5 py-1 text-xs font-mono font-extrabold uppercase tracking-widest mb-2">
            PARTICIPANT RECORD DOSSIER
          </div>
          <h2 className="text-3xl font-mono font-black uppercase text-black">
            MY SUBMISSIONS
          </h2>
          <p className="text-sm font-mono font-bold text-black mt-1">
            Logged in as: <span className="underline">{currentUser.name}</span> ({currentUser.registrationId})
          </p>
        </div>

        <div className="bg-white border-3 border-black p-4 font-mono text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-xs uppercase font-bold text-gray-600">Submissions Logged</div>
          <div className="text-3xl font-black text-black">{submissions.length} / 3</div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border-4 border-black p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-mono font-bold text-lg">RETRIEVING SUBMISSION ARCHIVES...</p>
        </div>
      ) : error ? (
        <div className="bg-[#FF4081] text-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-mono font-bold">
          {error}
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-white border-4 border-black p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4 stroke-2" />
          <h3 className="font-mono font-black text-xl mb-2">NO SUBMISSIONS FOUND</h3>
          <p className="font-mono text-sm text-gray-600 max-w-md mx-auto">
            You haven't submitted any prompt entries yet. Navigate to the Submission Portal to participate in the active round.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {submissions.map((sub) => {
            const isEvaluated = sub.status === 'evaluated' && sub.scores;
            return (
              <div
                key={sub.id}
                className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
              >
                {/* Round Header Bar */}
                <div className="bg-black text-white px-6 py-3 font-mono flex flex-wrap items-center justify-between gap-2 border-b-4 border-black">
                  <div className="flex items-center space-x-3">
                    <span className="bg-[#FFD600] text-black px-2.5 py-0.5 text-xs font-black uppercase">
                      ROUND 0{sub.roundId}
                    </span>
                    <span className="font-bold text-sm">Theme: {sub.assignedThemeOrChit}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs font-bold">
                    {sub.status === 'evaluated' ? (
                      <span className="bg-[#00E5FF] text-black px-2 py-0.5 border border-white flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>GRADED</span>
                      </span>
                    ) : sub.status === 'flagged_ai' ? (
                      <span className="bg-[#FF4081] text-white px-2 py-0.5 border border-white flex items-center space-x-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>FLAGGED BOILERPLATE</span>
                      </span>
                    ) : (
                      <span className="bg-[#FFD600] text-black px-2 py-0.5 border border-white flex items-center space-x-1">
                        <FileText className="w-3.5 h-3.5" />
                        <span>UNDER REVIEW</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Prompt Text Box */}
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Submitted Prompt Text
                    </label>
                    <div className="bg-[#F4F4F0] border-2 border-black p-4 font-mono text-sm font-semibold whitespace-pre-wrap">
                      {sub.promptText}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                    <div className="bg-gray-50 border-2 border-black p-3.5">
                      <span className="font-bold text-gray-500 uppercase block mb-1">AI Tool Suite</span>
                      <span className="font-extrabold text-sm">{sub.aiToolUsed}</span>
                    </div>

                    <div className="bg-gray-50 border-2 border-black p-3.5">
                      <span className="font-bold text-gray-500 uppercase block mb-1">Timestamp</span>
                      <span className="font-extrabold text-sm">{new Date(sub.submittedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* ML Authenticity Report Card */}
                  <div className="bg-yellow-50 border-3 border-black p-4 font-mono">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-xs uppercase tracking-wider flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-black" />
                        <span>ML FORENSIC AUTHENTICITY ANALYSIS</span>
                      </span>
                      <span className="font-black text-sm px-2 py-0.5 bg-black text-white">
                        {sub.authenticity.authenticityScore} / 100
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-800">{sub.authenticity.reasoning}</p>
                  </div>

                  {/* Evaluation Scores Section (If Graded) */}
                  {isEvaluated && sub.scores && (
                    <div className="bg-[#00E5FF]/20 border-3 border-black p-5 font-mono space-y-4">
                      <div className="flex items-center justify-between border-b-2 border-black pb-2">
                        <span className="font-black text-sm uppercase flex items-center space-x-2">
                          <Award className="w-5 h-5 text-black" />
                          <span>REFEREE EVALUATION SCORECARD</span>
                        </span>
                        <span className="text-2xl font-black bg-black text-[#00E5FF] px-3 py-1">
                          {sub.scores.totalScore} / 100
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs font-bold">
                        <div className="bg-white border-2 border-black p-2">
                          <div className="text-gray-500 text-[10px]">PROMPT QUALITY</div>
                          <div className="text-lg font-black">{sub.scores.promptQuality}/25</div>
                        </div>
                        <div className="bg-white border-2 border-black p-2">
                          <div className="text-gray-500 text-[10px]">OUTPUT RELEVANCE</div>
                          <div className="text-lg font-black">{sub.scores.outputRelevance}/25</div>
                        </div>
                        <div className="bg-white border-2 border-black p-2">
                          <div className="text-gray-500 text-[10px]">CREATIVITY</div>
                          <div className="text-lg font-black">{sub.scores.creativity}/25</div>
                        </div>
                        <div className="bg-white border-2 border-black p-2">
                          <div className="text-gray-500 text-[10px]">TECH EXECUTION</div>
                          <div className="text-lg font-black">{sub.scores.technicalExecution}/25</div>
                        </div>
                        <div className="bg-[#FFD600] border-2 border-black p-2 col-span-2 md:col-span-1">
                          <div className="text-black text-[10px]">AUTHENTICITY BONUS</div>
                          <div className="text-lg font-black">+{sub.scores.authenticityBonus}/10</div>
                        </div>
                      </div>

                      {sub.scores.feedback && (
                        <div className="bg-white border-2 border-black p-3 text-xs">
                          <span className="font-bold text-gray-500 uppercase block mb-1">Judge Feedback:</span>
                          <p className="font-semibold text-gray-900">{sub.scores.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
