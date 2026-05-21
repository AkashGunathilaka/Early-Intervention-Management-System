# OULAD raw CSV files (notebook training)

Place the Open University Learning Analytics Dataset (OULAD) CSV files here when retraining with `Notebook/data_cleaning_and_ml_core.ipynb`.

The notebook looks for a folder named **`Data`** or **`data`** (either works).

## Required for the notebook

| File | Used by notebook |
|------|------------------|
| `studentInfo.csv` | Yes |
| `studentVle.csv` | Yes |
| `studentAssessment.csv` | Yes |
| `assessments.csv` | Yes |

## Optional (included in full OULAD download)

| File | Notes |
|------|--------|
| `courses.csv` | Reference metadata |
| `vle.csv` | VLE activity catalogue |
| `studentRegistration.csv` | Registration dates |
| `demo_students.csv` | Small sample export from notebook work |

These files are **gitignored** (`Data/*.csv`) because of size. Copy them from your OULAD download or onedrive folder (the `anonymisedData` folder) after cloning.

Download: https://analyse.kmi.open.ac.uk/open-dataset
or you can access from the onedrive folder
