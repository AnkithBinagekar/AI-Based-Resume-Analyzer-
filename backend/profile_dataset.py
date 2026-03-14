import pandas as pd
import numpy as np

print("📊 Running Exploratory Data Analysis (EDA) on JD Dataset...")

try:
    # Load the dataset
    df = pd.read_csv('data/JD Dataset.csv')
    
    # 1. Basic Dataset Size
    total_records = len(df)
    print(f"\n✅ Total Job Descriptions in Dataset: {total_records:,}")
    
    # 2. Analyze the Job Descriptions lengths
    # We drop nulls, convert to string, and split by spaces to count words
    descriptions = df['jobdescription'].dropna().astype(str)
    word_counts = descriptions.apply(lambda x: len(x.split()))
    
    print("\n📈 Word Count Statistics:")
    print(f"- Average JD Length: {int(word_counts.mean())} words")
    print(f"- Shortest JD: {int(word_counts.min())} words")
    print(f"- Longest JD: {int(word_counts.max())} words")
    
    # 3. Memory Usage (Proves you handled a large dataset)
    memory_usage = df.memory_usage(deep=True).sum() / (1024 * 1024)
    print(f"\n💾 Dataset Memory Footprint: {memory_usage:.2f} MB")
    
    print("\n🎯 Conclusion for Slide:")
    print(f"The LSA Knowledge Graph was trained on a robust corpus of {total_records:,} industry job descriptions, processing over {int(word_counts.sum()):,} total words to learn mathematical semantic relationships between IT and corporate skills.")

except FileNotFoundError:
    print("Error: Could not find 'data/JD Dataset.csv'. Make sure the file is in your data folder!")
except Exception as e:
    print(f"An error occurred: {e}")