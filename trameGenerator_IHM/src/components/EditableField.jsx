import { useEffect, useState } from "react";
import PropTypes from "prop-types";

export default function EditableField({
    value,
    onSave,
    type,
    field
}) {
    const [draft, setDraft] = useState(value);
    const [bgColor, setBgColor] = useState("bg-gray-100");
    const [inputType, setInputType] = useState("text")
    var edited = false;

    useEffect(() => {
        if(type == "string"){
            setInputType("text");
        } else if(type == "int32") {
            setInputType("text");
        }
    }, [])

    function enOctets4(number){
        const buffer = new ArrayBuffer(4);
        const viewer = new DataView(buffer);
        viewer.setInt32(0, number);
        return Array.from(new Int8Array(buffer));
    }

    function handleSave(){
        var tmp = draft.replace(/ /g, ''); //suppression des espaces
        if(edited && type == "int32"){
            
            if(/^-?\d+(\.\d+)?$/.test(tmp)){
                onSave(enOctets4(tmp), field);
                setBgColor("bg-green-100 dark:bg-green-900");
            }
            else{
                setBgColor("bg-red-100 dark:bg-red-900");
            }
            edited = false
        } else if(edited && type == "string"){
            if(typeof tmp === 'string' && tmp.length === 4){
                onSave(tmp, field);
                setBgColor("bg-green-100 dark:bg-green-900");
            }
            else{
                setBgColor("bg-red-100 dark:bg-red-900");
            }
            edited = false
        }
    }
    function handleCancel(){
            setDraft(value);
    }
    function handleKeyDown(e){
        if(e.key === 'Enter'){
            e.preventDefault();
            edited = true;
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    }
    
    return (
        <div>
            <input type={inputType}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={`w-full p-3 border-b border-gray-100 ${bgColor} dark:bg-gray-800 transition-colors duration-300`}/>
        </div>
    
  );
}

EditableField.propTypes = {
    value: PropTypes.any,
    onSave: PropTypes.func,
    type: PropTypes.string,
    field: PropTypes.string
};