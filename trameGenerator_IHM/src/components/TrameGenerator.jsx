import React from "react";
import { useEffect, useState } from "react";
import EditableField from "./EditableField";
import BooleanField from "./BooleanField";
import ThemeToogle from "./ThemeToogle";
import SlideBar  from "./SlideBar";

export default function TrameGenerator() {

  const [fileTitle, setFileTitle] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatorMessage, setgeneratorMessage] = useState(localStorage.getItem("generatorMessage") || "N/A");
  const [generatorState, setGeneratorState] = useState(localStorage.getItem("generatorState") || 0);
  const [fields, setFields] = useState([]);
  const [fieldUpdate, setFieldUpdate] = useState({});
  const headers = ["Nom champ", "Valeur", "Description"];
  const columns = ["name", "value", "description"];

  useEffect(() => {
    async function loadAllData() {
      try {
        const [resTitle, resState, resFields, resTemplates] = await Promise.all(
          [
            fetch("http://localhost:5050/api/v1/filename"),
            fetch("http://localhost:5050/api/v1/generatorstate"),
            fetch("http://localhost:5050/api/v1/fields"),
            fetch("http://localhost:5050/api/v1/templates")
          ]
        ) 
        if(!resTitle.ok) throw new Error(`Erreur Filename HTTP: ${resTitle.status}`);
        if(!resState.ok) throw new Error(`Erreur State HTTP: ${resState.status}`);
        if(!resFields.ok) throw new Error(`Erreur Fields HTTP: ${resFields.status}`);

        const dataFileName = await resTitle.json();
        const dataState = await resState.json();
        const dataFields = await resFields.json();

        setFileTitle(dataFileName.fileName);

        if (resTemplates.ok) {
          const dataTemplates = await resTemplates.json();
          let tList = dataTemplates.templates || [];
          if (dataFileName.fileName && !tList.includes(dataFileName.fileName)) {
            tList = [dataFileName.fileName, ...tList];
          }
          setTemplates(tList);
        } else {
          setTemplates([dataFileName.fileName]);
        }

        if(dataState.running){
          setGeneratorState(1);
          localStorage.setItem("generatorState", 1);
          localStorage.setItem("generatorMessage", "Générateur démarré");
        } else {
          setGeneratorState(2);
          localStorage.setItem("generatorState", 2);
          localStorage.setItem("generatorMessage", "Générateur arrêté");
        }

        setFields(dataFields);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    loadAllData();
  },[]);

  async function handleSelectTemplate(selectedFileName) {
    try {
      const response = await fetch("http://localhost:5050/api/v1/load-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: selectedFileName })
      });
      if (!response.ok) {
        throw new Error(`Erreur HTTP lors du changement de template: ${response.status}`);
      }
      const result = await response.json();
      if (result.fileName) {
        setFileTitle(result.fileName);
      }
      if (result.fields) {
        setFields(result.fields);
      } else {
        const fieldsRes = await fetch("http://localhost:5050/api/v1/fields");
        if (fieldsRes.ok) {
          const newFields = await fieldsRes.json();
          setFields(newFields);
        }
      }
      setFieldUpdate({});
    } catch (err) {
      setError(err);
    }
  }

  async function handleClickStart() {
    try {
      const response = await fetch("http://localhost:5050/api/v1/start");
      if(!response.ok) {
        setGeneratorState(0);
        localStorage.setItem("generatorState", 0);
        localStorage.setItem("generatorMessage", "N/A");
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const result = await response.json();
      setgeneratorMessage(result.state);
      setGeneratorState(1);
      localStorage.setItem("generatorState", 1);
      localStorage.setItem("generatorMessage", result.state);
    } catch (err) {
      setError(err);
    }
  }

  async function handleClickStop() {
    try {
      const response = await fetch("http://localhost:5050/api/v1/stop");
      if(!response.ok) {
        setGeneratorState(0);
        localStorage.setItem("generatorState", 0);
        localStorage.setItem("generatorMessage", "N/A");
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const result = await response.json();
      setgeneratorMessage(result.state);
      setGeneratorState(2);
      localStorage.setItem("generatorState", 2);
      localStorage.setItem("generatorMessage", result.state);
    } catch (err) {
      setError(err);
    }
  }

  async function handleSetPeriod(value) {
    const response = await fetch('http://localhost:5050/api/v1/period', {
      method : 'PUT',
      headers : {'Content-Type' : 'application/json',},
      body: JSON.stringify({ value : value})
    });
    if(!response.ok){
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    const result = await response.json();
  }


  async function handleEditing(value, field) {
    const response = await fetch('http://localhost:5050/api/v1/field/' + field, {
      method : 'PUT',
      headers : {'Content-Type' : 'application/json',},
      body: JSON.stringify({ value : value})
    });
    if(!response.ok){
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    const result = await response.json();
    setFieldUpdate(result);
  }

  if(loading){
    return <p>Chargement en cours...</p>
  }

  if(error){
    return <p>Ereur: {error.message}</p>
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden p-1">
      <div className="h-[225px] shrink-0">
        <div className="w-full flex flex-row items-center p-1">
          <h1 className="mr-2 font-bold underline">Nom du fichier de desciption de trame: </h1>
          {templates.length > 0 ? (
            <select
              value={fileTitle}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-400 dark:border-gray-600 rounded px-2 py-1 text-sm font-semibold text-black dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {templates.map((tpl) => (
                <option key={tpl} value={tpl}>
                  {tpl}
                </option>
              ))}
            </select>
          ) : (
            <p>{fileTitle}</p>
          )}
          <div className="ml-auto">
            <ThemeToogle />
          </div>
        </div>
        <hr className="m-2 border-gray-500 border-1" />
        <div className="w-full flex flex-col">
          <div className="w-full flex flex-row justify-between">
            <div>
              <div className="w-full flex flex-col p-1">
                <h1 className="mr-1 font-bold underline">Action sur le générateur de trame: </h1>
                <div className="w-full flex flex-row mt-1">
                  <button className={`w-32 p-2 border rounded-md border-1 mr-2 text-lg font-bold ${generatorState == 1 ? "bg-green-500 text-white hover:bg-green-400 border-green-700 dark:bg-green-600 dark:hover:bg-green-500 transition-colors duration-300" : "bg-gray-200 hover:bg-gray-300 border-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors duration-300"}`} onClick={() => handleClickStart()}>START</button>
                  <button className={`w-32 p-2 border rounded-md border-1 mr-2 text-lg font-bold ${generatorState == 2 ? "bg-red-500 text-white hover:bg-red-400 border-red-700 dark:bg-red-600 dark:hover:bg-red-500 transition-colors duration-300" : "bg-gray-200 hover:bg-gray-300 border-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors duration-300"}`} onClick={() => handleClickStop()}>STOP</button>
                </div>
              </div>
              <div className="w-full w-[380px] flex flex-row p-1">
                <h1 className="mr-1 font-bold underline">Etat du générateur de trame: </h1>
                <p>{generatorMessage}</p>
              </div>
            </div>

            {<div className="mt-3 h-max w-max flex flex-col p-1">
              <SlideBar onSave={handleSetPeriod} settable={generatorState}></SlideBar>
            </div>}
            <div>
              <div className="mt-3 w-max flex flex-col p-1">
                <h1 className="mr-1 font-bold underline">Etat de la modification de champ: </h1>
                {fieldUpdate && fieldUpdate.field ? (
                  <div className="flex flex-row">
                    <p className="font-semibold mr-1">{`${fieldUpdate.field}`}</p> <p> mis à jour!</p>
                  </div>
                ) : (
                  <p>-</p>
                )}
              </div>
            </div>
          </div>
          <hr className="m-2 border-gray-500 border-1" />
          {/** En-têtes */}
          <div className="grid grid-cols-3 gap-2 mb-1">
          { headers.map((header) => (
            <div key={header} className="bg-gray-100 font-semibold text-left p-2 border-b-2 border-gray-300 dark:bg-gray-800 dark:text-white transition-colors duration-300">
              {header}
            </div>
          ))}
          </div>
        </div>   
      </div>
      <div className="flex-1 min-h-0 w-full overflow-y-auto">       
        <div className="grid grid-cols-1 gap-2">
          {/** Lignes */}
          {fields.map((field, index) => (
            <div key={`${field["name"]}-${index}`} className="grid grid-cols-3 gap-2">
              {columns.map((col) => (
                field["editable"] && col == "value" ?
                  // champ éditable boolean? 
                  field["type"]=="boolean"?
                  <BooleanField key={`${field["name"]}-${col}`} value={field[col]} onSave={handleEditing} type={field["type"]} field={field["name"]}/>:
                  // champ éditable classique
                  <EditableField key={`${field["name"]}-${col}`} value={field[col]} onSave={handleEditing} type={field["type"]} field={field["name"]}/> :
                  // champ information
                  <div key={`${field["name"]}-${col}`} className={`ml-2 p-3 border-b border-gray-100`}>
                    {field[col]}
                  </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}