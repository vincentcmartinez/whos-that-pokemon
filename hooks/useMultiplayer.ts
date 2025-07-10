import { useCallback, useEffect, useRef, useState } from 'react';

const SERVER_URL = 'https://5bf8302d05f4.ngrok-free.app';

export type Player = {
    id: string;
    name: string;
    score: number;
    livesRemaining: number;
    roundsCompleted: number;
    isHost: boolean;
    finished?: boolean;
    finalScore?: number;
};

export type Party = {
    code: string;
    status: 'waiting' | 'playing' | 'finished';
    players: Player[];
    pokemonList: any[];
    gameStartTime: number | null;
    gameResult?: {
        winner: Player | null;
        tiedPlayers: Player[] | null;
    } | null;
};

export type MultiplayerState = {
    partyCode: string | null;
    playerId: string | null;
    party: Party | null;
    isHost: boolean;
    isConnected: boolean;
    error: string | null;
    loading: boolean;
};

// Global state to persist across screen navigation
let globalState: MultiplayerState = {
    partyCode: null,
    playerId: null,
    party: null,
    isHost: false,
    isConnected: false,
    error: null,
    loading: false
};

let globalPollingInterval: ReturnType<typeof setInterval> | null = null;

export const useMultiplayer = () => {
    const [state, setState] = useState<MultiplayerState>(globalState);

    // Sync local state with global state
    useEffect(() => {
        setState(globalState);
    }, []);

    // Update global state whenever local state changes
    useEffect(() => {
        globalState = state;
    }, [state]);

    useEffect(() => {
        return () => {
            if (globalPollingInterval) {
                clearInterval(globalPollingInterval);
            }
        };
    }, []);

    const startPolling = useCallback((partyCode: string) => {
        if (globalPollingInterval) {
            clearInterval(globalPollingInterval);
        }

        globalPollingInterval = setInterval(async () => {
            try {
                const response = await fetch(`${SERVER_URL}/api/parties/${partyCode}/status`);
                if (response.ok) {
                                    const data = await response.json();
                setState(prev => ({
                    ...prev,
                    party: {
                        code: partyCode,
                        status: data.status,
                        players: data.players,
                        pokemonList: prev.party?.pokemonList || [],
                        gameStartTime: data.gameStartTime,
                        gameResult: data.gameResult || prev.party?.gameResult || null
                    }
                }));
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 2000);
    }, []);

    const stopPolling = useCallback(() => {
        if (globalPollingInterval) {
            clearInterval(globalPollingInterval);
            globalPollingInterval = null;
        }
    }, []);

    const createParty = useCallback(async (playerName: string) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const response = await fetch(`${SERVER_URL}/api/parties`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ playerName }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create party');
            }

            const data = await response.json();
            
            setState(prev => ({
                ...prev,
                partyCode: data.partyCode,
                playerId: data.playerId,
                party: {
                    code: data.partyCode,
                    status: 'waiting',
                    players: data.players,
                    pokemonList: data.pokemonList,
                    gameStartTime: null
                },
                isHost: true,
                isConnected: true,
                loading: false
            }));

            startPolling(data.partyCode);
            return data;
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to create party',
                loading: false
            }));
            throw error;
        }
    }, [startPolling]);

    const joinParty = useCallback(async (partyCode: string, playerName: string) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const response = await fetch(`${SERVER_URL}/api/parties/${partyCode}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ playerName }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to join party');
            }

            const data = await response.json();
            
            setState(prev => ({
                ...prev,
                partyCode: data.partyCode,
                playerId: data.playerId,
                party: {
                    code: data.partyCode,
                    status: 'waiting',
                    players: data.players,
                    pokemonList: data.pokemonList,
                    gameStartTime: null
                },
                isHost: false,
                isConnected: true,
                loading: false
            }));

            startPolling(data.partyCode);
            return data;
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to join party',
                loading: false
            }));
            throw error;
        }
    }, [startPolling]);

    const startGame = useCallback(async () => {
        if (!state.partyCode || !state.playerId) {
            throw new Error('Not connected to a party');
        }

        try {
            const response = await fetch(`${SERVER_URL}/api/parties/${state.partyCode}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ playerId: state.playerId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start game');
            }

            const data = await response.json();
            
            setState(prev => ({
                ...prev,
                party: prev.party ? {
                    ...prev.party,
                    status: 'playing',
                    gameStartTime: data.gameStartTime,
                    players: data.players
                } : null
            }));

            return data;
        } catch (error) {
            console.error('Failed to start game:', error);
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to start game'
            }));
            throw error;
        }
    }, [state.partyCode, state.playerId]);

    const updateScore = useCallback(async (score: number, livesRemaining: number, roundsCompleted: number) => {
        if (!state.partyCode || !state.playerId) {
            throw new Error('Not connected to a party');
        }

        try {
            const response = await fetch(`${SERVER_URL}/api/parties/${state.partyCode}/score`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerId: state.playerId,
                    score,
                    livesRemaining,
                    roundsCompleted
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update score');
            }

            const data = await response.json();
            
            setState(prev => ({
                ...prev,
                party: prev.party ? {
                    ...prev.party,
                    players: data.players
                } : null
            }));

            return data;
        } catch (error) {
            console.error('Failed to update score:', error);
            throw error;
        }
    }, [state.partyCode, state.playerId]);

    const finishGame = useCallback(async (finalScore: number, livesRemaining: number, roundsCompleted: number) => {
        if (!state.partyCode || !state.playerId) {
            throw new Error('Not connected to a party');
        }

        try {
            const response = await fetch(`${SERVER_URL}/api/parties/${state.partyCode}/finish`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerId: state.playerId,
                    finalScore,
                    livesRemaining,
                    roundsCompleted
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to finish game');
            }

            const data = await response.json();
            
            setState(prev => ({
                ...prev,
                party: prev.party ? {
                    ...prev.party,
                    players: data.players,
                    gameResult: data.allFinished ? {
                        winner: data.winner,
                        tiedPlayers: data.tiedPlayers
                    } : null
                } : null
            }));

            return data;
        } catch (error) {
            console.error('Failed to finish game:', error);
            throw error;
        }
    }, [state.partyCode, state.playerId]);

    const endParty = useCallback(async () => {
        if (!state.partyCode || !state.playerId) {
            throw new Error('Not connected to a party');
        }

        try {
            const response = await fetch(`${SERVER_URL}/api/parties/${state.partyCode}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ playerId: state.playerId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to end party');
            }

            const data = await response.json();
            
            stopPolling();
            const clearedState = {
                partyCode: null,
                playerId: null,
                party: null,
                isHost: false,
                isConnected: false,
                error: null,
                loading: false
            };
            setState(clearedState);
            // Also clear global state
            globalState = clearedState;

            return data;
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to end party'
            }));
            throw error;
        }
    }, [state.partyCode, state.playerId, stopPolling]);

    const leaveParty = useCallback(() => {
        stopPolling();
        const clearedState = {
            partyCode: null,
            playerId: null,
            party: null,
            isHost: false,
            isConnected: false,
            error: null,
            loading: false
        };
        setState(clearedState);
        // Also clear global state
        globalState = clearedState;
    }, [stopPolling]);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    return {
        ...state,
        createParty,
        joinParty,
        startGame,
        updateScore,
        finishGame,
        endParty,
        leaveParty,
        clearError
    };
}; 