import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# --- CONFIGURATION ---
DATA_PATH = "../data/synthetic_training_data.csv"
MODEL_OUTPUT_PATH = "../models/hybrid_rf_model.pkl"

def train_hybrid_model():
    print(f"Loading training data from {DATA_PATH}...")
    try:
        df = pd.read_csv(DATA_PATH)
    except FileNotFoundError:
        print("❌ Error: Synthetic data not found. Run generate_synthetic_data.py first.")
        return

    # 1. Define Features (X) and Target (y)
    # X contains the 3 scores we generate from the PDF and JD
    X = df[['lexical_score', 'semantic_score', 'skill_overlap_score']]
    # y is the final out-of-100 percentage we want to predict
    y = df['target_compatibility_score']

    # 2. Split into Training (80%) and Testing (20%) sets
    print("Splitting data into 80% training and 20% testing...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 3. Initialize and Train the Machine Learning Model
    print("Training the Random Forest Regressor...")
    # n_estimators=100 means it will build 100 different decision trees and average them
    rf_model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    rf_model.fit(X_train, y_train)

    # 4. Evaluate the Model (Crucial for your Final Report!)
    print("\n--- Model Evaluation ---")
    predictions = rf_model.predict(X_test)
    
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    r2 = r2_score(y_test, predictions)

    print(f"Mean Absolute Error (MAE): {mae:.2f}% (Average error in final score)")
    print(f"Root Mean Squared Error (RMSE): {rmse:.2f}%")
    print(f"R-Squared (R2) Score: {r2:.4f} (Closer to 1.0 is better)")

    # 5. Feature Importance (Shows which metric the AI thinks is most important)
    print("\n--- Feature Importance ---")
    importances = rf_model.feature_importances_
    for feature, imp in zip(X.columns, importances):
        print(f"{feature}: {imp * 100:.2f}%")

    # 6. Save the trained model to disk
    os.makedirs(os.path.dirname(MODEL_OUTPUT_PATH), exist_ok=True)
    joblib.dump(rf_model, MODEL_OUTPUT_PATH)
    print(f"\n✅ Model trained successfully and saved to: {MODEL_OUTPUT_PATH}")

if __name__ == "__main__":
    train_hybrid_model()