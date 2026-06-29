export const BLOCKED_INTENT_PATTERNS = [
  /\b(build|create|write|generate)\b.{0,40}\b(malware|ransomware|keylogger|trojan|virus|worm|botnet)\b/i,
  /\b(phishing|credential\s*steal|steal\s+password|token\s+stealer)\b/i,
  /\b(ddos|dos\s+attack|exploit\s+zero\s*day|bypass\s+antivirus)\b/i,
  /\b(make|build|create)\b.{0,30}\b(bomb|weapon|explosive)\b/i,
];

export const JAILBREAK_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|system)\s+instructions/i,
  /reveal\s+(the\s+)?(system|developer)\s+prompt/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
];
