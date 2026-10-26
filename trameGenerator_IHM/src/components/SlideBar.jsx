import { useEffect, useState } from "react";

export default function SlideBar(
    {onSave,
    settable}
) {
    const [period, setPeriod] = useState(1000);
    const [bgColor, setBgColor] = useState("bg-gray-100");
    const [disabled, setDisabled] = useState(false)


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
            semodificationValuetPeriod(10);
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
        console.log(settable)
        if(settable == 1)
            setDisabled(true);
        else{
            setDisabled(false);
        }
    }, [settable])

    return(
            <div className={`w-full h-22 text-center flex flex-col ${!disabled?"bg-gray-100 dark:bg-gray-800":""} p-2 rounded transition-colors duration-300`}>
                    <h1 className="m-2 font-bold underline">Période d'émission (ms):</h1>
                    <div className="flex flex-row gap-1">
                        <button className="h-8 bg-gray-200 border border-2 border-gray-800 rounded dark:bg-gray-600 transition-colors duration-300" disabled={disabled} onClick={() => minus1000ms()}><i className={`ml-2 mr-3 fas fa-angles-left`}></i></button>
                        <button className="h-8 bg-gray-200 border border-2 border-gray-800 rounded dark:bg-gray-600 transition-colors duration-300" disabled={disabled} onClick={() => minus100ms()}><i className={`ml-2 mr-3 fas fa-chevron-left`}></i></button>
                        <input type="number"
                            value={period}
                            onChange={(e) => modificationValue(Number(e.target.value))}
                            min={10}
                            max={10_000}
                            step={10}
                            disabled={disabled}
                            className={`w-full text-xl font-semibold border border-1 border-gray-500 text-center border-b border-gray-100 ${bgColor} dark:bg-gray-800 transition-colors duration-300`}/>
                        <button className="h-8 bg-gray-200 border border-2 border-gray-800 rounded dark:bg-gray-600 transition-colors duration-300" disabled={disabled} onClick={() => add100ms()}><i className={`ml-2 mr-3 fas fa-chevron-right`}></i></button>
                        <button className="h-8 bg-gray-200 border border-2 border-gray-800 rounded dark:bg-gray-600 transition-colors duration-300" disabled={disabled} onClick={() => add1000ms()}><i className={`ml-2 mr-3 fas fa-angles-right`}></i></button>
                    </div>
                    
            </div>
    );
}