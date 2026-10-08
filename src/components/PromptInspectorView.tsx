import React, { useState } from 'react';
import {
  Cpu,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
  Info,
  ArrowRight,
  ShieldCheck,
  Activity,
  Flame,
  Terminal,
  Lock,
  ShieldAlert,
  KeyRound
} from 'lucide-react';
import { PromptAuthenticityResult } from '../types';
import { api } from '../services/api';
import { sound } from '../utils/audio';

const SAMPLE_PROMPTS = [
  {
    label: 'Human-Crafted Original Prompt',
    text: 'A cross-sectional anatomical study of a solar-photosynthetic honeybee hive inside a derelict Soviet satellite. Brass scaffolding, amber hexagonal combs dripping with liquid neodymium, soft vacuum frost forming on telemetry solar panels.',
    expected: 'Self-Made'
  },
  {
    label: 'AI-Generated Cliché Stuffer',
    text: 'masterpiece, 8k resolution, highly detailed, photorealistic, cinematic lighting, trending on artstation, unreal engine 5 render, award winning, volumetric lighting, sharp focus, ray tracing.',
    expected: 'AI Boilerplate'
  },
  {
    label: 'ChatGPT Meta-Template',
    text: 'Act as a senior software architect with 20 years of experience. In a world where digital systems are paramount, provide a comprehensive step-by-step guide on microservices architecture.',
    expected: 'AI Template'
  }
];

interface PromptInspectorViewProps {
  isAdmin?: boolean;
  onOpenAdminPinModal?: () => void;
}

export const PromptInspectorView: React.FC<PromptInspectorViewProps> = ({
  isAdmin = false,
  onOpenAdminPinModal
}) => {
  const [promptText, setPromptText] = useState(SAMPLE_PROMPTS[0].text);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PromptAuthenticityResult | null>(null);

  const handleAnalyze = async () => {
    if (!promptText.trim()) return;
    setIsAnalyzing(true);
    sound.playBeep(650, 0.05);

    try {
      const res = await api.checkPrompt(promptText);
      setResult(res);
      if (res.isAiGenerated) {
        sound.playWarningPing();
      } else {
        sound.playSuccessChime();
      }
    } catch {
      sound.playWarningPing();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadPreset = (presetText: string) => {
    setPromptText(presetText);
    sound.playBeep(750, 0.03);
    setResult(null);
  };

  // -------------------------------------------------------------
  // RESTRICTED VIEW (When contestant or non-admin attempts to view)
  // -------------------------------------------------------------
  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-6">
        <div className="bg-white border-4 border-black p-8 sm:p-12 rounded-3xl shadow-[10px_10px_0_#000] text-center space-y-6">
          <div className="w-16 h-16 bg-[#FF4081] border-3 border-black rounded-2xl flex items-center justify-center text-white mx-auto shadow-[4px_4px_0_#000]">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-[#FFD600] text-black font-mono font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000]">
              RESTRICTED EVALUATION TOOL
            </span>
            <h2 className="text-2xl sm:text-4xl font-heading font-black text-black uppercase tracking-tight">
              ML FORENSICS ACCESS LOCKED
            </h2>
            <p className="text-xs sm:text-sm font-mono text-black/80 max-w-lg mx-auto leading-relaxed pt-1">
              The NLP Forensic Detector and Statistical Burstiness Radar are strictly reserved for tournament judges, referees, and evaluators. Contestant access is disabled to maintain competitive integrity and prevent trial-and-error prompt gaming.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onOpenAdminPinModal}
              className="neo-btn bg-[#FFD600] hover:bg-[#00C853] text-black px-6 py-3 text-xs uppercase font-black flex items-center justify-center space-x-2 mx-auto cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>JUDGE OR ADMIN? ENTER PASSCODE TO UNLOCK</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // JUDGE & ADMIN AUTHORIZED VIEW
  // -------------------------------------------------------------
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Header Banner - Loot Drop Brutalist Style */}
      <div className="bg-white border-4 border-black p-5 sm:p-6 rounded-2xl shadow-[6px_6px_0_#000]">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#00E5FF] text-black font-black font-mono text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000] flex items-center space-x-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>JUDGE FORENSIC LAB</span>
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#00C853] text-black font-black font-mono text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000]">
            AUTHORIZATION ACTIVE
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-heading font-black text-black uppercase tracking-tight">
          PROMPT AUTHENTICITY DETECTOR
        </h2>
        <p className="text-xs sm:text-sm font-mono text-black/80 mt-1 max-w-3xl leading-relaxed">
          Powered by statistical burstiness heuristics. Evaluates whether a tournament prompt was organically crafted by a human or copied from formulaic AI boilerplates.
        </p>
      </div>

      {/* Preset Chips */}
      <div className="space-y-2">
        <span className="text-xs font-mono font-black text-black uppercase tracking-wider flex items-center space-x-1">
          <Terminal className="w-3.5 h-3.5 text-black" />
          <span>LOAD TEST BENCHMARKS:</span>
        </span>
        <div className="flex flex-wrap gap-2.5">
          {SAMPLE_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => loadPreset(p.text)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-black uppercase bg-white hover:bg-[#FFD600] text-black border-3 border-black shadow-[3px_3px_0_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Arena Card */}
      <div className="bg-white border-4 border-black rounded-2xl p-5 sm:p-6 space-y-4 shadow-[6px_6px_0_#000]">
        <div className="flex items-center justify-between">
          <label className="text-xs font-heading font-black text-black uppercase tracking-wider">
            TEST PROMPT CONSOLE:
          </label>
          <div className="text-xs font-mono font-bold text-black/70 bg-[#F4F4F0] px-2.5 py-1 rounded-md border-2 border-black">
            {promptText.trim().split(/\s+/).filter(Boolean).length} WORDS · {promptText.length} CHARS
          </div>
        </div>

        <textarea
          rows={5}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Paste or write any prompt here to analyze its linguistic authenticity..."
          className="w-full bg-[#F4F4F0] border-3 border-black rounded-xl p-3.5 text-xs sm:text-sm text-black font-mono font-medium focus:outline-none focus:bg-white focus:shadow-[4px_4px_0_#000] transition-all leading-relaxed"
        />

        <div className="flex justify-end pt-1">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !promptText.trim()}
            className="w-full sm:w-auto neo-btn bg-[#FFD600] hover:bg-[#FF4081] hover:text-white text-black px-8 py-3 text-xs uppercase flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>ANALYZING STATISTICAL ENTROPY...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current" />
                <span>RUN FORENSIC SCAN</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analysis Results Display */}
      {result && (
        <div className="space-y-6">
          
          {/* Main Verdict Banner - High Impact Brutalist */}
          <div className={`p-6 sm:p-7 rounded-2xl border-4 border-black ${
            result.isAiGenerated
              ? 'bg-[#FF4081] text-white shadow-[8px_8px_0_#000]'
              : 'bg-[#00C853] text-black shadow-[8px_8px_0_#000]'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-start sm:items-center space-x-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border-3 border-black shadow-[3px_3px_0_#000] ${
                  result.isAiGenerated ? 'bg-white text-black' : 'bg-black text-[#00C853]'
                }`}>
                  {result.isAiGenerated ? (
                    <AlertTriangle className="w-8 h-8" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-mono uppercase tracking-widest font-black opacity-80">
                    CLASSIFICATION VERDICT
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-heading font-black uppercase tracking-tight">
                    {result.verdict}
                  </h3>
                  <p className="text-xs sm:text-sm font-mono mt-1 max-w-xl leading-relaxed">
                    {result.reasoning}
                  </p>
                </div>
              </div>

              {/* Authenticity Radial / Number */}
              <div className="sm:border-l-3 sm:border-black sm:pl-6 shrink-0 font-mono pt-4 sm:pt-0 border-t-2 border-black/30 sm:border-t-0">
                <div className="text-xs uppercase tracking-wider font-black opacity-80">
                  AUTHENTICITY INDEX
                </div>
                <div className="text-4xl sm:text-5xl font-mono font-black tracking-tight mt-0.5">
                  {result.authenticityScore}%
                </div>
                <div className="text-xs font-bold uppercase mt-1">
                  {result.isAiGenerated ? 'FLAGGED AS AI BOILERPLATE' : 'VERIFIED HUMAN CREATION'}
                </div>
              </div>
            </div>
          </div>

          {/* 4 Feature Metrics Radar Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Metric 1: Burstiness */}
            <div className="bg-white border-3 border-black rounded-2xl p-4 shadow-[4px_4px_0_#000]">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-black mb-2">
                <span className="uppercase">BURSTINESS</span>
                <span className="font-black bg-[#F4F4F0] px-1.5 py-0.5 rounded border border-black">{result.metrics.burstiness}/100</span>
              </div>
              <div className="w-full bg-[#F4F4F0] border-2 border-black rounded-full h-3 overflow-hidden mb-2">
                <div
                  className="bg-[#00E5FF] h-full"
                  style={{ width: `${result.metrics.burstiness}%` }}
                ></div>
              </div>
              <p className="text-[11px] font-mono text-black/70 leading-tight">
                Sentence rhythm variance. Natural humans write with diverse cadence.
              </p>
            </div>

            {/* Metric 2: Entropy & Perplexity */}
            <div className="bg-white border-3 border-black rounded-2xl p-4 shadow-[4px_4px_0_#000]">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-black mb-2">
                <span className="uppercase">LEXICAL ENTROPY</span>
                <span className="font-black bg-[#F4F4F0] px-1.5 py-0.5 rounded border border-black">{result.metrics.entropyScore}/100</span>
              </div>
              <div className="w-full bg-[#F4F4F0] border-2 border-black rounded-full h-3 overflow-hidden mb-2">
                <div
                  className="bg-[#FFD600] h-full"
                  style={{ width: `${result.metrics.entropyScore}%` }}
                ></div>
              </div>
              <p className="text-[11px] font-mono text-black/70 leading-tight">
                Information density. High entropy indicates rich domain vocabulary.
              </p>
            </div>

            {/* Metric 3: Vocabulary Diversity */}
            <div className="bg-white border-3 border-black rounded-2xl p-4 shadow-[4px_4px_0_#000]">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-black mb-2">
                <span className="uppercase">VOCAB DIVERSITY</span>
                <span className="font-black bg-[#F4F4F0] px-1.5 py-0.5 rounded border border-black">{result.metrics.vocabularyDiversity}%</span>
              </div>
              <div className="w-full bg-[#F4F4F0] border-2 border-black rounded-full h-3 overflow-hidden mb-2">
                <div
                  className="bg-[#00C853] h-full"
                  style={{ width: `${result.metrics.vocabularyDiversity}%` }}
                ></div>
              </div>
              <p className="text-[11px] font-mono text-black/70 leading-tight">
                Type-Token Ratio checking variety against repeated formula patterns.
              </p>
            </div>

            {/* Metric 4: Boilerplate Cliché Count */}
            <div className="bg-white border-3 border-black rounded-2xl p-4 shadow-[4px_4px_0_#000]">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-black mb-2">
                <span className="uppercase">CLICHÉ MARKERS</span>
                <span className={`font-black px-1.5 py-0.5 rounded border border-black ${result.metrics.formulaicMarkersCount > 0 ? 'bg-[#FF4081] text-white' : 'bg-[#00C853] text-black'}`}>
                  {result.metrics.formulaicMarkersCount} FOUND
                </span>
              </div>
              <div className="w-full bg-[#F4F4F0] border-2 border-black rounded-full h-3 overflow-hidden mb-2">
                <div
                  className="bg-[#FF4081] h-full"
                  style={{ width: `${Math.min(100, result.metrics.formulaicMarkersCount * 25)}%` }}
                ></div>
              </div>
              <p className="text-[11px] font-mono text-black/70 leading-tight">
                Scans 50+ known boilerplate terms ('photorealistic', '8k', 'trending').
              </p>
            </div>

          </div>

          {/* Detected Clichés & Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Clichés box */}
            <div className="bg-white border-4 border-black rounded-2xl p-5 space-y-3 shadow-[6px_6px_0_#000]">
              <h4 className="text-xs font-heading font-black text-black uppercase tracking-wider flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-[#FF4081]" />
                <span>DETECTED BOILERPLATE MARKERS</span>
              </h4>

              {result.detectedMarkers.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {result.detectedMarkers.map((marker, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-[#FF4081]/15 border-2 border-black text-black font-mono font-black text-xs shadow-[2px_2px_0_#000]"
                    >
                      {marker}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-[#00C853]/20 border-2 border-black rounded-xl text-xs text-black font-mono font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00C853]" />
                  <span>No formulaic prompt-stuffing tags detected! Clean composition.</span>
                </div>
              )}
            </div>

            {/* Coach Tips */}
            <div className="bg-white border-4 border-black rounded-2xl p-5 space-y-3 shadow-[6px_6px_0_#000]">
              <h4 className="text-xs font-heading font-black text-black uppercase tracking-wider flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-black" />
                <span>CONTESTANT RECOMMENDATIONS</span>
              </h4>

              <ul className="space-y-2 text-xs font-mono text-black/90">
                {result.improvementTips.map((tip, i) => (
                  <li key={i} className="flex items-start space-x-2 bg-[#F4F4F0] p-2.5 rounded-xl border border-black">
                    <ArrowRight className="w-4 h-4 text-black shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
