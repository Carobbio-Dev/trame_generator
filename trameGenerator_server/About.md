# API:
- lister les champs:

<i>localhost:5050/api/v1/fields</i>

- modifier un champ (champ "sensor_id")

<i>localhost:5050/api/v1/field/sensor_id</i>

payload JSON: {"value": "M001"}

- lister les fichiers templates disponibles:

<i>localhost:5050/api/v1/templates</i>

- charger une configuration depuis le dossier template:

<i>localhost:5050/api/v1/load-config</i>

payload JSON: {"fileName": "frame_config.json"}

- modifier le port de l'émetteur (lorsqu'il est arrêté):

<i>localhost:5050/api/v1/senders/:id/port</i> ou <i>localhost:5050/api/v1/port</i>

payload JSON: {"port": 6005}
