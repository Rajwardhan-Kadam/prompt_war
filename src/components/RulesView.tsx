import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Trophy,
  ShieldCheck,
  Zap,
  Image,
  Code2,
  Terminal,
  Sparkles,
  Flame
} from 'lucide-react';
import { ROUNDS_INFO } from '../data/mockData';

export const RulesView: React.FC = () => {
  const officialRules = [
    {
      num: 1,
      rule: 'Participants compete individually (Max 1 participant per team/registration).'
    },
    {
      num: 2,
      rule: 'Only AI tools permitted or announced by the organizers may be used.'
    },
    {
      num: 3,
      rule: 'All prompts, outputs, screenshots, prototypes, and demonstrations must be submitted through the official submission method.'
    },
    {
      num: 4,
      rule: 'Participants must complete and submit their work before referees close each round.'
    },
    {
      num: 5,
      rule: 'Round 1 requires a mobile screenshot showing the exact prompt and generated image.'
    },
    {
      num: 6,
      rule: 'Round 2 requires submission of the final prompt and generated output.'
    },
    {
      num: 7,
      rule: 'Round 3 requires a functional prototype with the required features and a demonstration when requested by the judges.'
    },
    {
      num: 8,
      rule: "Judges' decisions regarding the final product and demonstration are final."
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Title & Overview Header - Loot Drop Brutalist Style */}
      <div className="bg-white border-4 border-black p-6 sm:p-7 rounded-2xl shadow-[6px_6px_0_#000]">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#FFD600] text-black font-black font-mono text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000]">
            DEPT OF AI & DATA SCIENCE
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#00E5FF] text-black font-black font-mono text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000]">
            MAX 1 PARTICIPANT
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#00C853] text-black font-black font-mono text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000]">
            ₹100 ENTRY PER CADET
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-black text-black uppercase tracking-tight">
          PROMPT WARS — BATTLE OF THE MINDS
        </h2>
        <div className="mt-2 text-xs sm:text-sm font-mono text-black/80 leading-relaxed max-w-3xl">
          PROMPT WARS is a three-round Generative AI challenge designed to test participants' prompt engineering, creativity, problem-solving, and AI-assisted development skills. Participants progress from basic image generation to scenario-based prompting and finally to building a functional digital product using prompts.
        </div>

        {/* Motto Banner */}
        <div className="mt-4 inline-flex items-center space-x-2.5 bg-[#FFD600] border-3 border-black px-4 py-2 rounded-xl text-xs font-heading font-black uppercase shadow-[3px_3px_0_#000]">
          <span className="text-black/70">CORE PHILOSOPHY:</span>
          <span className="text-black tracking-wider">
            IMAGINE • PROMPT • CREATE
          </span>
        </div>
      </div>

      {/* 3 Rounds Detailed Breakdown */}
      <div className="space-y-4 sm:space-y-5">
        <h3 className="text-lg sm:text-xl font-heading font-black text-black uppercase tracking-tight flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-black" />
          <span>TOURNAMENT ROUND PROGRESSION</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Round 1 Card */}
          <div className="bg-white border-4 border-black rounded-2xl p-5 sm:p-6 space-y-4 shadow-[6px_6px_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_#000] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-black text-black bg-[#FFD600] px-3 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0_#000] uppercase">
                ROUND 01
              </span>
              <span className="text-xs font-mono font-bold text-black/60 bg-[#F4F4F0] px-2 py-0.5 rounded border border-black">CLASSROOM</span>
            </div>

            <div>
              <h4 className="font-heading font-black text-black text-lg uppercase">PROMPT TO PICTURE</h4>
              <p className="text-xs text-black/70 font-mono font-bold">Image Generation Challenge</p>
            </div>

            <div className="flex items-center space-x-2 text-xs font-mono font-black text-black py-2 border-y-2 border-black bg-[#F4F4F0] px-2 rounded-lg">
              <span className="text-[#00C853]">LEVEL: EASY</span>
            </div>

            <div className="space-y-2 text-xs font-mono text-black">
              <div className="text-[10px] text-black/60 font-black uppercase">REQUIRED TASKS:</div>
              <ul className="space-y-1.5 list-disc list-inside text-black/85 leading-relaxed">
                <li>Understand the assigned picture theme.</li>
                <li>Write a suitable image prompt.</li>
                <li>Generate image with permitted AI tool.</li>
                <li>Take mobile screenshot showing prompt and output.</li>
                <li>Submit before round is stopped by referees.</li>
              </ul>
            </div>

            <a
              href="#round-1"
              className="mt-2 w-full py-2 px-3 bg-[#FFD600] text-black font-mono font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_#000] flex items-center justify-between no-underline transition-all"
            >
              <span>ENTER ROUND 01 CONSOLE</span>
              <span>↓</span>
            </a>
          </div>

          {/* Round 2 Card */}
          <div className="bg-white border-4 border-black rounded-2xl p-5 sm:p-6 space-y-4 shadow-[6px_6px_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_#000] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-black text-black bg-[#00E5FF] px-3 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0_#000] uppercase">
                ROUND 02
              </span>
              <span className="text-xs font-mono font-bold text-black/60 bg-[#F4F4F0] px-2 py-0.5 rounded border border-black">COMPUTER LAB</span>
            </div>

            <div>
              <h4 className="font-heading font-black text-black text-lg uppercase">SCENARIO SPRINT</h4>
              <p className="text-xs text-black/70 font-mono font-bold">Situation-Based Prompting</p>
            </div>

            <div className="flex items-center space-x-2 text-xs font-mono font-black text-black py-2 border-y-2 border-black bg-[#F4F4F0] px-2 rounded-lg">
              <span className="text-[#FF6B00]">LEVEL: INTERMEDIATE</span>
            </div>

            <div className="space-y-2 text-xs font-mono text-black">
              <div className="text-[10px] text-black/60 font-black uppercase">REQUIRED TASKS:</div>
              <ul className="space-y-1.5 list-disc list-inside text-black/85 leading-relaxed">
                <li>Read randomly assigned ~15-word scenario chit.</li>
                <li>Convert scenario into an effective solution prompt.</li>
                <li>Generate output using permitted AI LLM tool.</li>
                <li>Refine prompt within available round window.</li>
                <li>Submit final prompt and output before round is stopped.</li>
              </ul>
            </div>

            <a
              href="#round-2"
              className="mt-2 w-full py-2 px-3 bg-[#00E5FF] text-black font-mono font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_#000] flex items-center justify-between no-underline transition-all"
            >
              <span>ENTER ROUND 02 CONSOLE</span>
              <span>↓</span>
            </a>
          </div>

          {/* Round 3 Card */}
          <div className="bg-white border-4 border-black rounded-2xl p-5 sm:p-6 space-y-4 shadow-[6px_6px_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_#000] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-black text-black bg-[#00C853] px-3 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0_#000] uppercase">
                ROUND 03
              </span>
              <span className="text-xs font-mono font-bold text-black/60 bg-[#F4F4F0] px-2 py-0.5 rounded border border-black">COMPUTER LAB</span>
            </div>

            <div>
              <h4 className="font-heading font-black text-black text-lg uppercase">PROMPT TO PRODUCT</h4>
              <p className="text-xs text-black/70 font-mono font-bold">AI-Assisted Development Finale</p>
            </div>

            <div className="flex items-center space-x-2 text-xs font-mono font-black text-black py-2 border-y-2 border-black bg-[#F4F4F0] px-2 rounded-lg">
              <span className="text-[#FF4081]">LEVEL: ADVANCED</span>
            </div>

            <div className="space-y-2 text-xs font-mono text-black">
              <div className="text-[10px] text-black/60 font-black uppercase">REQUIRED TASKS:</div>
              <ul className="space-y-1.5 list-disc list-inside text-black/85 leading-relaxed">
                <li>Understand assigned product requirement.</li>
                <li>Write prompts to instruct AI coding tools.</li>
                <li>Refine prototype using iterative prompts.</li>
                <li>Deliver functional prototype with required features.</li>
                <li>Present and demonstrate live to judges.</li>
              </ul>
            </div>

            <a
              href="#round-3"
              className="mt-2 w-full py-2 px-3 bg-[#00C853] text-black font-mono font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_#000] flex items-center justify-between no-underline transition-all"
            >
              <span>ENTER ROUND 03 CONSOLE</span>
              <span>↓</span>
            </a>
          </div>

        </div>
      </div>

      {/* Official Rules & Guidelines (1 - 8) */}
      <div className="bg-white border-4 border-black rounded-2xl p-6 sm:p-7 space-y-5 shadow-[6px_6px_0_#000]">
        <div className="flex items-center space-x-3.5 border-b-2 border-black pb-4">
          <div className="w-12 h-12 rounded-xl bg-[#FFD600] border-3 border-black flex items-center justify-center text-black shadow-[3px_3px_0_#000]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-heading font-black text-black uppercase">
              OFFICIAL RULES & GUIDELINES
            </h3>
            <p className="text-xs font-mono font-bold text-black/60">Enforced by tournament referee panel & ML authenticity checks</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          {officialRules.map((item) => (
            <div
              key={item.num}
              className="flex items-start space-x-3 p-3.5 rounded-xl bg-[#F4F4F0] border-2 border-black shadow-[2px_2px_0_#000]"
            >
              <div className="w-7 h-7 rounded-lg bg-[#FFD600] border-2 border-black text-black font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-[1px_1px_0_#000]">
                0{item.num}
              </div>
              <div className="text-xs text-black font-mono font-bold leading-relaxed pt-0.5">
                {item.rule}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scoring Rubric & Competencies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        
        {/* Core Competencies */}
        <div className="bg-white border-4 border-black rounded-2xl p-6 space-y-3 shadow-[6px_6px_0_#000]">
          <h4 className="text-xs font-heading font-black text-black uppercase tracking-wider flex items-center space-x-2">
            <Zap className="w-4 h-4 text-black" />
            <span>EVENT OBJECTIVES & COMPETENCIES</span>
          </h4>
          <p className="text-xs font-mono text-black/80 leading-relaxed">
            Prompt Wars develops participants' ability to communicate effectively with Generative AI, solve problems through prompt engineering, think creatively, and transform natural-language instructions into useful digital products.
          </p>
          <div className="pt-2 flex flex-wrap gap-2 text-xs font-mono font-black uppercase">
            <span className="px-3 py-1 rounded-lg bg-[#FFD600] border-2 border-black shadow-[2px_2px_0_#000]">
              PROMPT ENGINEERING
            </span>
            <span className="px-3 py-1 rounded-lg bg-[#00E5FF] border-2 border-black shadow-[2px_2px_0_#000]">
              CREATIVITY & LOGIC
            </span>
            <span className="px-3 py-1 rounded-lg bg-[#00C853] border-2 border-black shadow-[2px_2px_0_#000]">
              AI-ASSISTED DEV
            </span>
          </div>
        </div>

        {/* Permitted AI Tools */}
        <div className="bg-white border-4 border-black rounded-2xl p-6 space-y-3 shadow-[6px_6px_0_#000]">
          <h4 className="text-xs font-heading font-black text-black uppercase tracking-wider flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-black" />
            <span>PERMITTED AI TOOLS DIRECTORY</span>
          </h4>
          <div className="text-xs text-black space-y-2.5 font-mono">
            <div className="bg-[#F4F4F0] p-2.5 rounded-xl border-2 border-black">
              <span className="bg-[#FFD600] px-2 py-0.5 rounded border border-black font-black uppercase mr-1.5">ROUND 1:</span>
              Midjourney, DALL-E, Ideogram, Imagen, Recraft, SDXL.
            </div>
            <div className="bg-[#F4F4F0] p-2.5 rounded-xl border-2 border-black">
              <span className="bg-[#00E5FF] px-2 py-0.5 rounded border border-black font-black uppercase mr-1.5">ROUND 2:</span>
              Claude, ChatGPT (GPT-4o), Google Gemini, DeepSeek.
            </div>
            <div className="bg-[#F4F4F0] p-2.5 rounded-xl border-2 border-black">
              <span className="bg-[#00C853] px-2 py-0.5 rounded border border-black font-black uppercase mr-1.5">ROUND 3:</span>
              Cursor, v0, Bolt.new, Lovable, GitHub Copilot.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
