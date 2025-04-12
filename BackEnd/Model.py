import os
from dotenv import load_dotenv

import nest_asyncio

load_dotenv()
nest_asyncio.apply()

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
import json
from googletrans import Translator
import asyncio

# Initialize Groq chat model
llm = ChatGroq(
    groq_api_key = os.environ["GROQ_API_KEY"],
    model_name = "llama3-8b-8192",
)

# Translator
translator = Translator()



parser = JsonOutputParser(pydantic_object={
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "remedies": {
            "type": "array",
            "items": {"type": "string"}
        },
        "advice": {
            "type": "array",
            "items": {"type": "string"}
        },
        "consult": {
            "type": "array",
            "items": {"type": "string"}
        }
    }
})

prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a healthcare assistant for rural people
                Given the symptoms, respond with:
                1. Possible condition
                2. Simple home remedies
                3. General advice
                4. When to consult a doctor

                Respond in this structure:
        {{
            "name": "Possible disease names here separated by commas",
            "remedies": ["remedy1", "remedy2", "remedy3"],
            "advice": ["advice1", "advice2", "advice3"],
            "consult": ["consult1", "consult2", "consult3"],
        }}"""),
    ("user", "{input}")
])
chain = prompt | llm | parser


# 🌍 Translator Agent function
async def translate_and_respond(user_input, input_language_code):
    # Step 1: Translate to English
    translated_to_english = (await translator.translate(user_input, src=input_language_code, dest='en')).text
    print(f"\n[Translated to English]: {translated_to_english}")

    # Step 2: Run through assistant chain
    assistant_reply_english = chain.invoke({"input": translated_to_english})
    print(f"\n[Assistant reply in English]: {assistant_reply_english}")

    # Step 3: Translate each value in the dictionary back to input language
    translated_response = {}

    # Translate name field
    translated_response["name"] = (await translator.translate(
        assistant_reply_english["name"], src='en', dest=input_language_code)).text

    # Translate each item in the arrays
    for key in ["remedies", "advice", "consult"]:
        translated_response[key] = []
        for item in assistant_reply_english[key]:
            translated_item = (await translator.translate(
                item, src='en', dest=input_language_code)).text
            translated_response[key].append(translated_item)

    return translated_response


# 🌟 Example usage
input_text = "मुझे दो दिनों से बुखार, बदन दर्द और हल्की खांसी है।"  # Hindi
language_code = "hi"  # ISO code for Hindi


# Instead of asyncio.run, directly call the async function using await
# within a new async function.
async def main():
    translated_response = await translate_and_respond(input_text, language_code)
    print(f"\n[Final reply in {language_code}]: {translated_response}")


# Run the main async function using asyncio.get_event_loop().run_until_complete
asyncio.get_event_loop().run_until_complete(main())
