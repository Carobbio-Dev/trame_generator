import { useState } from "react";

export default function BooleanField({
    value,
    onSave,
    field
}) {
    const [checked, setChecked] = useState(value); // valeur de l'état de la checkbox pour un moyen météo et setter

    function enOctets4(number){
        const buffer = new ArrayBuffer(4);
        const viewer = new DataView(buffer);
        viewer.setInt32(0, number);
        return Array.from(new Int8Array(buffer));
    }

    function handleSave(){
        setChecked(!checked);
        onSave(enOctets4(Number(!checked)), field);
    }
    
    return (
       
        <div className="w-full flex flex-col justify-center">
            <input type="checkbox" value="" className="h-8 accent-gray-200 dark:accent-gray-600" onChange={handleSave} checked={checked}></input>
        </div>

  );
}
