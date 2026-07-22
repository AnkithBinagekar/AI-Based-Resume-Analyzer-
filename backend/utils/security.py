import fitz  # PyMuPDF
import re

def detect_fraudulent_resume(pdf_path):
    """
    Enterprise Security Scan:
    Analyzes document integrity without using LLMs. Deterministic rule-based checks.
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
                            
                            # Layer 1: Microscopic Font Detection
                            font_size = span["size"]
                            if font_size <= 1.5:
                                words = text.split()
                                for word in words:
                                    clean_word = re.sub(r'[^a-zA-Z]', '', word)
                                    if len(clean_word) > 2:
                                        micro_word_count += 1
                                        
                            # Layer 2: Zero-Width Steganography Detection
                            zero_width_matches = re.findall(r'[\u200B-\u200D\uFEFF]', text)
                            if zero_width_matches:
                                unicode_fraud_count += len(zero_width_matches)
        doc.close()
        
        checks = []
        risk_score = 0
        
        # Build Check Output
        if micro_word_count > 0:
            status = "Detected" if micro_word_count > 20 else "Warning"
            checks.append({
                "name": "Hidden Microscopic Text",
                "status": status,
                "severity": "Critical" if micro_word_count > 20 else "Medium",
                "details": f"{micro_word_count} microscopic hidden words (<= 1.5pt) detected. Often used to inject invisible ATS keywords."
            })
            risk_score += min(micro_word_count * 3, 60)
        else:
            checks.append({
                "name": "Font Integrity",
                "status": "Passed",
                "severity": "Info",
                "details": "No microscopic or hidden font layering detected."
            })
            
        if unicode_fraud_count > 0:
            status = "Detected" if unicode_fraud_count > 5 else "Warning"
            checks.append({
                "name": "Zero-Width Steganography",
                "status": status,
                "severity": "Critical" if unicode_fraud_count > 5 else "Medium",
                "details": f"{unicode_fraud_count} invisible zero-width characters found. Often used to spoof document parsers."
            })
            risk_score += min(unicode_fraud_count * 10, 40)
        else:
            checks.append({
                "name": "Unicode Integrity",
                "status": "Passed",
                "severity": "Info",
                "details": "No hidden zero-width characters detected."
            })
            
        is_fraud = risk_score >= 40
        
        if is_fraud:
            return {
                "is_fraud": True,
                "risk_score": min(risk_score, 100),
                "severity": "Critical",
                "summary": "The security engine flagged multiple indicators of ATS manipulation and document tampering.",
                "checks": checks,
                "recommendation": "Remove any invisible layers, white text, or microscopic keywords. Export the resume as a clean, flat PDF before uploading again."
            }
            
        return {
            "is_fraud": False
        }
        
    except Exception as e:
        print(f"Security Check Error: {e}")
        return {"is_fraud": False}