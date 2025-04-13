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

async def translate_and_respond(user_input, input_language_code, chain):
    translated_to_english = (await translate_text(user_input, src=input_language_code, dest='en')).text
    print(f"\n[Translated to English]: {translated_to_english}")

    assistant_reply_english = chain.invoke({"input": translated_to_english})
    print(f"\n[Assistant reply in English]: {assistant_reply_english}")

    name_text = assistant_reply_english["name"]
    remedies_text = ";".join(assistant_reply_english["remedies"])
    advice_text = ";".join(assistant_reply_english["advice"])
    consult_text = ";".join(assistant_reply_english["consult"])

    translated_name = (await translate_text(name_text, src='en', dest=input_language_code)).text
    translated_remedies = (await translate_text(remedies_text, src='en', dest=input_language_code)).text
    translated_advice = (await translate_text(advice_text, src='en', dest=input_language_code)).text
    translated_consult_text = (await translate_text(consult_text, src='en', dest=input_language_code)).text

    return {
        "name": translated_name,
        "remedies": translated_remedies.split(";"),
        "advice": translated_advice.split(";"),
        "consult": translated_consult_text.split(";")
    }