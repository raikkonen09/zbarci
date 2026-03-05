"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performOvertaking = exports.GET_THRESHOLD = exports.THRESHOLDS = exports.identifyScoringDice = exports.calculatePoints = void 0;
const rollDie = () => Math.floor(Math.random() * 6) + 1;
const calculatePoints = (values) => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    values.forEach((v) => counts[v]++);
    let total = 0;
    for (let i = 1; i <= 6; i++) {
        let count = counts[i];
        if (count >= 3) {
            let baseValue = i === 1 ? 10 : i;
            if (count === 3)
                total += baseValue * 10;
            else if (count === 4)
                total += baseValue * 20;
            else if (count === 5)
                total += baseValue * 40;
            else if (count === 6)
                total += baseValue * 80;
        }
        else {
            if (i === 1)
                total += count * 10;
            if (i === 5)
                total += count * 5;
        }
    }
    return total;
};
exports.calculatePoints = calculatePoints;
const identifyScoringDice = (values) => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    values.forEach((v) => counts[v]++);
    const scoringIndices = [];
    for (let i = 0; i < values.length; i++) {
        let val = values[i];
        if (counts[val] >= 3 || val === 1 || val === 5) {
            scoringIndices.push(i);
        }
    }
    return scoringIndices;
};
exports.identifyScoringDice = identifyScoringDice;
exports.THRESHOLDS = [
    { start: 0, end: 100 },
    { start: 200, end: 300 },
    { start: 800, end: 900 },
];
const GET_THRESHOLD = (score) => {
    return exports.THRESHOLDS.find(t => score >= t.start && score <= t.end);
};
exports.GET_THRESHOLD = GET_THRESHOLD;
const performOvertaking = (updatedPlayers, movingPlayerIdx, basePointsToAdd, addEvent) => {
    let p = updatedPlayers[movingPlayerIdx];
    let pointsToAssignToP = basePointsToAdd;
    p.score += pointsToAssignToP;
    const checkOvertook = () => {
        for (let i = 0; i < updatedPlayers.length; i++) {
            if (i === movingPlayerIdx)
                continue;
            let victim = updatedPlayers[i];
            let victimThreshold = (0, exports.GET_THRESHOLD)(victim.score);
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
exports.performOvertaking = performOvertaking;
