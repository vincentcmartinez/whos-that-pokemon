import { useRef, useState, useEffect } from 'react';

export const useTimer = (duration=30, onExpire?: () => void) => {
    const [time, setTime] = useState(duration);
    const intervalRef = useRef<number | null>(null);

    const startTimer = () => {
        // Clear any existing interval first
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        
        intervalRef.current = setInterval(() => {
            setTime((prev) => {
                if (prev <= 1){
                    onExpire?.();
                    return 0;
                }else{
                    return prev - 1;
                }
            });
        }, 1000);
    }

    const stopTimer = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }

    const resetTimer = () => {
        setTime(duration);
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return{
        time,
        startTimer,
        stopTimer,
        resetTimer,
    }
};