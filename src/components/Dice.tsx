"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { DiceData } from "@/utils/types";

// Helper object mapping 1-6 to their png filenames
const diceImages: Record<number, string> = {
    1: "/diceOne.jpeg",
    2: "/diceTwo.PNG",
    3: "/diceThree.PNG",
    4: "/diceFour.PNG",
    5: "/diceFive.jpeg",
    6: "/diceSix.PNG",
};

interface DiceProps {
    data: DiceData;
}

export function Dice({ data }: DiceProps) {
    // Generate random stable rotation and initial throw vectors for organic feel
    const randomRotation = (Math.random() - 0.5) * 45; // slight tilt when resting
    const startRotation = Math.random() > 0.5 ? 720 : -720;
    const startY = -100 - Math.random() * 50;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.2, rotate: startRotation, y: startY }}
            animate={{ opacity: 1, scale: 1, rotate: data.isLocked ? 0 : randomRotation, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 180 }}
            transition={{
                type: "spring",
                stiffness: 150,
                damping: 12,
                mass: 0.8
            }}
            className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center shrink-0
        ${(data.isLocked || data.scoredThisThrow) ? "ring-4 ring-emerald-400 bg-emerald-900/40 shadow-[0_0_20px_rgba(52,211,153,0.5)]" : "glass-panel"}
      `}
        >
            <Image
                src={diceImages[data.value]}
                alt={`Dice ${data.value}`}
                width={100}
                height={100}
                priority
                className={`w-[85%] h-[85%] object-contain ${data.isLocked ? "opacity-90" : "opacity-100"}`}
            />
            {data.scoredThisThrow && (
                <motion.div
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{ opacity: [0, 1, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-2xl ring-4 ring-emerald-300 pointer-events-none"
                />
            )}
        </motion.div>
    );
}
