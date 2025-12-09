# main.py
import os
import pickle
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from scipy.sparse import csr_matrix, hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import MultiLabelBinarizer, StandardScaler, normalize

MODEL_PATH = "fast_item_cf.pkl"
TOPK_NEIGHBORS = 50   # change this to improve performance, (but latency in training and scoring increases as well)

app = FastAPI(title="High-Performance Item CF API")

# ---------------- Requests ----------------
class ScoreItemsRequest(BaseModel):
    reference_item_id: int
    item_ids: list[int]

class TrainRequest(BaseModel):
    items_csv_path: str
    top_k: Optional[int] = TOPK_NEIGHBORS

# ---------------- Model ----------------

class FastItemContentModel:
    def __init__(self):
        self.item_to_idx = {}
        self.idx_to_item = {}
        self.item_feature_matrix = None
        self.nn_model = None
        self.trained = False

        self.title_tfidf = TfidfVectorizer(
            ngram_range=(1,2),
            max_features=4000,
            stop_words="english"
        )

        self.desc_tfidf = TfidfVectorizer(
            ngram_range=(1,2),
            max_features=8000,
            stop_words="english"
        )

        self.cast_tfidf = TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=6000,
            stop_words="english"
        )

        self.genre_binarizer = MultiLabelBinarizer()


    def fit(self, df: pd.DataFrame, top_k=50):
        required = {"item_id", "title", "description", "genres"}
        if not required.issubset(df.columns):
            raise ValueError(
                "CSV must contain: item_id,title,description,genres"
            )

        df = df.dropna(subset=["item_id"])
        df["item_id"] = pd.to_numeric(df["item_id"], errors="coerce")
        df = df.dropna(subset=["item_id"])
        df["item_id"] = df["item_id"].astype(int)

        items = df["item_id"].values

        self.item_to_idx = {item_id: i for i, item_id in enumerate(items)}
        self.idx_to_item = {i: item_id for item_id, i in self.item_to_idx.items()}

        title_vectors = self.title_tfidf.fit_transform(
            df["title"].fillna("")
        )

        desc_vectors = self.desc_tfidf.fit_transform(
            df["description"].fillna("")
        )

        cast_vectors = self.cast_tfidf.fit_transform(
            df["cast"].fillna("")
        )

        # Support for arrays
        genre_lists = df["genres"].fillna("").apply(lambda x: x.split("|"))
        genre_vectors = self.genre_binarizer.fit_transform(genre_lists)

        # Add weightage and combine everything
        self.item_feature_matrix = hstack([
            1.2 * title_vectors,
            0.8 * desc_vectors,
            1.6 * cast_vectors,
            0.7 * csr_matrix(genre_vectors, dtype=np.float32) # arrays
        ]).tocsr()

        self.item_feature_matrix = normalize(self.item_feature_matrix, norm="l2", axis=1)


        # Create a NN model to calculate metrics
        self.nn_model = NearestNeighbors(
            n_neighbors=top_k,
            metric="cosine",
            algorithm="brute",
            n_jobs=-1
        )
        # Calculate Nearest Neighbors (optimised for performance)
        self.nn_model.fit(self.item_feature_matrix)

        self.trained = True

    def recommend_similar(self, reference_item_id, top_n=10):
        if reference_item_id not in self.item_to_idx:
            raise ValueError("Reference item not found")

        idx = self.item_to_idx[reference_item_id]
        distances, indices = self.nn_model.kneighbors(
            self.item_feature_matrix[idx], n_neighbors=top_n + 1
        )

        results = []
        for i, dist in zip(indices[0], distances[0]):
            if i == idx:
                continue
            results.append(self.idx_to_item[i])

        return results[:top_n]

    def score_items(self, reference_item_id, item_ids):
        if reference_item_id not in self.item_to_idx:
            raise ValueError("Reference item not found")

        ref_idx = self.item_to_idx[reference_item_id]
        ref_vec = self.item_feature_matrix[ref_idx]

        scores = {}

        for item_id in item_ids:
            if item_id not in self.item_to_idx:
                scores[item_id] = 0.0
                continue

            idx = self.item_to_idx[item_id]
            vec = self.item_feature_matrix[idx]

            dot = ref_vec.dot(vec.T).data
            score = float(dot[0]) if len(dot) else 0.0
            scores[item_id] = score

        return scores

    def save(self):
        with open(MODEL_PATH, "wb") as f:
            pickle.dump(self, f)

    @staticmethod
    def load():
        with open(MODEL_PATH, "rb") as f:
            return pickle.load(f)

# ---------------- Load Model ----------------

if os.path.exists(MODEL_PATH):
    model = FastItemContentModel().load()
else:
    model = FastItemContentModel()

# ---------------- API ----------------

@app.post("/train")
def train(req: TrainRequest):
    if not os.path.exists(req.items_csv_path):
        raise HTTPException(400, "CSV not found")

    df = pd.read_csv(req.items_csv_path)

    if "item_id" not in df.columns:
        raise HTTPException(400, "CSV must contain item_id column")

    model.fit(df, req.top_k)
    model.save()

    return {
        "status": "content-model-trained",
        "items": len(model.item_to_idx),
        "features": model.item_feature_matrix.shape[1],
        "top_k": req.top_k
    }

@app.get("/recommend")
def recommend(reference_item_id: int, top_n: int = 10):
    if not model.trained:
        raise HTTPException(400, "Model not trained")

    recs = model.recommend_similar(reference_item_id, top_n)

    return {
        "reference_item_id": reference_item_id,
        "recommendations": recs
    }

@app.get("/status")
def status():
    return {
        "trained": model.trained,
        "items": len(model.item_to_idx) if model.trained else 0
    }

@app.post("/score_items")
def score_items(req: ScoreItemsRequest):
    if not model.trained:
        raise HTTPException(400, "Model not trained")

    scores = model.score_items(req.reference_item_id, req.item_ids)

    return {
        "reference_item_id": req.reference_item_id,
        "scores": scores
    }
