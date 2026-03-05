"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Play, Info, Layers, Zap, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { RulesModal } from "@/components/RulesModal";

export default function LandingPage() {
  const [showRules, setShowRules] = useState(false);

  return (
    <main className="min-h-screen bg-transparent relative overflow-hidden flex flex-col font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="w-full p-6 flex justify-between items-center z-10 glass border-b border-slate-800 backdrop-blur-md">
        <div className="text-2xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">
          ZBARCI
        </div>
        <button
          onClick={() => setShowRules(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full glass hover:bg-white/10 transition-colors text-white text-sm font-semibold tracking-wider"
        >
          <Info size={16} className="text-blue-400" />
          View Rules
        </button>
      </header>

      {/* Hero Section */}
      <section className="flex-grow flex flex-col items-center justify-center text-center p-6 z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl"
        >
          <h1 className="text-7xl md:text-9xl font-black italic tracking-tighter text-white mb-6 drop-shadow-[0_0_30px_rgba(59,130,246,0.6)]">
            ZBARCI
          </h1>
          <p className="text-2xl md:text-3xl text-slate-300 font-light mb-12 tracking-wide uppercase">
            The Ultimate <span className="text-blue-400 font-bold">1000m</span> Athletics Dice Race
          </p>

          <Link href="/play">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-12 py-6 rounded-full bg-blue-600 hover:bg-blue-500 font-black text-2xl uppercase tracking-widest shadow-[0_0_40px_rgba(59,130,246,0.6)] text-white flex items-center gap-4 mx-auto border border-blue-400/50"
            >
              <Play size={28} fill="currentColor" />
              PLAY NOW
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 p-8 z-10 mb-12">

        <div className="glass-panel p-8 rounded-3xl ring-1 ring-blue-500/30 group hover:bg-blue-900/20 transition-colors">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
            <Layers size={32} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3 tracking-wide">1000m Track</h3>
          <p className="text-slate-400 leading-relaxed">
            Navigate the interactive athletics track. First player to land on exactly 1000 points takes the gold.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-3xl ring-1 ring-amber-500/30 group hover:bg-amber-900/20 transition-colors">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
            <Zap size={32} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3 tracking-wide">Overtaking +50/-50</h3>
          <p className="text-slate-400 leading-relaxed">
            Leapfrog your opponents to steal 50 points directly from their score. Trigger massive chain reactions!
          </p>
        </div>

        <div className="glass-panel p-8 rounded-3xl ring-1 ring-red-500/30 group hover:bg-red-900/20 transition-colors">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 mb-6 group-hover:scale-110 transition-transform">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3 tracking-wide">Danger Zones</h3>
          <p className="text-slate-400 leading-relaxed">
            Beware the red hurdles. You cannot stop your turn while in a danger zone—roll again and risk a Zbarci!
          </p>
        </div>

      </section>

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </main>
  );
}
