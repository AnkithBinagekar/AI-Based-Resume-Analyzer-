import fitz  # PyMuPDF
import re

def detect_fraudulent_resume(pdf_path):
    """
    Scans a PDF for adversarial ATS hacking techniques.
    Upgraded: Ignores white text to allow for dark-mode templates (FlowCV, Canva).
    Only targets microscopic font stuffing (<= 1.5pt) that contains actual words.
    """
    try:
        doc = fitz.open(pdf_path)
        fraud_word_count = 0
        
        for page in doc:
            text_instances = page.get_text("dict")["blocks"]
            
            for block in text_instances:
                if "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            text = span["text"].strip()
                            if not text:
                                continue
                            
                            font_size = span["size"]
                            
                            # Check: Is the font size microscopic? (Less than 1.5pt)
                            is_tiny_text = (font_size <= 1.5)

                            # FlowCV uses tiny text for icons and spacing. 
                            # We only care if the tiny text is an actual word (letters only, length > 2)
                            if is_tiny_text:
                                # Clean the text of symbols and check if it's a real word
                                clean_word = re.sub(r'[^a-zA-Z]', '', text)
                                if len(clean_word) > 2:
                                    fraud_word_count += 1

        doc.close()
        
        # We increased the threshold to 20 to allow for minor PDF formatting anomalies
        if fraud_word_count > 20:
            return {
                "is_fraud": True,
                "hidden_words_count": fraud_word_count
            }
            
        return {"is_fraud": False}
        
    except Exception as e:
        print(f"Security Check Error: {e}")
        return {"is_fraud": False}