import React, { useState, useEffect } from 'react';
import { Dice5, Copy, Check, Lock, Sparkles, RefreshCw } from 'lucide-react';
import { ROUND2_TASKS, Round2Task } from '../data/round2Tasks';
import { api } from '../services/api';
import { sound } from '../utils/audio';
import { ParticipantUser } from '../types';

interface Round2TopicDrawerProps {
  currentUser: ParticipantUser;
  onTaskAssigned: (taskString: string) => void;
}

export const Round2TopicDrawer: React.FC<Round2TopicDrawerProps> = ({
  currentUser,
  onTaskAssigned
}) => {
  const [assignedTask, setAssignedTask] = useState<Round2Task | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [shufflePreview, setShufflePreview] = useState<Round2Task | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Check if participant already has a task assigned on mount
  useEffect(() => {
    let isMounted = true;
    const loadAssignedTask = async () => {
      try {
        const res = await api.getMyRound2Task();
        if (isMounted && res.success && res.task) {
          setAssignedTask(res.task);
          onTaskAssigned(`${res.task.title}: ${res.task.scenario}`);
        }
      } catch (err: any) {
        console.warn('Could not load assigned Round 2 task:', err);
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

    // Slot-machine shuffle animation for 1.2s across the 10 scenarios
    const shuffleInterval = setInterval(() => {
      const idx = Math.floor(Math.random() * ROUND2_TASKS.length);
      setShufflePreview(ROUND2_TASKS[idx]);
      sound.playBeep(450 + Math.random() * 400, 0.03);
    }, 90);

    try {
      const res = await api.drawRound2Task();
      clearInterval(shuffleInterval);

      if (res.success && res.task) {
        setAssignedTask(res.task);
        setShufflePreview(null);
        onTaskAssigned(`${res.task.title}: ${res.task.scenario}`);
        sound.playSuccessChime();
      } else {
        throw new Error('Failed to draw scenario sprint chit');
      }
    } catch (err: any) {
      clearInterval(shuffleInterval);
      setShufflePreview(null);
      setErrorMsg(err?.message || 'Error assigning scenario chit. Please try again.');
      sound.playWarningPing();
    } finally {
      setIsDrawing(false);
    }
  };

  const handleCopy = () => {
    const activeDisplay = assignedTask || shufflePreview;
    if (!activeDisplay) return;
    const textToCopy = `${activeDisplay.title}\nScenario Chit: ${activeDisplay.scenario}`;
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
        <p>CHECKING ROUND 2 SCENARIO ASSIGNMENT STATUS...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-4 border-black shadow-[8px_8px_0_#000] overflow-hidden mb-6">
      
      {/* Neo-Brutalist Top Header */}
      <div className="bg-[#00E5FF] border-b-4 border-black p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-black text-white flex items-center justify-center border-2 border-black font-black shadow-[2px_2px_0_#000]">
            <Dice5 className="w-5 h-5 text-[#00E5FF]" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-[#FFD600] text-black px-2 py-0.5 border border-black shadow-[1px_1px_0_#000]">
              ROUND 02 ARENA · SCENARIO SPRINT
            </span>
            <h3 className="font-heading font-black text-lg text-black uppercase tracking-tight leading-none mt-1">
              SITUATION CHIT DRAW (1 IN 3 PARTICIPANTS)
            </h3>
          </div>
        </div>

        <div className="text-[11px] font-mono font-black bg-black text-white px-3 py-1 border-2 border-black shadow-[2px_2px_0_#000] uppercase text-center sm:text-right">
          MAX 3 PARTICIPANTS / SCENARIO
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        
        {/* Main Task Brief Display Card */}
        <div className={`p-6 border-4 border-black shadow-[6px_6px_0_#000] transition-all min-h-[190px] flex flex-col justify-center items-center text-center relative ${
          isDrawing
            ? 'bg-[#FFD600]/20 border-dashed animate-pulse'
            : assignedTask
            ? 'bg-[#F4F4F0]'
            : 'bg-[#0B1120] text-white border-dashed'
        }`}>
          
          {displayItem ? (
            <div className="space-y-3 w-full max-w-xl mx-auto">
              <div className="flex items-center justify-center space-x-2">
                {displayItem.category && (
                  <span className="bg-[#FFD600] text-black border-2 border-black px-2.5 py-0.5 font-mono font-black text-xs uppercase shadow-[2px_2px_0_#000]">
                    {displayItem.category}
                  </span>
                )}
                {assignedTask && (
                  <span className="bg-[#00C853] text-black border-2 border-black px-2.5 py-0.5 font-mono font-black text-xs uppercase shadow-[2px_2px_0_#000] flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>LOCKED & SAVED IN DB</span>
                  </span>
                )}
              </div>

              <h4 className="font-heading font-black text-xl sm:text-2xl text-black uppercase tracking-tight leading-snug">
                {displayItem.title}
              </h4>

              <div className="bg-white text-black font-mono text-xs sm:text-sm font-bold p-4 border-3 border-black text-left leading-relaxed shadow-[3px_3px_0_#000]">
                "{displayItem.scenario}"
              </div>
              <p className="text-[11px] text-neutral-600 font-mono font-bold">
                ~15 words situation chit. Craft your prompt solving this scenario.
              </p>
            </div>
          ) : (
            <div className="space-y-2 py-4">
              <Sparkles className="w-8 h-8 text-[#00E5FF] mx-auto animate-bounce" />
              <p className="font-mono font-black text-sm text-gray-300 uppercase">
                NO SCENARIO CHIT DRAWN YET FOR CONTESTANT {currentUser.registrationId}
              </p>
              <p className="font-mono text-xs text-gray-400">
                Click "DRAW SCENARIO CHIT" below to randomly receive your situation brief (1 chance only!).
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
              className="w-full sm:w-auto neo-btn bg-[#00E5FF] text-black px-8 py-3.5 text-sm font-black uppercase flex items-center justify-center space-x-2 shadow-[5px_5px_0_#000] cursor-pointer"
            >
              {isDrawing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>SHUFFLING & ASSIGNING SCENARIO...</span>
                </>
              ) : (
                <>
                  <Dice5 className="w-5 h-5" />
                  <span>DRAW SCENARIO CHIT (1 CHANCE ONLY)</span>
                </>
              )}
            </button>
          ) : (
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#00E5FF]/20 border-3 border-black p-3.5 font-mono text-xs shadow-[3px_3px_0_#000]">
              <div className="flex items-center space-x-2 text-black font-bold">
                <Lock className="w-4 h-4 text-[#FF4081]" />
                <span>SCENARIO STORED IN DATABASE ROW FOR REGISTRATION ID: <strong className="underline">{currentUser.registrationId}</strong></span>
              </div>

              <button
                onClick={handleCopy}
                className="w-full sm:w-auto neo-btn bg-[#FFD600] text-black px-4 py-2 text-xs font-black uppercase flex items-center justify-center space-x-1.5 shrink-0 shadow-[2px_2px_0_#000]"
              >
                {copied ? <Check className="w-4 h-4 text-[#00C853]" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'COPIED TO CLIPBOARD!' : 'COPY SCENARIO CHIT'}</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
