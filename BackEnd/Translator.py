from googletrans import Translator

translator = Translator()

def translate_text(text, src, dest):
    """
    Translate text from source language to destination language.

    Args:
        text (str): The text to be translated.
        src (str): The source language code (e.g., 'en' for English).
        dest (str): The destination language code (e.g., 'fr' for French).

    Returns:
        str: The translated text.
    """
    try:
        translation = translator.translate(text, src=src, dest=dest)
        return translation
    except Exception as e:
        print(f"Error during translation: {e}")
        return None