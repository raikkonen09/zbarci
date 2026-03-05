import { useState, useCallback, useRef, useMemo } from "react";
import { Player, DiceData, GameStatus, GameEvent } from "../utils/types";

const rollDie = () => Math.floor(Math.random() * 6) + 1;

export const calculatePoints = (values: number[]): number => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    values.forEach((v) => counts[v]++);
    let total = 0;
    for (let i = 1; i <= 6; i++) {
        const count = counts[i];
        if (count >= 3) {
            const baseValue = i === 1 ? 10 : i;
            if (count === 3) total += baseValue * 10;
            else if (count === 4) total += baseValue * 20;
            else if (count === 5) total += baseValue * 40;
            else if (count === 6) total += baseValue * 80;
        } else {
            if (i === 1) total += count * 10;
            if (i === 5) total += count * 5;
        }
    }
    return total;
};

export const identifyScoringDice = (values: number[]): number[] => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    values.forEach((v) => counts[v]++);
    const scoringIndices: number[] = [];
    for (let i = 0; i < values.length; i++) {
        const val = values[i];
        if (counts[val] >= 3 || val === 1 || val === 5) {
            scoringIndices.push(i);
        }
    }
    return scoringIndices;
};

const THRESHOLDS = [
    { start: 0, end: 100 },
    { start: 200, end: 300 },
    { start: 800, end: 900 },
];

const GET_THRESHOLD = (score: number) => {
    return THRESHOLDS.find(t => score >= t.start && score <= t.end);
};

export function useZbarci() {
    const [players, setPlayers] = useState<Player[]>([
        { id: 1, name: "Bogdan", score: 0, color: "bg-blue-500" },
        { id: 2, name: "Raul", score: 0, color: "bg-red-500" },
        { id: 3, name: "Adrian", score: 0, color: "bg-green-500" },
        { id: 4, name: "Calin", score: 0, color: "bg-yellow-500" },
    ]);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [dice, setDice] = useState<DiceData[]>([]);
    const [currentRoundScore, setCurrentRoundScore] = useState(0);
    const [gameStatus, setGameStatus] = useState<GameStatus>("rolling");
    const [events, setEvents] = useState<GameEvent[]>([]);
    const [showZbarci, setShowZbarci] = useState<{ show: boolean, type: 'zbarci' | 'lost' | 'overstep' | 'win' | null }>({ show: false, type: null });

    const addEvent = (msg: string, type: GameEvent["type"] = "info") => {
        setEvents(prev => [{ id: Date.now().toString() + Math.random(), message: msg, type }, ...prev].slice(0, 5));
    };

    const currentPlayer = players[currentPlayerIndex];

    // Check if player started the turn in a threshold
    const startThreshold = GET_THRESHOLD(currentPlayer.score);

    // Can player save?
    // If they started in a threshold, they MUST reach or exceed the end of that threshold.
    // If they didn't start in a threshold, they can save anywhere (even if they land in one).
    const canSave = currentRoundScore > 0 &&
        (!startThreshold || (currentPlayer.score + currentRoundScore > startThreshold.end));

    const projection = useMemo(() => {
        if (currentRoundScore === 0) return { score: currentPlayer.score, overtakes: [] as string[] };

        const clonedPlayers = players.map(p => ({ ...p }));
        const pIndex = currentPlayerIndex;
        let p = clonedPlayers[pIndex];
        let pointsToAssignToP = currentRoundScore;

        let overtakes: string[] = [];

        p.score += pointsToAssignToP;

        const checkOvertook = () => {
            for (let i = 0; i < clonedPlayers.length; i++) {
                if (i === pIndex) continue;
                const victim = clonedPlayers[i];
                const victimThreshold = GET_THRESHOLD(victim.score);

                if (!victimThreshold && victim.score < 900) {
                    if (p.score - pointsToAssignToP < victim.score && p.score > victim.score) {
                        pointsToAssignToP = 50;
                        p.score += 50;
                        victim.score -= 50;
                        if (victim.score < 100) victim.score = 0;
                        overtakes.push(victim.name);
                        return true;
                    }
                }
            }
            return false;
        };

        while (checkOvertook()) { }

        return { score: p.score, overtakes };
    }, [players, currentPlayerIndex, currentRoundScore]);

    const rollDice = useCallback((isNewTurn: boolean = false) => {
        setGameStatus("rolling");
        let diceToRollCount = 6;
        let oldDice: DiceData[] = [];

        if (!isNewTurn) {
            const bankingDice = dice.filter(d => d.isLocked || d.scoredThisThrow);
            oldDice = bankingDice.map(d => ({ ...d, isLocked: true, scoredThisThrow: false }));

            diceToRollCount = 6 - oldDice.length;
            if (diceToRollCount === 0) {
                oldDice = []; // If all 6 were banked, we roll 6 fresh ones
                diceToRollCount = 6;
            }
        }

        const newDice: DiceData[] = Array.from({ length: diceToRollCount }).map((_, i) => ({
            id: `die-${Date.now()}-${i}`,
            value: rollDie(),
            isLocked: false,
            scoredThisThrow: false
        }));

        const newlyRolledValues = newDice.map(d => d.value);
        const roundPoints = calculatePoints(newlyRolledValues);

        let nextStatus: GameStatus = "scoring";

        if (roundPoints === 0) {
            // Zbarci or Lost
            if (diceToRollCount === 6) {
                setShowZbarci({ show: true, type: "zbarci" });
                addEvent(`${currentPlayer.name} rolled a ZBARCI!`, 'danger');
            } else {
                setShowZbarci({ show: true, type: "lost" });
                addEvent(`${currentPlayer.name} LOST points!`, 'danger');
            }
            nextStatus = "zbarci";
        } else {
            const scoringIndices = identifyScoringDice(newlyRolledValues);
            scoringIndices.forEach(idx => {
                newDice[idx].scoredThisThrow = true;
            });

            setCurrentRoundScore(prev => prev + roundPoints);

            // Check if finished
            if (currentPlayer.score + currentRoundScore + roundPoints === 1000) {
                addEvent(`${currentPlayer.name} HAS FINISHED!!!`, 'success');
                setShowZbarci({ show: true, type: "win" });
                nextStatus = "won";
            } else if (currentPlayer.score + currentRoundScore + roundPoints > 1000) {
                addEvent(`${currentPlayer.name} overstepped the finish line!`, 'danger');
                setShowZbarci({ show: true, type: "overstep" });
                nextStatus = "lost";
            }
        }

        setDice([...oldDice, ...newDice]);
        setGameStatus(nextStatus);

    }, [dice, currentPlayer, currentRoundScore]);

    // Recursive overtaking check based on original source
    const performOvertaking = (updatedPlayers: Player[], movingPlayerIdx: number, basePointsToAdd: number) => {
        const pIndex = movingPlayerIdx;
        let p = updatedPlayers[pIndex];

        let pointsToAssignToP = basePointsToAdd;
        // We will iteratively assign points and check if it overtakes anyone.
        // If it does, we subtract from victim, add to P (+overtakenPoints track), and repeat.

        let hasOvertaken = false;
        const initialScore = p.score;

        // First, add the round points
        p.score += pointsToAssignToP;

        // Overtaking loop
        const checkOvertook = () => {
            let overtookSomeone = false;
            for (let i = 0; i < updatedPlayers.length; i++) {
                if (i === pIndex) continue;
                const victim = updatedPlayers[i];

                // Only apply if victim is NOT in a threshold and not past 900
                const victimThreshold = GET_THRESHOLD(victim.score);

                if (!victimThreshold && victim.score < 900) {
                    // Check if `p` just jumped over `victim`
                    // Need to look at previous state vs new state. To keep it simple:
                    // We know p's score BEFORE this immediate addition was lower than victim.
                    // And now p's score is > victim's score.
                    if (p.score - pointsToAssignToP < victim.score && p.score > victim.score) {

                        // Hit!
                        addEvent(`${p.name} overtook ${victim.name}! +50pts`, 'overtake');

                        // Assign 50 to p, subtract 50 from victim
                        pointsToAssignToP = 50;
                        p.score += 50;
                        victim.score -= 50;

                        if (victim.score < 100) {
                            victim.score = 0;
                            addEvent(`${victim.name} fell back to start!`, 'danger');
                        }

                        overtookSomeone = true;
                        hasOvertaken = true;
                        return true; // Return true to trigger a re-eval
                    }
                }
            }
            return false;
        };

        // Ensure we resolve chains of overtakes (e.g. A gets +50, passes B, gets +50, passes C...)
        while (checkOvertook()) {
            // keep looping
        }

        return updatedPlayers;
    }

    const endTurn = useCallback(() => {
        setCurrentRoundScore(0);
        setDice([]);
        setGameStatus("rolling");
        setShowZbarci({ show: false, type: null });
        setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
    }, [players.length, setCurrentRoundScore, setDice, setGameStatus, setShowZbarci, setCurrentPlayerIndex]);

    const savePoints = useCallback(() => {
        if (!canSave) {
            addEvent("Cannot save when in Threshold!", "danger");
            return;
        }

        const totalAdded = projection.score - currentPlayer.score;

        setPlayers((prev) => {
            let newPlayers = [...prev.map(p => ({ ...p }))];
            newPlayers = performOvertaking(newPlayers, currentPlayerIndex, currentRoundScore);
            return newPlayers;
        });

        addEvent(`${currentPlayer.name} BANKED +${totalAdded} points!`, "success");

        endTurn();
    }, [currentPlayerIndex, currentRoundScore, canSave, currentPlayer.name, projection.score, currentPlayer.score, addEvent, endTurn, setPlayers]);

    const resetGame = () => {
        setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
        setCurrentPlayerIndex(0);
        setCurrentRoundScore(0);
        setDice([]);
        setGameStatus("rolling");
        setEvents([]);
        setShowZbarci({ show: false, type: null });
    }

    return {
        players,
        currentPlayer,
        dice,
        currentRoundScore,
        gameStatus,
        events,
        showZbarci,
        canSave,
        projection,
        rollDice,
        savePoints,
        endTurn,
        resetGame
    };
}
