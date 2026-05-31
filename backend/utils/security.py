import fitz  # PyMuPDF
import re

def detect_fraudulent_resume(pdf_path):
    """
    Dual-Layer Security Scan:
    1. Detects microscopic font stuffing (<= 1.5pt).
    2. Detects Zero-Width Steganography (Invisible Unicode characters).
    """
    try:
        doc = fitz.open(pdf_path)
        micro_word_count = 0
        unicode_fraud_count = 0
        
        for page in doc:
            text_instances = page.get_text("dict")["blocks"]
            
            for block in text_instances:
                if "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            text = span["text"].strip()
                            if not text:
                                continue
                            
                            # --- LAYER 1: MICROSCOPIC FONT DETECTION ---
                            font_size = span["size"]
                            if font_size <= 1.5:
                                words = text.split()
                                for word in words:
                                    clean_word = re.sub(r'[^a-zA-Z]', '', word)
                                    if len(clean_word) > 2:
                                        micro_word_count += 1
                                        
                            # --- LAYER 2: ZERO-WIDTH UNICODE DETECTION ---
                            # Searches for invisible characters commonly used to spoof ATS parsers
                            zero_width_matches = re.findall(r'[\u200B-\u200D\uFEFF]', text)
                            if zero_width_matches:
                                unicode_fraud_count += len(zero_width_matches)

        doc.close()
        
        is_fraud = False
        alerts = []
        
        if micro_word_count > 20:
            is_fraud = True
            alerts.append(f"{micro_word_count} microscopic hidden words")
            
        if unicode_fraud_count > 5:
            is_fraud = True
            alerts.append(f"{unicode_fraud_count} invisible zero-width characters (Steganography)")
            
        if is_fraud:
            return {
                "is_fraud": True,
                "hidden_words_count": micro_word_count + unicode_fraud_count,
                "details": " & ".join(alerts)
            }
            
        return {"is_fraud": False}
        
    except Exception as e:
        print(f"Security Check Error: {e}")
        return {"is_fraud": False}