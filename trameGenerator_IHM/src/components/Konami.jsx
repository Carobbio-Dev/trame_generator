import { useEffect, useState } from "react";

const konamiCode = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
    "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "KeyB", "KeyQ",];

const useInputEvent = () => {
    const [key, setKey] = useState(null);
    useEffect(() => {
        const keyDownHandler = ({code}) => setKey(code);
        const keyUpHandler = () => setKey(null);
        globalThis.addEventListener('keydown', keyDownHandler);
        globalThis.addEventListener('keyup', keyUpHandler);
        return () => {
            globalThis.removeEventListener("keydown", keyDownHandler);
            globalThis.removeEventListener("keyup", keyUpHandler);
        }
    }, []);
    return key;
}

export const Konami = ({children}) => {
    const key = useInputEvent();
    const [count, setCount] = useState(0);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if(key==null) return;

        if(key!== konamiCode[count]){
            setCount(0);
            return;
        }
        setCount((state) => state + 1);

        if(count +1 === konamiCode.length){
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
            }, 5000);
        }
    }, [key]);

    return( <div>
        <div hidden={!success} className="modal">
            <div className="modal-container">
                <img  src="/assets/images/divers/easter_egg.png" alt="Konami Code!"></img>
            </div>
        </div>
        {children}
    </div>)
}