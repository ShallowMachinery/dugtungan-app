import { Difficulty } from "../gameInit";

export interface Room {
    id: string;
    ownerName: string;
    playerCount: number;
    difficulty: Difficulty;
    isActive: boolean;
}