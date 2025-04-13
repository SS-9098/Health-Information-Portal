import json
import re
import os
import pickle
import numpy as np
import spacy
from DB_DS1 import data as database


def build_embedding_index(database, nlp):
    """Build embeddings for all diseases in the database using spaCy"""
    disease_texts = []
    disease_names = []

    for disease, data in database.items():
        # Create a descriptive text for the disease
        symptoms_text = ", ".join(data["symptoms"])
        disease_text = f"Disease: {disease}. Symptoms: {symptoms_text}"

        disease_texts.append(disease_text)
        disease_names.append(disease)

    # Compute embeddings for all diseases using spaCy
    embedding_matrix = np.array([nlp(text).vector for text in disease_texts])

    return embedding_matrix, disease_names


def init_diagnosis_system(database, cache_dir='cache'):
    """Initialize diagnosis system with caching for faster performance"""
    os.makedirs(cache_dir, exist_ok=True)
    cache_file = os.path.join(cache_dir, 'disease_embeddings_spacy.pkl')

    # Try to load cached embeddings
    if os.path.exists(cache_file):
        with open(cache_file, 'rb') as f:
            cached_data = pickle.load(f)
            embedding_matrix = cached_data['embedding_matrix']
            disease_names = cached_data['disease_names']
            nlp = spacy.load('en_core_web_md')
    else:
        # Load spaCy model (much faster than sentence_transformers)
        try:
            nlp = spacy.load('en_core_web_md')
        except OSError:
            print("Downloading spaCy model...")
            import subprocess
            subprocess.run(["python", "-m", "spacy", "download", "en_core_web_md"])
            nlp = spacy.load('en_core_web_md')

        # Build embeddings
        embedding_matrix, disease_names = build_embedding_index(database, nlp)

        # Cache the embeddings
        with open(cache_file, 'wb') as f:
            pickle.dump({
                'embedding_matrix': embedding_matrix,
                'disease_names': disease_names
            }, f)

    return database, nlp, embedding_matrix, disease_names


def predict_disease_semantic(user_symptoms, disease_database, embedding_matrix, disease_names, nlp, top_k=1):
    """Predict disease based on user symptoms using semantic similarity"""
    # Convert user symptoms to a single string
    user_input = "Symptoms: " + ", ".join(user_symptoms)

    # Get embedding of user input
    user_embedding = nlp(user_input).vector

    # Calculate cosine similarity
    # Normalize vectors for cosine similarity
    norm_emb = embedding_matrix / np.linalg.norm(embedding_matrix, axis=1, keepdims=True)
    norm_user = user_embedding / np.linalg.norm(user_embedding)

    # Compute similarity scores
    similarities = np.dot(norm_emb, norm_user)

    # Get top-k matches
    top_k_indices = np.argsort(similarities)[-top_k:][::-1]

    predictions = []
    for idx in top_k_indices:
        disease = disease_names[idx]
        sim_score = float(similarities[idx])
        predictions.append({
            "disease": disease,
            "confidence": round(sim_score, 4),
            "precautions": disease_database[disease]["precautions"]
        })

    return predictions[0] if top_k == 1 else predictions


def normalize_symptoms(symptoms):
    """Normalize user symptoms to match database format"""
    normalized = []
    for symptom in symptoms:
        # Convert to lowercase, remove extra spaces, replace spaces with underscores
        normalized_symptom = re.sub(r'\s+', '_', symptom.lower().strip())
        normalized.append(normalized_symptom)
    return normalized


def diagnose(user_symptoms, disease_database, embedding_matrix, disease_names, nlp):
    """Get diagnosis based on user symptoms"""
    # Normalize symptoms first
    normalized_symptoms = normalize_symptoms(user_symptoms)

    # Predict disease using semantic similarity
    return predict_disease_semantic(normalized_symptoms, disease_database, embedding_matrix, disease_names, nlp)


if __name__ == "__main__":
    # Use the already imported database from DB_DS1
    disease_database, nlp, embedding_matrix, disease_names = init_diagnosis_system(database)

    user_symptoms = ["head pain", "vomiting", "joint ache"]
    result = diagnose(user_symptoms, disease_database, embedding_matrix, disease_names, nlp)
    print(json.dumps(result, indent=4))