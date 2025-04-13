import os
from dotenv import load_dotenv
import nest_asyncio
import asyncio
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from Translator import translate_text, translate_and_respond

# Initialize environment
load_dotenv()
nest_asyncio.apply()

# Initialize Groq chat model
llm = ChatGroq(
    groq_api_key = os.environ["GROQ_API_KEY"],
    model_name = "llama3-8b-8192",
)

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

input_text = "मुझे दो दिनों से बुखार, बदन दर्द और हल्की खांसी है।"
language_code = "hi"

async def main():
    translated_response = await translate_and_respond(input_text, language_code, chain)
    print(f"\n[Final reply in {language_code}]: {translated_response}")

if __name__ == "__main__":
    asyncio.get_event_loop().run_until_complete(main())