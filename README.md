# cool-map-amsterdam

Cool Map for Amsterdam: an interactive, mobile-friendly platform to help residents find places to cool down during hot days (indoor cool spaces + outdoor cooling spots + practical infrastructure like drinking water points).

## Run (backend + frontend served by Flask)

From the `backend/` folder:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
flask --app wsgi:app run --debug
```

Then open:

- `http://127.0.0.1:5000/` (map)

## API quick checks

All API routes are under `/api`.

