# AI-Based Code Review Assistant

A web-based application that analyzes source code and identifies potential bugs and logical errors.

## Features

- Code input workspace
- Programming language selection
- Code analysis
- Detection of potential bugs and logical errors
- High, Medium, and Low severity levels
- Total issue count
- Detailed code review report
- Copy report functionality

## Technology Stack

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend
- Python
- FastAPI
- Uvicorn

## How It Works

1. User enters source code.
2. User selects a programming language.
3. The frontend sends the code to the backend.
4. The backend analyzes the code.
5. Potential issues are identified.
6. Issues are classified by severity.
7. A code review report is displayed.

## Project Structure

```text
AI-Based-Code-Review-Assistant/
│
├── backend/
│   ├── main.py
│   └── .gitignore
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
└── README.md