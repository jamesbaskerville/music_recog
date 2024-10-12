"""
This is a simple FastAPI server that can be used to test the API.
"""

import asyncio
import base64
import os
from contextlib import asynccontextmanager
import logging


from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
import httpx
import io

import os
from datetime import datetime

# Create a directory to store the recordings if it doesn't exist
os.makedirs("recordings", exist_ok=True)

# Load environment variables
load_dotenv()

RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST")
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# On startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan manager.
    """
    logger.info("Starting up...")
    yield
    logger.info("Shutting down...")
    # Close peer connections
    coros = [pc.close() for pc in pcs]
    await asyncio.gather(*coros)
    pcs.clear()


app = FastAPI(lifespan=lifespan)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_class=FileResponse)
async def read_index():
    return FileResponse("static/index.html")


pcs = set()


@app.post("/recognize")
async def recognize_audio(audio: UploadFile = File(...)):
    # Read the audio file
    contents = await audio.read()
    try:
        # Convert WAV audio to base64
        wav_base64 = base64.b64encode(contents).decode("utf-8")

        # Store the original WAV data for later saving
        wav_data = contents

        # RapidAPI endpoint and headers
        url = f"https://{RAPIDAPI_HOST}/songs/v2/detect"
        headers = {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": RAPIDAPI_HOST,
        }

        # Send the WAV audio to RapidAPI
        # Convert wav_data to base64 string
        wav_base64 = base64.b64encode(wav_data).decode("utf-8")

        # Update headers to include content type
        headers["Content-Type"] = "text/plain"

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, content=wav_base64)

        # Save the converted WAV audio file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"recordings/audio_{timestamp}.wav"

        with open(filename, "wb") as f:
            f.write(wav_data)

        logger.info("Converted audio saved to %s", filename)

        # Proceed with the API request
        if response.status_code == 200:
            result = response.json()
            print(result)
            # Extract more information from the result
            track = result.get("track", {})
            return {
                "title": track.get("title", "Unknown"),
                "artist": track.get("subtitle", "Unknown"),
                "album": track.get("sections", [{}])[0]
                .get("metadata", [{}])[0]
                .get("text", "Unknown"),
                "genre": track.get("genres", {}).get("primary", "Unknown"),
                "release_date": track.get("releasedate", "Unknown"),
                "images": {
                    "background": track.get("images", {}).get("background", ""),
                    "coverart": track.get("images", {}).get("coverart", ""),
                    "coverarthq": track.get("images", {}).get("coverarthq", ""),
                },
                "url": track.get("url", ""),
                "spotify": track.get("hub", {})
                .get("providers", [{}])[0]
                .get("actions", [{}])[0]
                .get("uri", ""),
                "apple_music": track.get("hub", {})
                .get("options", [{}])[0]
                .get("actions", [{}])[0]
                .get("uri", ""),
                "lyrics": track.get("sections", [{}])[1].get("text", []),
            }
        else:
            return {"error": "Failed to recognize audio"}

    finally:
        # Clean up temporary files
        pass
