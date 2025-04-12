import os
from dotenv import load_dotenv

import nest_asyncio

load_dotenv()
nest_asyncio.apply()

from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from googletrans import Translator
import asyncio

# Initialize Groq chat model
llm = ChatGroq(
    groq_api_key = os.environ["GROQ_API_KEY"],
    model_name = "llama3-8b-8192"
)

# Translator
translator = Translator()

# Assistant prompt
assistant_template = """
You are a healthcare assistant for rural people.
Given the symptoms, respond with:
1. Possible condition
2. Simple home remedies
3. General advice
4. When to consult a doctor

Be friendly and clear.

Symptoms: {symptoms}
"""

prompt = PromptTemplate.from_template(assistant_template)
chain = prompt | llm | StrOutputParser()


# 🌍 Translator Agent function
async def translate_and_respond(user_input, input_language_code):
    # Step 1: Translate to English
    translated_to_english = (await translator.translate(user_input, src=input_language_code, dest='en')).text
    print(f"\n[Translated to English]: {translated_to_english}")

    # Step 2: Run through assistant chain
    assistant_reply_english = chain.invoke({"symptoms": translated_to_english})
    print(f"\n[Assistant reply in English]: {assistant_reply_english}")

    # Step 3: Translate reply back to input language
    translated_back = (await translator.translate(assistant_reply_english, src='en', dest=input_language_code)).text
    return translated_back


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
