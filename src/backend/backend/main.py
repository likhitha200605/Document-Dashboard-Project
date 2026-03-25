from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import shutil
from extractor import extract_text_and_kpis

app = FastAPI(title="Doc-to-Dashboard API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)

@app.get("/")
def health_check():
    return {"status": "ok"}

@app.post("/api/upload")
async def process_document(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.pdf', '.docx', '.doc')):
        raise HTTPException(status_code=400, detail="Unsupported file type. Only PDF and Word docs are supported.")
    
    file_path = os.path.join("uploads", file.filename)
    # Save uploaded file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Pass to extraction layer
        extracted_data = extract_text_and_kpis(file_path)
        return {
            "message": "Extraction successful",
            "filename": file.filename,
            "data": extracted_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
