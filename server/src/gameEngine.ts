import { GameState, Player, DiceData, GameEvent } from "./types";

const rollDie = () => Math.floor(Math.random() * 6) + 1;

export const calculatePoints = (values: number[]): number => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    values.forEach((v) => counts[v]++);
    let total = 0;
    for (let i = 1; i <= 6; i++) {
        let count = counts[i];
        if (count >= 3) {
            let baseValue = i === 1 ? 10 : i;
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
        let val = values[i];
        if (counts[val] >= 3 || val === 1 || val === 5) {
            scoringIndices.push(i);
        }
    }
    return scoringIndices;
};

export const THRESHOLDS = [
    { start: 0, end: 100 },
    { start: 200, end: 300 },
    { start: 800, end: 900 },
];

export const GET_THRESHOLD = (score: number) => {
    return THRESHOLDS.find(t => score >= t.start && score <= t.end);
};

export const performOvertaking = (updatedPlayers: Player[], movingPlayerIdx: number, basePointsToAdd: number, addEvent: (msg: string, type: GameEvent["type"]) => void) => {
    let p = updatedPlayers[movingPlayerIdx];
    let pointsToAssignToP = basePointsToAdd;

    p.score += pointsToAssignToP;

    const checkOvertook = () => {
        for (let i = 0; i < updatedPlayers.length; i++) {
            if (i === movingPlayerIdx) continue;
            let victim = updatedPlayers[i];
            let victimThreshold = GET_THRESHOLD(victim.score);

            if (!victimThreshold && victim.score < 900) {
                if (p.score - pointsToAssignToP < victim.score && p.score > victim.score) {
                    addEvent(`${p.name} overtook ${victim.name}! +50pts`, 'overtake');
                    pointsToAssignToP = 50;
                    p.score += 50;
                    victim.score -= 50;
                    if (victim.score < 100) {
                        victim.score = 0;
                        addEvent(`${victim.name} fell back to start!`, 'danger');
                    }
                    return true;
                }
            }
        }
        return false;
    };

    while (checkOvertook()) { }

    return updatedPlayers;
};
