export interface Player {
    id: string;
    name: string;
    score: number;
    isInGame?: boolean;
    isOwner?: boolean;
    currentRoomId?: string;
  }