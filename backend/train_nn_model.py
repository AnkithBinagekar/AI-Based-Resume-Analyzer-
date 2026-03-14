import numpy as np
import pickle
import os
from sklearn.neural_network import MLPRegressor

# 1. Generate Training Data
# In a real enterprise, you would have thousands of human-scored resumes. 
# We simulate 10,000 historical ATS evaluations to train our Neural Network.
np.random.seed(42)
# X features: [Skill Overlap, Semantic Score, Lexical Score]
X_train = np.random.rand(10000, 3)

# 2. Define the non-linear relationship the Neural Network needs to learn
# We teach the AI that Skill Overlap and Semantic Score are the most important.
y_train = (X_train[:, 0] * 0.50) + (X_train[:, 1] * 0.35) + (X_train[:, 2] * 0.15)

# Introduce a non-linear penalty: if skill overlap is extremely low, penalize the final score heavily
penalty = np.where(X_train[:, 0] < 0.2, 0.7, 1.0)
y_train = y_train * penalty
y_train = np.clip(y_train, 0, 1)

print("Training the Deep Learning Neural Network (Multi-Layer Perceptron)...")
# 3. Build the Neural Network
# We use 2 Hidden Layers (16 neurons, then 8 neurons) using the ReLU activation function
nn_model = MLPRegressor(hidden_layer_sizes=(16, 8), activation='relu', solver='adam', max_iter=500)

nn_model.fit(X_train, y_train)

# 4. Save the trained weights
os.makedirs('ai_models', exist_ok=True)
with open('ai_models/mlp_scoring_model.pkl', 'wb') as f:
    pickle.dump(nn_model, f)

print("✅ Neural Network successfully trained and saved!")