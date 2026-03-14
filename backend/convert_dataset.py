import pandas as pd

def convert_xlsx_to_csv(input_path, output_path):
    df = pd.read_excel(input_path)
    df.to_csv(output_path, index=False)
    print(f"Converted {len(df)} rows to CSV successfully.")

if __name__ == "__main__":
    convert_xlsx_to_csv(
        "data/JD Dataset.xlsx",
        "data/JD Dataset.csv"
    )
