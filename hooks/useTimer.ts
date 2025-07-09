import { useRef, useState } from 'react';

export const useTimer = (duration=30, onExpire?: () => void) => {
    const [time, setTime] = useState(duration);
    const intervalRef = useRef(0);

    const startTimer = () => {
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
        clearInterval(intervalRef.current);
        intervalRef.current = 0;
    }

    const resetTimer = () => {
        setTime(duration);
    }

    return{
        time,
        startTimer,
        stopTimer,
        resetTimer,
    }
};