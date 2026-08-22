import os
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel


load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")


if not GITHUB_TOKEN:
    raise RuntimeError("GITHUB_TOKEN is not set in the .env file")


client = OpenAI(
    base_url="http://host.docker.internal:20128/v1",
    api_key="omniroute"
)


app = FastAPI(
    title="AI Code Review Assistant",
    description="AI-powered professional code review application",
    version="3.1.0"
)


app.add_middleware(
    CORSMiddleware,
   allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174"
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CodeRequest(BaseModel):
    code: str
    language: str


@app.get("/")
def home():
    return {
        "message": "AI Code Review Assistant API is running!"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.post("/review")
def review_code(request: CodeRequest):

    if not request.code.strip():
        raise HTTPException(
            status_code=400,
            detail="Code cannot be empty."
        )

    prompt = f"""
You are a highly experienced senior software engineer.

Perform an accurate and professional code review.

IMPORTANT RULES:

- Analyze ONLY the code provided.
- Do NOT invent problems.
- Do NOT report something as a bug unless it genuinely exists.
- Do NOT assume missing code or external context.
- Do not report the same underlying problem in multiple sections.
- Place each issue in its single most appropriate category.
- Be technically accurate.
- Do not suggest unnecessary changes or complexity.
- Keep explanations clear and professional.
- Review the code point by point.
- Number issues sequentially within each section.
- Use clean Markdown formatting.
- Do not repeat the original code unnecessarily.

SEVERITY RULES:

Use ONLY these exact formats:

**Severity:** High
**Severity:** Medium
**Severity:** Low

High:
- Serious security vulnerabilities
- Code that definitely crashes or fails
- Data loss or corruption risks
- Major logical errors

Medium:
- Important bugs in realistic situations
- Significant security weaknesses
- Resource management problems
- Meaningful performance problems

Low:
- Minor correctness risks
- Maintainability problems with practical impact
- Small performance inefficiencies
- Useful but non-critical improvements

Do not use Critical, Info, Warning, Minor, or any other severity.

The code language is: {request.language}

Your response MUST follow this structure:

# Code Review Report

## 1. Bugs and Logical Errors

For each real issue:

### Issue 1: Short Issue Title

**Severity:** High

**Problem:**
Explain exactly what is wrong.

**Why it matters:**
Explain the real impact.

**Recommendation:**
Explain exactly how to fix it.

If there are no significant bugs, write:

No significant bugs or logical errors found.

---

## 2. Security Issues

Only mention genuine security problems.

For every real issue:

### Issue 1: Security Issue Title

**Severity:** High

**Problem:**
Explain the security concern.

**Why it matters:**
Explain the possible impact.

**Recommendation:**
Explain how to fix it.

If there are no significant security issues, write:

No significant security issues found.

---

## 3. Code Quality

Only mention useful and meaningful improvements.

For every issue:

### Issue 1: Short Quality Issue Title

**Severity:** Low

**Problem:**
Explain the code quality issue.

**Why it matters:**
Explain the practical impact.

**Recommendation:**
Explain the improvement.

If there are no significant code quality issues, write:

No significant code quality issues found.

---

## 4. Performance

Only mention real performance concerns.

For every issue:

### Issue 1: Performance Issue Title

**Severity:** Medium

**Problem:**
Explain the actual performance problem.

**Why it matters:**
Explain the actual performance impact.

**Recommendation:**
Explain how to improve it.

If there are no meaningful performance concerns, write:

No significant performance issues found.

---

## 5. Recommended Fix

Provide a clean improved version of the relevant code.

- Keep the original functionality unless a real bug requires changing it.
- Fix only the genuine issues identified above.
- Do not add unnecessary complexity.
- Include the corrected code inside a Markdown code block.
- Use the correct language for the code block.

CODE TO REVIEW:

Language: {request.language}

{request.code}
"""


    def generate_review():
        try:
            stream = client.chat.completions.create(
                model="antigravity/claude-opus-4-6-thinking",
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,
                max_tokens=2200,
                stream=True
            )

            for chunk in stream:
                if (
                    chunk.choices
                    and chunk.choices[0].delta.content
                ):
                    yield chunk.choices[0].delta.content

        except Exception as e:
            print("AI ERROR:", repr(e))

            yield (
                "\n\n# Error\n\n"
                "Unable to complete the code review.\n\n"
                f"Details: {str(e)}"
            )

    return StreamingResponse(
        generate_review(),
        media_type="text/markdown; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )