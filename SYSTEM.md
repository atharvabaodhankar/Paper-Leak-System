# 🧠 SYSTEM DESIGN

## Decentralized Exam Paper Leak Prevention System

---

## 1️⃣ SYSTEM GOAL (ONE LINE)

> Prevent exam paper leaks by ensuring that question papers are unreadable until **10 minutes before the exam**, using automated encryption, blockchain-based rules, and zero human key ownership.

---

## 2️⃣ ACTORS (WHO IS INVOLVED)

| Actor                             | Responsibility                     |
| --------------------------------- | ---------------------------------- |
| Teacher / Paper Setter            | Uploads question papers            |
| Exam Authority (University/Board) | Creates exam, monitors system      |
| Backend Exam System               | Handles encryption, storage, logic |
| Blockchain Network                | Stores rules, time-lock, audit     |
| IPFS / Pinata                     | Stores encrypted papers            |
| Exam Center (College/School)      | Prints paper at exam time          |
| Students                          | Write exam (no system interaction) |

---

## 3️⃣ HIGH-LEVEL ARCHITECTURE

```
Teacher
   |
   v
Web Portal  ---> Backend Server
                  |
                  |--> Encryption + Split Module
                  |
                  |--> IPFS / Pinata (Encrypted Papers)
                  |
                  |--> Blockchain (Hashes + Rules)
                  |
                  v
          Exam Center Secure App
                  |
                  v
               Printer
```

---

## 4️⃣ CORE COMPONENTS (DETAILED)

---

### 🔹 1. Web Portal (Frontend)

**Used by:**

* Teachers
* Exam authority
* Exam centers

**Functions:**

* Teacher uploads PDFs
* Authority creates exam & schedule
* Exam center logs in at exam time

**Security:**

* Role-based access
* Password + optional wallet login
* No paper preview option at any time

---

### 🔹 2. Backend Exam System (Core Brain)

This is the **most important component**.

#### Responsibilities:

* Accept uploaded PDFs
* Automatically split PDFs
* Encrypt split parts
* Upload encrypted chunks to IPFS
* Communicate with blockchain
* Control unlock & printing logic

#### Key Rule:

> ❌ Backend never stores decrypted papers
> ❌ Backend never stores encryption keys

---

### 🔹 3. Encryption & Split Module

**Process (Automatic):**

```
PDF → Split into N chunks → Encrypt each chunk → Discard plaintext
```

**Why splitting?**

* Even if one chunk leaks → useless
* Extra security layer

**Encryption Logic:**

* Symmetric encryption (AES)
* Key is **not stored**
* Key is **derived only at unlock time**

---

### 🔹 4. IPFS / Pinata (Storage Layer)

**Stores:**

* Encrypted PDF chunks only

**Does NOT store:**

* Plain PDF
* Decryption keys
* Exam metadata

**Benefits:**

* Decentralized
* Tamper-proof (via hash)
* Cheap & scalable

---

### 🔹 5. Blockchain Layer (Trust Layer)

Blockchain is used as a **rule enforcer**, not storage.

#### Stored on-chain:

* Exam ID
* Hashes of encrypted papers
* Unlock time (10:20 AM)
* Exam start time (10:30 AM)
* Random paper selection logic
* Event logs (unlock, selection)

#### Blockchain ensures:

* Unlock time cannot be changed
* Paper selection cannot be manipulated
* Full audit trail exists

---

### 🔹 6. Random Paper Selection Module

**When:**
⏰ Exactly at **10:20 AM**

**How:**

* Uses blockchain randomness
* Selects **1 paper from submitted set**
* Selection recorded on-chain

**Why this matters:**

* No human bias
* No prior knowledge of final paper
* Strong anti-corruption feature

---

### 🔹 7. Exam Center Secure Application

**Runs on:**

* One computer per exam center

**Features:**

* Kiosk mode (no USB, screenshots, copy)
* Can only:

  * Fetch encrypted chunks
  * Decrypt at allowed time
  * Send to printer

**Restrictions:**

* No file saving
* No preview before unlock
* Auto-lock after printing

---

### 🔹 8. Printing & Destruction Module

**At 10:20–10:25:**

* Paper decrypts in memory
* Printed immediately
* Decrypted data wiped from RAM
* App locks itself

**Result:**

* Paper readable only for few minutes
* No digital trace remains

---

## 5️⃣ TIME-BASED FLOW (VERY IMPORTANT)

| Time        | Action                           |
| ----------- | -------------------------------- |
| Before exam | Papers encrypted & stored        |
| 10:20 AM    | Random paper selected & unlocked |
| 10:20–10:25 | Printing window                  |
| 10:30 AM    | Exam starts                      |

---

## 6️⃣ SECURITY DESIGN (WHY LEAKS FAIL)

| Threat          | Defense                     |
| --------------- | --------------------------- |
| Teacher leaks   | Paper encrypted instantly   |
| Admin corrupt   | No access to decrypted data |
| College corrupt | Login ≠ paper access        |
| Early unlock    | Blockchain time-lock        |
| Key theft       | No stored key               |
| Paper swap      | Hash mismatch               |

---

## 7️⃣ SCALABILITY & PRACTICALITY

* Works for:

  * Schools
  * Colleges
  * Universities
* Requires:

  * 1 computer
  * 1 printer
  * Short internet access
* No change to exam format

---

## 8️⃣ SYSTEM DESIGN – ONE-LINE SUMMARY

> “The system automatically encrypts all submitted question papers, stores them securely, randomly selects and unlocks one paper 10 minutes before the exam using blockchain-enforced time rules, prints it instantly, and ensures no digital copy exists before or after printing.”

---

## NEXT (VERY IMPORTANT)

Now you are at a point where we should **lock one thing at a time**.

I can next:
1️⃣ Write **System Design Diagram explanation (exam-ready)**
2️⃣ Write **Project abstract + objectives + scope**
3️⃣ Prepare **viva questions & answers**
4️⃣ Break system into **modules for implementation**

👉 Tell me the number, and we go step-by-step.
