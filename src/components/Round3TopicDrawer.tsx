import React, { useState, useEffect } from 'react';
import { Dice5, Copy, Check, Lock, Sparkles, RefreshCw, CheckSquare, Layers, Award } from 'lucide-react';
import { ROUND3_TASKS, Round3Task } from '../data/round3Tasks';
import { api } from '../services/api';
import { sound } from '../utils/audio';
import { ParticipantUser } from '../types';

interface Round3TopicDrawerProps {
  currentUser: ParticipantUser;
  onTaskAssigned: (taskString: string) => void;
}

export const Round3TopicDrawer: React.FC<Round3TopicDrawerProps> = ({
  currentUser,
  onTaskAssigned
}) => {
  const [assignedTask, setAssignedTask] = useState<Round3Task | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [shufflePreview, setShufflePreview] = useState<Round3Task | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Check if participant already has a Round 3 task assigned on mount
  useEffect(() => {
    let isMounted = true;
    const loadAssignedTask = async () => {
      try {
        const res = await api.getMyRound3Task();
        if (isMounted && res.success && res.task) {
          setAssignedTask(res.task);
          onTaskAssigned(`${res.task.title}: ${res.task.problemStatement}`);
        }
      } catch (err: any) {
        console.warn('Could not load assigned Round 3 task:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadAssignedTask();
    return () => { isMounted = false; };
  }, []);

  const handleDrawTask = async () => {
    if (assignedTask || isDrawing) return;
    setErrorMsg('');
    setIsDrawing(true);
    sound.playBeep(600, 0.05);

    // Slot-machine shuffle animation between PS1 and PS2 for 1.2s
    const shuffleInterval = setInterval(() => {
      const idx = Math.floor(Math.random() * ROUND3_TASKS.length);
      setShufflePreview(ROUND3_TASKS[idx]);
      sound.playBeep(450 + Math.random() * 400, 0.03);
    }, 100);

    try {
      const res = await api.drawRound3Task();
      clearInterval(shuffleInterval);

      if (res.success && res.task) {
        setAssignedTask(res.task);
        setShufflePreview(null);
        onTaskAssigned(`${res.task.title}: ${res.task.problemStatement}`);
        sound.playSuccessChime();
      } else {
        throw new Error('Failed to draw Round 3 problem statement');
      }
    } catch (err: any) {
      clearInterval(shuffleInterval);
      setShufflePreview(null);
      setErrorMsg(err?.message || 'Error assigning problem statement. Please try again.');
      sound.playWarningPing();
    } finally {
      setIsDrawing(false);
    }
  };

  const handleCopy = () => {
    const activeDisplay = assignedTask || shufflePreview;
    if (!activeDisplay) return;
    const textToCopy = `${activeDisplay.title}\nTheme: ${activeDisplay.theme}\nProblem Statement: ${activeDisplay.problemStatement}\n\nMandatory Features:\n${activeDisplay.mandatoryFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      sound.playBeep(900, 0.05);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const displayItem = isDrawing ? shufflePreview : assignedTask;

  if (isLoading) {
    return (
      <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0_#000] text-center font-mono text-xs font-bold space-y-2">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-black" />
        <p>CHECKING ROUND 3 PROBLEM STATEMENT ASSIGNMENT...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-4 border-black shadow-[8px_8px_0_#000] overflow-hidden mb-6">
      
      {/* Neo-Brutalist Top Header */}
      <div className="bg-[#00C853] border-b-4 border-black p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-black">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-black text-white flex items-center justify-center border-2 border-black font-black shadow-[2px_2px_0_#000]">
            <Award className="w-5 h-5 text-[#FFD600]" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-[#FFD600] text-black px-2 py-0.5 border border-black shadow-[1px_1px_0_#000]">
              ROUND 03 GRAND FINALE · PROMPT TO PRODUCT
            </span>
            <h3 className="font-heading font-black text-lg text-black uppercase tracking-tight leading-none mt-1">
              PROBLEM STATEMENT ASSIGNMENT (5 CONTESTANTS / PS)
            </h3>
          </div>
        </div>

        <div className="text-[11px] font-mono font-black bg-black text-[#FFD600] px-3 py-1 border-2 border-black shadow-[2px_2px_0_#000] uppercase text-center sm:text-right">
          RANDOM 50/50 PS ALLOCATION
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        
        {/* Main Task Brief Display Card */}
        <div className={`p-6 border-4 border-black shadow-[6px_6px_0_#000] transition-all min-h-[220px] flex flex-col justify-center items-center text-center relative ${
          isDrawing
            ? 'bg-[#FFD600]/20 border-dashed animate-pulse'
            : assignedTask
            ? 'bg-[#F4F4F0]'
            : 'bg-[#0B1120] text-white border-dashed'
        }`}>
          
          {displayItem ? (
            <div className="space-y-4 w-full max-w-2xl mx-auto text-left">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-3">
                <div className="flex items-center space-x-2">
                  <span className="bg-[#FFD600] text-black border-2 border-black px-2.5 py-0.5 font-mono font-black text-xs uppercase shadow-[2px_2px_0_#000]">
                    {displayItem.category}
                  </span>
                  <span className="bg-[#00E5FF] text-black border-2 border-black px-2.5 py-0.5 font-mono font-black text-xs uppercase shadow-[2px_2px_0_#000]">
                    THEME: {displayItem.theme}
                  </span>
                </div>
                {assignedTask && (
                  <span className="bg-[#00C853] text-black border-2 border-black px-2.5 py-0.5 font-mono font-black text-xs uppercase shadow-[2px_2px_0_#000] flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>LOCKED & SAVED IN DB</span>
                  </span>
                )}
              </div>

              <div>
                <h4 className="font-heading font-black text-xl sm:text-2xl text-black uppercase tracking-tight leading-snug">
                  {displayItem.title}
                </h4>
                <p className="font-mono text-xs text-black/70 font-bold mt-0.5">
                  Theme: {displayItem.theme}
                </p>
              </div>

              <div className="bg-white text-black font-mono text-xs sm:text-sm font-bold p-4 border-3 border-black leading-relaxed shadow-[3px_3px_0_#000]">
                <strong className="block text-black text-xs uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-black" />
                  <span>PROBLEM STATEMENT:</span>
                </strong>
                "{displayItem.problemStatement}"
              </div>

              {/* Mandatory Features Checklist */}
              <div className="bg-white p-4 border-3 border-black space-y-2 shadow-[3px_3px_0_#000]">
                <h5 className="font-mono font-black text-xs uppercase text-black flex items-center space-x-1.5 border-b-2 border-black pb-1.5">
                  <CheckSquare className="w-4 h-4 text-[#00C853]" />
                  <span>MANDATORY FEATURES CHECKLIST (ALL 5 REQUIRED IN PROMPTS):</span>
                </h5>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono font-bold text-black pt-1">
                  {displayItem.mandatoryFeatures.map((feat, idx) => (
                    <li key={idx} className="flex items-start space-x-2 bg-[#F4F4F0] p-2 rounded border border-black">
                      <span className="bg-black text-[#FFD600] text-[10px] font-black px-1.5 py-0.2 rounded shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-2 py-6">
              <Sparkles className="w-10 h-10 text-[#00C853] mx-auto animate-bounce" />
              <p className="font-mono font-black text-sm text-gray-300 uppercase">
                NO ROUND 03 PROBLEM STATEMENT DRAWN YET FOR CONTESTANT {currentUser.registrationId}
              </p>
              <p className="font-mono text-xs text-gray-400 max-w-md mx-auto">
                Click "DRAW ROUND 03 PROBLEM STATEMENT" below to randomly draw your finale challenge (Roots & Relations Family Tree OR CourtCraft E-commerce Storefront).
              </p>
            </div>
          )}

        </div>

        {/* Status / Error Notifications */}
        {errorMsg && (
          <div className="p-3 bg-[#FF4081] text-white font-mono font-black text-xs border-3 border-black shadow-[3px_3px_0_#000]">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Action Controls Button Group */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          
          {!assignedTask ? (
            <button
              onClick={handleDrawTask}
              disabled={isDrawing}
              className="w-full sm:w-auto neo-btn bg-[#00C853] text-black px-8 py-3.5 text-sm font-black uppercase flex items-center justify-center space-x-2 shadow-[5px_5px_0_#000] cursor-pointer"
            >
              {isDrawing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-black" />
                  <span>ALLOCATING PROBLEM STATEMENT...</span>
                </>
              ) : (
                <>
                  <Dice5 className="w-5 h-5" />
                  <span>DRAW ROUND 03 PROBLEM STATEMENT (1 CHANCE ONLY)</span>
                </>
              )}
            </button>
          ) : (
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#00C853]/20 border-3 border-black p-3.5 font-mono text-xs shadow-[3px_3px_0_#000]">
              <div className="flex items-center space-x-2 text-black font-bold">
                <Lock className="w-4 h-4 text-[#FF4081]" />
                <span>PS STORED IN DATABASE ROW FOR REGISTRATION ID: <strong className="underline">{currentUser.registrationId}</strong></span>
              </div>

              <button
                onClick={handleCopy}
                className="w-full sm:w-auto neo-btn bg-[#FFD600] text-black px-4 py-2 text-xs font-black uppercase flex items-center justify-center space-x-1.5 shrink-0 shadow-[2px_2px_0_#000]"
              >
                {copied ? <Check className="w-4 h-4 text-[#00C853]" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'COPIED TO CLIPBOARD!' : 'COPY PROBLEM STATEMENT & REQUIREMENTS'}</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
