from gtts import gTTS
from IPython.display import Audio

def speak_text_colab(text, lang_code='hi', filename='output.mp3'):
    tts = gTTS(text=text, lang=lang_code)
    tts.save(filename)
    return Audio(filename, autoplay=True)

if __name__ == "__main__":
    text = "नमस्ते, आप कैसे हैं?"
    lang_code = 'hi'
    filename = 'output.mp3'
    audio = speak_text_colab(text, lang_code, filename)
    display(audio)
