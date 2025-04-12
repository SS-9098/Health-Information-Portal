import os
from dotenv import load_dotenv
import nest_asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import uvicorn

# Import from your existing modules
from Model import chain
from Translator import translate_text, translate_and_respond

# Initialize environment and async support
load_dotenv()
nest_asyncio.apply()

# Create FastAPI app
app = FastAPI(title="Healthcare Assistant API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Define request model
class HealthRequest(BaseModel):
    symptoms: str
    language_code: str = "en"


# Define response model
class HealthResponse(BaseModel):
    name: str
    remedies: List[str]
    advice: List[str]
    consult: List[str]
    original_language: str


# Translator function

# Endpoints
@app.get("/")
async def root():
    return {"message": "Healthcare Assistant API"}


@app.post("/health-advice", response_model=HealthResponse)
async def get_health_advice(request: HealthRequest):
    try:
        result = await translate_and_respond(request.symptoms, request.language_code)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")


# Run the server
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)