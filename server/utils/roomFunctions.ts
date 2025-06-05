import { GameRoom, promptDifficulty } from "../gameInit";

export function generateNewSyllable(room: GameRoom) {
    const difficulty = room.difficulty;
    let availableSyllables: string[] = [];
    
    // Weighted distribution based on difficulty
    if (difficulty === 'easy') {
        availableSyllables = [...promptDifficulty.easy];
    } else if (difficulty === 'medium') {
        const easyCount = Math.floor(promptDifficulty.easy.length * 0.7);
        const mediumCount = Math.floor(promptDifficulty.medium.length * 0.3);
        
        // Randomly select syllables from each difficulty
        const selectedEasy = promptDifficulty.easy
            .sort(() => Math.random() - 0.5)
            .slice(0, easyCount);
        const selectedMedium = promptDifficulty.medium
            .sort(() => Math.random() - 0.5)
            .slice(0, mediumCount);
            
        availableSyllables = [...selectedEasy, ...selectedMedium];
    } else if (difficulty === 'hard') {
        const easyCount = Math.floor(promptDifficulty.easy.length * 0.6);
        const mediumCount = Math.floor(promptDifficulty.medium.length * 0.35);
        const hardCount = Math.floor(promptDifficulty.hard.length * 0.05);
        
        // Randomly select syllables from each difficulty
        const selectedEasy = promptDifficulty.easy
            .sort(() => Math.random() - 0.5)
            .slice(0, easyCount);
        const selectedMedium = promptDifficulty.medium
            .sort(() => Math.random() - 0.5)
            .slice(0, mediumCount);
        const selectedHard = promptDifficulty.hard
            .sort(() => Math.random() - 0.5)
            .slice(0, hardCount);
            
        availableSyllables = [...selectedEasy, ...selectedMedium, ...selectedHard];
    }
    
    const randomIndex = Math.floor(Math.random() * availableSyllables.length);
    room.currentSyllable = availableSyllables[randomIndex];
}