import pandas as pd
import numpy as np
import os

def generate_synthetic_data(num_samples=1500):
    """
    Simulates the mathematical feature vectors of 1,500 Resume-JD pairs.
    This creates the labeled dataset required to train our Supervised ML model.
    """
    print(f"Generating {num_samples} synthetic Resume-JD feature vectors...")
    
    # Set a random seed so our "random" data is reproducible for your panel
    np.random.seed(42)
    data = []
    
    for _ in range(num_samples):
        # Randomly decide what type of candidate this simulation represents
        candidate_type = np.random.choice(['excellent', 'average', 'poor'])
        
        if candidate_type == 'excellent':
            # Excellent matches have high overlap and semantic understanding
            lexical = round(np.random.uniform(0.5, 0.9), 4)
            semantic = round(np.random.uniform(0.7, 0.95), 4)
            overlap = round(np.random.uniform(0.6, 1.0), 4)
            
            # The Target Label: A compatibility score between 80% and 100%
            compatibility = round(np.random.uniform(80, 100), 2)
            
        elif candidate_type == 'average':
            # Average candidates might have okay semantic scores, but miss exact keywords
            lexical = round(np.random.uniform(0.2, 0.5), 4)
            semantic = round(np.random.uniform(0.4, 0.7), 4)
            overlap = round(np.random.uniform(0.3, 0.6), 4)
            
            # The Target Label: A compatibility score between 40% and 75%
            compatibility = round(np.random.uniform(40, 75), 2)
            
        else: 
            # Poor matches fail across the board
            lexical = round(np.random.uniform(0.0, 0.2), 4)
            semantic = round(np.random.uniform(0.1, 0.4), 4)
            overlap = round(np.random.uniform(0.0, 0.3), 4)
            
            # The Target Label: A compatibility score between 0% and 35%
            compatibility = round(np.random.uniform(0, 35), 2)
            
        data.append([lexical, semantic, overlap, compatibility])
        
    # Convert to a structured Pandas DataFrame
    df = pd.DataFrame(data, columns=[
        'lexical_score', 
        'semantic_score', 
        'skill_overlap_score', 
        'target_compatibility_score'
    ])
    
    # Save the dataset to the data folder
    output_dir = '../data'
    os.makedirs(output_dir, exist_ok=True)
    file_path = os.path.join(output_dir, 'synthetic_training_data.csv')
    
    df.to_csv(file_path, index=False)
    print("✅ Generation Complete!")
    print(f"💾 Saved {num_samples} rows of labeled training data to: {file_path}")
    
    # Print a quick preview for validation
    print("\n--- Data Preview ---")
    print(df.head())

if __name__ == "__main__":
    generate_synthetic_data()