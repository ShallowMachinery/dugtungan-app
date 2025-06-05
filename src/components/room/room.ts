export interface Room {
  id: string;
  ownerName: string;
  playerCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  isActive: boolean;
} 