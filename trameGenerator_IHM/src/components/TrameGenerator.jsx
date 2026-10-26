import React from "react";
import { useEffect, useState } from "react";
import EditableField from "./EditableField";
import BooleanField from "./BooleanField";
import ThemeToogle from "./ThemeToogle";
import SlideBar from "./SlideBar";

export default function TrameGenerator() {
  const [senders, setSenders] = useState([]);
  const [activeSenderId, setActiveSenderId] = useState("");
  const [fileTitle, setFileTitle] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatorMessage, setgeneratorMessage] = useState("N/A");
  const [generatorState, setGeneratorState] = useState(0);
  const [fields, setFields] = useState([]);
  const [fieldUpdate, setFieldUpdate] = useState({});
  const headers = ["Nom champ", "Valeur", "Description"];
  const columns = ["name", "value", "description"];

  async function refreshData(preferredActiveId = null) {
    try {
      const [resSenders, resTemplates] = await Promise.all([
        fetch("http://localhost:5050/api/v1/senders"),
        fetch("http://localhost:5050/api/v1/templates")
      ]);

      if (!resSenders.ok) throw new Error(`Erreur Senders HTTP: ${resSenders.status}`);

      const dataSenders = await resSenders.json();
      const sendersList = dataSenders.senders || [];
      setSenders(sendersList);

      if (resTemplates.ok) {
        const dataTemplates = await resTemplates.json();
        setTemplates(dataTemplates.templates || []);
      }

      let currentId = preferredActiveId || activeSenderId;
      if (!currentId || !sendersList.some(s => s.id === currentId)) {
        currentId = sendersList.length > 0 ? sendersList[0].id : "";
      }
      setActiveSenderId(currentId);

      if (currentId) {
        await loadSenderData(currentId);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSenderData(senderId) {
    try {
      const [resTitle, resState, resFields] = await Promise.all([
        fetch(`http://localhost:5050/api/v1/senders/${senderId}/filename`),
        fetch(`http://localhost:5050/api/v1/senders/${senderId}/generatorstate`),
        fetch(`http://localhost:5050/api/v1/senders/${senderId}/fields`)
      ]);

      if (!resTitle.ok || !resState.ok || !resFields.ok) {
        throw new Error("Erreur lors du chargement des données de l'émetteur");
      }

      const dataTitle = await resTitle.json();
      const dataState = await resState.json();
      const dataFields = await resFields.json();

      setFileTitle(dataTitle.fileName);
      setFields(dataFields);

      if (dataState.running) {
        setGeneratorState(1);
        setgeneratorMessage("Générateur démarré");
      } else {
        setGeneratorState(2);
        setgeneratorMessage("Générateur arrêté");
      }
    } catch (err) {
      setError(err);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  async function handleSelectTab(senderId) {
    setActiveSenderId(senderId);
    setFieldUpdate({});
    await loadSenderData(senderId);
  }

  async function handleAddSender(templateName) {
    const defaultTpl = templateName || (templates.length > 0 ? templates[0] : "frame_config.json");
    try {
      const res = await fetch("http://localhost:5050/api/v1/senders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: defaultTpl })
      });
      if (!res.ok) throw new Error(`Erreur lors de la création d'un émetteur: ${res.status}`);
      const data = await res.json();
      const newId = data.sender.id;
      await refreshData(newId);
    } catch (err) {
      setError(err);
    }
  }

  async function handleDeleteSender(senderId, e) {
    e.stopPropagation();
    if (senders.length <= 1) return;
    try {
      const res = await fetch(`http://localhost:5050/api/v1/senders/${senderId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error(`Erreur lors de la suppression: ${res.status}`);
      await refreshData();
    } catch (err) {
      setError(err);
    }
  }

  async function handleClickStart() {
    if (!activeSenderId) return;
    try {
      const response = await fetch(`http://localhost:5050/api/v1/senders/${activeSenderId}/start`);
      if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
      const result = await response.json();
      setgeneratorMessage(result.state);
      setGeneratorState(1);
      await refreshData(activeSenderId);
    } catch (err) {
      setError(err);
    }
  }

  async function handleClickStop() {
    if (!activeSenderId) return;
    try {
      const response = await fetch(`http://localhost:5050/api/v1/senders/${activeSenderId}/stop`);
      if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
      const result = await response.json();
      setgeneratorMessage(result.state);
      setGeneratorState(2);
      await refreshData(activeSenderId);
    } catch (err) {
      setError(err);
    }
  }

  async function handleClickStartAll() {
    try {
      const response = await fetch("http://localhost:5050/api/v1/start-all");
      if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
      await refreshData(activeSenderId);
    } catch (err) {
      setError(err);
    }
  }

  async function handleClickStopAll() {
    try {
      const response = await fetch("http://localhost:5050/api/v1/stop-all");
      if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
      await refreshData(activeSenderId);
    } catch (err) {
      setError(err);
    }
  }

  async function handleSelectTemplate(selectedFileName) {
    if (!activeSenderId) return;
    try {
      const response = await fetch(`http://localhost:5050/api/v1/senders/${activeSenderId}/load-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: selectedFileName })
      });
      if (!response.ok) throw new Error(`Erreur HTTP lors du changement de template: ${response.status}`);
      const result = await response.json();
      if (result.fileName) setFileTitle(result.fileName);
      if (result.fields) setFields(result.fields);
      setFieldUpdate({});
      await refreshData(activeSenderId);
    } catch (err) {
      setError(err);
    }
  }

  async function handleSetPeriod(value) {
    if (!activeSenderId) return;
    const response = await fetch(`http://localhost:5050/api/v1/senders/${activeSenderId}/period`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: value })
    });
    if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
  }

  async function handleEditing(value, field) {
    if (!activeSenderId) return;
    const response = await fetch(`http://localhost:5050/api/v1/senders/${activeSenderId}/field/${field}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: value })
    });
    if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
    const result = await response.json();
    setFieldUpdate(result);
  }

  if (loading) return <p className="p-4 font-semibold">Chargement en cours...</p>;
  if (error) return <p className="p-4 text-red-500 font-semibold">Erreur: {error.message}</p>;

  return (
    <div className="h-screen flex flex-col overflow-hidden p-1">
      {/* Tab Bar - Multi-Emetteurs */}
      <div className="w-full flex flex-row items-center bg-gray-100 dark:bg-gray-800 p-1 border-b border-gray-300 dark:border-gray-700 space-x-1 overflow-x-auto shrink-0">
        <span className="font-bold text-xs uppercase text-gray-500 dark:text-gray-400 mr-2 px-1">Émetteurs:</span>
        {senders.map((sender, idx) => {
          const isActive = sender.id === activeSenderId;
          return (
            <div
              key={sender.id}
              onClick={() => handleSelectTab(sender.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-t-md text-sm font-semibold cursor-pointer border-t border-l border-r transition-colors ${
                isActive
                  ? "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "bg-gray-200 dark:bg-gray-700 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  sender.running ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
                title={sender.running ? "En cours d'envoi" : "Arrêté"}
              />
              <span>{`Émetteur ${idx + 1} (${sender.fileName})`}</span>
              {senders.length > 1 && (
                <button
                  onClick={(e) => handleDeleteSender(sender.id, e)}
                  className="ml-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 font-bold text-xs rounded p-0.5"
                  title="Supprimer cet émetteur"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}

        {/* Bouton Ajouter Un Émetteur */}
        <button
          onClick={() => handleAddSender()}
          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-md transition-colors shadow-sm"
          title="Ajouter un nouvel émetteur de trame"
        >
          <span>+ Ajouter un émetteur</span>
        </button>

        {/* Action globale Tout Démarrer / Tout Arrêter */}
        <div className="ml-auto flex items-center space-x-1 pl-2">
          <button
            onClick={handleClickStartAll}
            className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded transition-colors"
            title="Démarrer tous les émetteurs"
          >
            TOUT DÉMARRER
          </button>
          <button
            onClick={handleClickStopAll}
            className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded transition-colors"
            title="Arrêter tous les émetteurs"
          >
            TOUT ARRÊTER
          </button>
          <div className="ml-2">
            <ThemeToogle />
          </div>
        </div>
      </div>

      <div className="h-[225px] shrink-0">
        <div className="w-full flex flex-row items-center p-1">
          <h1 className="mr-2 font-bold underline">Nom du fichier de description de trame: </h1>
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
        </div>
        <hr className="m-2 border-gray-500 border-1" />
        <div className="w-full flex flex-col">
          <div className="w-full flex flex-row justify-between">
            <div>
              <div className="w-full flex flex-col p-1">
                <h1 className="mr-1 font-bold underline">Action sur le générateur de trame: </h1>
                <div className="w-full flex flex-row mt-1">
                  <button
                    className={`w-32 p-2 border rounded-md border-1 mr-2 text-lg font-bold ${
                      generatorState === 1
                        ? "bg-green-500 text-white hover:bg-green-400 border-green-700 dark:bg-green-600 dark:hover:bg-green-500 transition-colors duration-300"
                        : "bg-gray-200 hover:bg-gray-300 border-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors duration-300"
                    }`}
                    onClick={() => handleClickStart()}
                  >
                    START
                  </button>
                  <button
                    className={`w-32 p-2 border rounded-md border-1 mr-2 text-lg font-bold ${
                      generatorState === 2
                        ? "bg-red-500 text-white hover:bg-red-400 border-red-700 dark:bg-red-600 dark:hover:bg-red-500 transition-colors duration-300"
                        : "bg-gray-200 hover:bg-gray-300 border-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors duration-300"
                    }`}
                    onClick={() => handleClickStop()}
                  >
                    STOP
                  </button>
                </div>
              </div>
              <div className="w-full w-[380px] flex flex-row p-1">
                <h1 className="mr-1 font-bold underline">État du générateur de trame: </h1>
                <p>{generatorMessage}</p>
              </div>
            </div>

            <div className="mt-3 h-max w-max flex flex-col p-1">
              <SlideBar onSave={handleSetPeriod} settable={generatorState}></SlideBar>
            </div>
            <div>
              <div className="mt-3 w-max flex flex-col p-1">
                <h1 className="mr-1 font-bold underline">État de la modification de champ: </h1>
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
            {headers.map((header) => (
              <div
                key={header}
                className="bg-gray-100 font-semibold text-left p-2 border-b-2 border-gray-300 dark:bg-gray-800 dark:text-white transition-colors duration-300"
              >
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
              {columns.map((col) =>
                field["editable"] && col === "value" ? (
                  field["type"] === "boolean" ? (
                    <BooleanField
                      key={`${field["name"]}-${col}`}
                      value={field[col]}
                      onSave={handleEditing}
                      type={field["type"]}
                      field={field["name"]}
                    />
                  ) : (
                    <EditableField
                      key={`${field["name"]}-${col}`}
                      value={field[col]}
                      onSave={handleEditing}
                      type={field["type"]}
                      field={field["name"]}
                    />
                  )
                ) : (
                  <div key={`${field["name"]}-${col}`} className={`ml-2 p-3 border-b border-gray-100`}>
                    {field[col]}
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
