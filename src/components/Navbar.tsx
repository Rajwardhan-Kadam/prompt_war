import React, { useState, useEffect } from 'react';
import {
  Trophy,
  UploadCloud,
  ShieldCheck,
  Cpu,
  BookOpen,
  Volume2,
  VolumeX,
  Zap,
  User,
  Lock,
  LogOut,
  FileCheck,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { sound } from '../utils/audio';
import { api } from '../services/api';
import { EventState, RoundNumber, ParticipantUser } from '../types';

interface NavbarProps {
  currentTab: 'portal' | 'my-submissions' | 'leaderboard' | 'admin' | 'inspector' | 'rules';
  setCurrentTab: (tab: 'portal' | 'my-submissions' | 'leaderboard' | 'admin' | 'inspector' | 'rules') => void;
  eventState: EventState;
  onUpdateEventState: (updates: Partial<EventState>) => void;
  isAdmin: boolean;
  setIsAdmin: (val: boolean) => void;
  onOpenAdminPinModal: () => void;
  currentUser: ParticipantUser | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  eventState,
  onUpdateEventState,
  isAdmin,
  setIsAdmin,
  onOpenAdminPinModal,
  currentUser,
  onLogout
}) => {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Close mobile drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsProfileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent background scroll when mobile menu drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    sound.enabled = next;
    if (next) sound.playBeep(800, 0.05);
  };

  const handleAdminToggle = async () => {
    if (isAdmin) {
      setIsAdmin(false);
      try {
        await api.adminLogout();
      } catch {}
      sound.playBeep(400, 0.08);
      setCurrentTab('portal');
    } else {
      onOpenAdminPinModal();
    }
  };

  const handleTabClick = (tabId: 'portal' | 'my-submissions' | 'leaderboard' | 'admin' | 'inspector' | 'rules') => {
    if ((tabId === 'admin' || tabId === 'inspector') && !isAdmin) {
      sound.playBeep(600, 0.05);
      onOpenAdminPinModal();
      setIsMobileMenuOpen(false);
      setIsProfileMenuOpen(false);
      return;
    }

    setCurrentTab(tabId);
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
    sound.playBeep(700, 0.04);
  };

  // Main Participant Navigation Items
  const mainNavItems = [
    {
      id: 'portal' as const,
      label: 'Submit',
      icon: UploadCloud,
      badge: null
    },
    {
      id: 'my-submissions' as const,
      label: 'My Submissions',
      icon: FileCheck,
      badge: null
    },
    {
      id: 'leaderboard' as const,
      label: 'Leaderboard',
      icon: Trophy,
      badge: !eventState.isLeaderboardPublished && !isAdmin ? 'EMBARGO' : null
    },
    {
      id: 'rules' as const,
      label: 'Rules',
      icon: BookOpen,
      badge: null
    }
  ];

  // Admin / Referee Tools
  const adminNavItems = [
    {
      id: 'admin' as const,
      label: 'Referee Console',
      icon: ShieldCheck,
      isRestricted: !isAdmin
    },
    {
      id: 'inspector' as const,
      label: 'ML Forensics',
      icon: Cpu,
      isRestricted: !isAdmin
    }
  ];

  return (
    <>
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b-4 border-black">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* BRAND LOGO */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={() => { setCurrentTab('portal'); sound.playBeep(600, 0.03); }}
                className="flex items-center space-x-2 text-left focus:outline-none group cursor-pointer"
              >
                <div className="w-9 h-9 sm:w-11 sm:h-11 bg-[#FFD600] border-3 border-black flex items-center justify-center shadow-[3px_3px_0_#000] group-hover:translate-x-[-1px] group-hover:translate-y-[-1px] group-hover:shadow-[5px_5px_0_#000] transition-all">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-black fill-black" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-heading text-base sm:text-xl font-black tracking-tight text-black uppercase leading-none">
                      PROMPT WARS
                    </span>
                    <span className="text-[10px] sm:text-xs font-mono font-black px-1.5 py-0.5 bg-[#FF4081] text-white border-2 border-black shadow-[1px_1px_0_#000]">
                      R0{eventState.activeRound}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest hidden md:block">
                    2026 Arena Edition
                  </span>
                </div>
              </button>
            </div>

            {/* DESKTOP NAVIGATION TABS (Visible on lg screens and up) */}
            <nav className="hidden lg:flex items-center space-x-2">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-mono font-extrabold uppercase tracking-wider border-2 border-black transition-all cursor-pointer relative ${
                      isActive
                        ? 'bg-black text-white shadow-[3px_3px_0_#000] translate-x-[1px] translate-y-[1px]'
                        : 'bg-white text-black hover:bg-[#FFD600] shadow-[3px_3px_0_#000] hover:translate-x-[-1px] hover:translate-y-[-1px]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] bg-[#FF4081] text-white px-1.5 py-0.2 border border-black font-black">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Display Admin Tabs on Desktop Header ONLY if Admin is Active */}
              {isAdmin && adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 sm:py-2 text-xs font-mono font-extrabold uppercase tracking-wider border-2 border-black transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#00C853] text-black shadow-[3px_3px_0_#000]'
                        : 'bg-[#00E5FF] text-black shadow-[3px_3px_0_#000] hover:bg-[#FFD600]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-black" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* DESKTOP CONTROLS & PROFILE (Visible on lg screens and up) */}
            <div className="hidden lg:flex items-center space-x-2 sm:space-x-3">
              
              {/* Sound FX Toggle */}
              <button
                onClick={toggleAudio}
                title={audioEnabled ? 'Sound FX Enabled' : 'Sound FX Muted'}
                className="p-2 bg-white border-2 border-black shadow-[3px_3px_0_#000] hover:bg-[#FFD600] transition-all cursor-pointer"
              >
                {audioEnabled ? <Volume2 className="w-4 h-4 text-black" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
              </button>

              {/* Judge / Referee Authorization Button */}
              <button
                onClick={handleAdminToggle}
                className={`flex items-center space-x-1.5 px-3 py-1.5 sm:py-2 text-xs font-mono font-black border-2 border-black shadow-[3px_3px_0_#000] transition-all cursor-pointer ${
                  isAdmin
                    ? 'bg-[#00C853] text-black'
                    : 'bg-white text-black hover:bg-[#00E5FF]'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isAdmin ? 'JUDGE ACTIVE' : 'JUDGE PIN'}</span>
              </button>

              {/* Participant Profile Dropdown */}
              {currentUser && (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center space-x-2 bg-[#FFD600] border-2 border-black px-3 py-1.5 shadow-[3px_3px_0_#000] hover:bg-yellow-300 cursor-pointer font-mono text-xs font-black text-black"
                  >
                    <User className="w-4 h-4 text-black" />
                    <span className="truncate max-w-[110px]">{currentUser.name}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white border-4 border-black shadow-[8px_8px_0_#000] p-4 z-50 font-mono text-xs space-y-3">
                      <div className="border-b-2 border-black pb-2">
                        <span className="text-[10px] text-gray-500 font-bold uppercase block">Authenticated Participant</span>
                        <p className="font-black text-sm text-black truncate">{currentUser.name}</p>
                        <p className="text-xs text-gray-700 font-bold">{currentUser.registrationId}</p>
                        <p className="text-[11px] text-gray-500 truncate">{currentUser.email}</p>
                      </div>

                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleTabClick('my-submissions');
                        }}
                        className="w-full text-left font-bold py-1.5 px-2 hover:bg-[#FFD600] border border-black flex items-center justify-between cursor-pointer"
                      >
                        <span>View My Submissions</span>
                        <FileCheck className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full bg-[#FF4081] text-white font-black py-2 px-3 border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-center space-x-2 hover:bg-red-600 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>LOGOUT</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* MOBILE & TABLET HEADER CONTROLS (Visible below lg screens) */}
            <div className="flex items-center space-x-2 lg:hidden">
              
              {/* Hamburger Drawer Toggle Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 bg-[#FFD600] text-black border-2 border-black shadow-[3px_3px_0_#000] font-black cursor-pointer hover:bg-yellow-300 active:translate-x-0.5 active:translate-y-0.5 transition-all"
                aria-label="Toggle Navigation Drawer"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* FULL-SCREEN MOBILE NAVIGATION DRAWER OVERLAY (z-[100]) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex justify-end lg:hidden">
          
          {/* Backdrop Click Handler */}
          <div
            className="absolute inset-0"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sliding Right Drawer Container */}
          <div className="relative w-full max-w-xs sm:max-w-sm bg-white h-full border-l-4 border-black flex flex-col p-5 space-y-5 overflow-y-auto shadow-[-10px_0_0_#000] z-10">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b-4 border-black pb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#FFD600] border-2 border-black flex items-center justify-center shadow-[2px_2px_0_#000]">
                  <Zap className="w-5 h-5 text-black fill-black" />
                </div>
                <span className="font-heading font-black text-lg uppercase tracking-tight text-black">
                  ARENA MENU
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 bg-[#FF4081] text-white border-2 border-black shadow-[2px_2px_0_#000] hover:bg-red-600 cursor-pointer"
                aria-label="Close Mobile Navigation Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Authenticated Participant Card */}
            {currentUser && (
              <div className="bg-[#FFD600] border-3 border-black p-4 font-mono text-xs space-y-2.5 shadow-[4px_4px_0_#000]">
                <div className="flex items-center justify-between border-b-2 border-black pb-2">
                  <span className="font-black text-sm text-black truncate uppercase">{currentUser.name}</span>
                  <span className="bg-black text-white px-2 py-0.5 text-[10px] font-bold">
                    {currentUser.registrationId}
                  </span>
                </div>
                <p className="text-gray-900 font-bold text-xs truncate">{currentUser.email}</p>
                {currentUser.college && (
                  <p className="text-gray-800 text-[11px] truncate font-medium">📍 {currentUser.college}</p>
                )}
                
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full mt-2 bg-[#FF4081] text-white font-black py-2 px-3 border-2 border-black flex items-center justify-center space-x-2 shadow-[2px_2px_0_#000] hover:bg-red-600 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>LOGOUT PARTICIPANT</span>
                </button>
              </div>
            )}

            {/* Main Participant Navigation Links */}
            <div className="space-y-2 font-mono">
              <span className="text-[11px] font-black uppercase text-gray-500 tracking-wider block">
                MAIN EVENT NAVIGATION
              </span>
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center justify-between p-3 border-3 border-black text-xs sm:text-sm font-black uppercase tracking-wider shadow-[3px_3px_0_#000] cursor-pointer transition-all ${
                      isActive
                        ? 'bg-black text-white translate-x-[1px] translate-y-[1px]'
                        : 'bg-white text-black hover:bg-[#FFD600]'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] bg-[#FF4081] text-white px-2 py-0.5 border border-black font-black">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Referee & Admin Tools */}
            <div className="space-y-2 font-mono border-t-3 border-black pt-4">
              <span className="text-[11px] font-black uppercase text-gray-500 tracking-wider block">
                REFEREE & JUDGING TOOLS
              </span>
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center justify-between p-3 border-3 border-black text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_#000] cursor-pointer transition-all ${
                      isActive
                        ? 'bg-[#00C853] text-black'
                        : isAdmin
                        ? 'bg-[#00E5FF] text-black hover:bg-cyan-300'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      {item.isRestricted ? <Lock className="w-4 h-4 text-[#FF4081]" /> : <Icon className="w-4 h-4" />}
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[10px] bg-black text-white px-2 py-0.5 font-bold">
                      {isAdmin ? 'UNLOCKED' : 'PIN REQ'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Drawer Quick Controls Footer */}
            <div className="mt-auto pt-4 border-t-3 border-black flex items-center justify-between gap-2">
              <button
                onClick={toggleAudio}
                className="flex items-center space-x-2 font-mono text-xs font-black bg-white p-2.5 border-2 border-black shadow-[2px_2px_0_#000] hover:bg-[#FFD600] cursor-pointer"
              >
                {audioEnabled ? <Volume2 className="w-4 h-4 text-black" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
                <span>{audioEnabled ? 'SOUND ON' : 'MUTED'}</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleAdminToggle();
                }}
                className={`font-mono text-xs font-black px-3.5 py-2.5 border-2 border-black shadow-[2px_2px_0_#000] cursor-pointer ${
                  isAdmin ? 'bg-[#00C853] text-black' : 'bg-[#00E5FF] text-black hover:bg-cyan-300'
                }`}
              >
                {isAdmin ? 'JUDGE ACTIVE' : 'JUDGE PIN'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
