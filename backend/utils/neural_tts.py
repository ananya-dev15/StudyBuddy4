import asyncio
import sys
import json
import base64
import edge_tts

VOICE_MAP = {
    "hi-IN": "hi-IN-SwaraNeural",
    "en-IN": "en-IN-NeerjaExpressiveNeural",
    "bn-IN": "bn-IN-TanishaaNeural",
    "ta-IN": "ta-IN-PallaviNeural",
    "te-IN": "te-IN-ShrutiNeural",
    "mr-IN": "mr-IN-AarohiNeural",
    "gu-IN": "gu-IN-DhwaniNeural",
    "kn-IN": "kn-IN-SapnaNeural",
    "ml-IN": "ml-IN-SobhanaNeural",
    "pa-IN": "hi-IN-SwaraNeural",
    "ur-IN": "ur-IN-GulNeural",
}

def convert_gurmukhi_to_phonetic_devanagari(text):
    result = []
    for ch in text:
        code = ord(ch)
        if 0x0A00 <= code <= 0x0A7F:
            if code == 0x0A70:
                result.append('\u0901') # Tippi -> Candrabindu
            elif code == 0x0A71:
                result.append('\u094D') # Addak -> Virama
            else:
                result.append(chr(code - 0x0100))
        else:
            result.append(ch)
    return "".join(result)

async def generate_speech(text, lang_code):
    voice = VOICE_MAP.get(lang_code, "en-IN-NeerjaExpressiveNeural")
    
    # If text has Gurmukhi script, convert phonetically for Swara neural model
    clean_text = text
    if any(0x0A00 <= ord(c) <= 0x0A7F for c in text):
        clean_text = convert_gurmukhi_to_phonetic_devanagari(text)
        voice = "hi-IN-SwaraNeural"

    communicate = edge_tts.Communicate(clean_text, voice, rate="+2%", pitch="+1Hz")
    audio_data = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data.extend(chunk["data"])
    
    if not audio_data:
        raise ValueError("No audio generated from neural engine")

    b64_audio = base64.b64encode(audio_data).decode("utf-8")
    return {
        "success": True,
        "audio": b64_audio,
        "format": "mp3",
        "voice": voice,
        "model": "neural-edge-v1",
    }

async def main():
    try:
        input_data = json.loads(sys.stdin.read())
        text = input_data.get("text", "")
        lang_code = input_data.get("language_code", "en-IN")
        if not text:
            print(json.dumps({"success": False, "error": "Empty text"}))
            return
        
        result = await generate_speech(text, lang_code)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    asyncio.run(main())
