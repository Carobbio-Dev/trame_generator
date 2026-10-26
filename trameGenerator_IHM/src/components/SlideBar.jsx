import { useEffect, useState } from "react";

export default function SlideBar(
    {onSave,
    settable}
) {
    const [period, setPeriod] = useState(1000);
    const [disabled, setDisabled] = useState(false);


    function add100ms(){
        var tmp = period;
        if(tmp < 9990)
            modificationValue(tmp + 100);
        if(tmp > 10000)
            modificationValue(10000);
    }
    function add1000ms(){
        var tmp = period;
        if (tmp < 10000)
            modificationValue(tmp + 1000);
        if(tmp > 10000)
            modificationValue(10000);
    }
    function minus100ms(){
        var tmp = period;
        if(tmp > 100)
            modificationValue(tmp - 100);
        if(tmp < 10)
            modificationValue(10);
    }
    function minus1000ms(){
        var tmp = period;
        if(tmp > 1000)
            modificationValue(tmp - 1000);
        if(tmp < 10)
            modificationValue(10);
    }
    function modificationValue(value){
        setPeriod(value);
        onSave(value);
    }

    useEffect(() => {
        if(settable === 1)
            setDisabled(true);
        else{
            setDisabled(false);
        }
    }, [settable])

    const titleText = disabled ? "Arrêtez l'émetteur pour modifier la période" : "Entrez la période d'émission (ms)";

    return(
            <div className={`w-full h-22 text-center flex flex-col p-2 rounded transition-colors duration-300`}>
                    <h1 className="m-2 font-bold underline">Période d&apos;émission (ms):</h1>
                    <div className="flex flex-row gap-1">
                        <button className={`h-8 px-2 rounded border transition-colors duration-300 ${disabled ? "bg-gray-200 dark:bg-gray-700 text-gray-500 border-gray-300 dark:border-gray-600 cursor-not-allowed" : "bg-gray-200 hover:bg-gray-300 border-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 text-black dark:text-white cursor-pointer"}`} disabled={disabled} title={titleText} onClick={() => minus1000ms()}><i className={`fas fa-angles-left`}></i></button>
                        <button className={`h-8 px-2 rounded border transition-colors duration-300 ${disabled ? "bg-gray-200 dark:bg-gray-700 text-gray-500 border-gray-300 dark:border-gray-600 cursor-not-allowed" : "bg-gray-200 hover:bg-gray-300 border-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 text-black dark:text-white cursor-pointer"}`} disabled={disabled} title={titleText} onClick={() => minus100ms()}><i className={`fas fa-chevron-left`}></i></button>
                        <input type="number"
                            value={period}
                            onChange={(e) => modificationValue(Number(e.target.value))}
                            min={10}
                            max={10_000}
                            step={10}
                            disabled={disabled}
                            title={titleText}
                            className={`w-full text-xl font-semibold border rounded text-center transition-colors duration-300 ${
                                disabled
                                  ? "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed border-gray-300 dark:border-gray-600"
                                  : "bg-white dark:bg-gray-800 text-black dark:text-white border-gray-400 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              }`}/>
                        <button className={`h-8 px-2 rounded border transition-colors duration-300 ${disabled ? "bg-gray-200 dark:bg-gray-700 text-gray-500 border-gray-300 dark:border-gray-600 cursor-not-allowed" : "bg-gray-200 hover:bg-gray-300 border-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 text-black dark:text-white cursor-pointer"}`} disabled={disabled} title={titleText} onClick={() => add100ms()}><i className={`fas fa-chevron-right`}></i></button>
                        <button className={`h-8 px-2 rounded border transition-colors duration-300 ${disabled ? "bg-gray-200 dark:bg-gray-700 text-gray-500 border-gray-300 dark:border-gray-600 cursor-not-allowed" : "bg-gray-200 hover:bg-gray-300 border-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 text-black dark:text-white cursor-pointer"}`} disabled={disabled} title={titleText} onClick={() => add1000ms()}><i className={`fas fa-angles-right`}></i></button>
                    </div>
                    
            </div>
    );
}