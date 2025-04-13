from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os
import uuid
from gtts import gTTS
from TTS import speak_text_colab
from dotenv import load_dotenv
import nest_asyncio
from Model import chain
from Translator import translate_text, translate_and_respond


load_dotenv()
nest_asyncio.apply()

app = FastAPI(title="Healthcare Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthRequest(BaseModel):
    symptoms: str
    language_code: str = "en"


class HealthResponse(BaseModel):
    name: str
    remedies: List[str]
    advice: List[str]
    consult: List[str]
    original_language: str

class TTSRequest(BaseModel):
    text: str
    language_code: str = "english"

@app.get("/")
async def root():
    return {"message": "Healthcare Assistant API"}


@app.get("/languages")
async def get_languages():
    languages = {
        "en": "english",
        "hi": "hindi",
        "bn": "bengali",
        "te": "telugu",
        "ta": "tamil",
        "mr": "marathi",
        "gu": "gujarati",
        "kn": "kannada",
        "ml": "malayalam",
        "pa": "punjabi"
    }
    return {"languages": list(languages.values())}

@app.post("/translate")
async def translate_text_endpoint(text: str, src: str, dest: str):
    try:
        translation = await translate_text(text, src, dest)
        if translation:
            return {"translated_text": translation.text}
        else:
            raise HTTPException(status_code=500, detail="Translation failed.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during translation: {str(e)}")


@app.post("/tts")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech and return audio file"""
    temp_file = None
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        # Simplified language mapping
        language_map = {
            "english": "en", "hindi": "hi", "bengali": "bn",
            "telugu": "te", "tamil": "ta", "marathi": "mr",
            "gujarati": "gu", "kannada": "kn", "malayalam": "ml",
            "punjabi": "pa"
        }

        lang_code = language_map.get(request.language_code.lower(), "en")

        os.makedirs("temp", exist_ok=True)
        filename = f"audio_{uuid.uuid4()}.mp3"
        temp_file = os.path.join("temp", filename)

        # Directly use gTTS instead of the wrapper
        tts = gTTS(text=request.text, lang=lang_code)
        tts.save(temp_file)

        return FileResponse(
            path=temp_file,
            media_type="audio/mpeg",
            filename=filename
        )
    except Exception as e:
        print(f"TTS error: {str(e)}")  # Print error for debugging
        if temp_file and os.path.exists(temp_file):
            os.remove(temp_file)
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")
@app.post("/health-advice", response_model=HealthResponse)
async def get_health_advice(request: HealthRequest):
    try:
        language_map = {
            "english": "en",
            "hindi": "hi",
            "bengali": "bn",
            "telugu": "te",
            "tamil": "ta",
            "marathi": "mr",
            "gujarati": "gu",
            "kannada": "kn",
            "malayalam": "ml",
            "punjabi": "pa"
        }

        lang_code = language_map.get(request.language_code.lower(), request.language_code)

        result = await translate_and_respond(request.symptoms, lang_code, chain)
        result["original_language"] = lang_code
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("App:app", host="127.0.0.1", port=8000, reload=True)