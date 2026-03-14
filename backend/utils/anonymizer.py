import re
import spacy

# Load Spacy's English language model for Named Entity Recognition (NER)
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    import subprocess
    subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"])
    nlp = spacy.load("en_core_web_sm")

def scrub_pii(text):
    """
    Scans document text and replaces personally identifiable information (PII)
    with [REDACTED] tags for Ethical Blind Hiring.
    """
    # 1. Redact Emails
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    text = re.sub(email_pattern, '[REDACTED EMAIL]', text)
    
    # 2. Redact Phone Numbers
    phone_pattern = r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'
    text = re.sub(phone_pattern, '[REDACTED PHONE]', text)
    
    # 3. Redact URLs (LinkedIn, GitHub)
    url_pattern = r'https?://\S+|www\.\S+|\b\S+\.com/\S*'
    text = re.sub(url_pattern, '[REDACTED URL]', text)
    
    # 4. Redact Names and Locations
    doc = nlp(text)
    redacted_text = text
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            redacted_text = redacted_text.replace(ent.text, '[REDACTED NAME]')
        elif ent.label_ in ["GPE", "LOC"]: 
            redacted_text = redacted_text.replace(ent.text, '[REDACTED LOCATION]')
            
    return redacted_text