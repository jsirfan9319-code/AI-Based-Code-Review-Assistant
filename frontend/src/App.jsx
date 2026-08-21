  import { useState } from "react";
  import ReactMarkdown from "react-markdown";
  import CodeMirror from "@uiw/react-codemirror";

  import { python } from "@codemirror/lang-python";
  import { javascript } from "@codemirror/lang-javascript";
  import { java } from "@codemirror/lang-java";
  import { cpp } from "@codemirror/lang-cpp";

  import { oneDark } from "@codemirror/theme-one-dark";

  import "./App.css";

  function App() {
    const [code, setCode] = useState("");
    const [language, setLanguage] = useState("python");
    const [review, setReview] = useState("");
    const [loading, setLoading] = useState(false);
    const [hasStartedStreaming, setHasStartedStreaming] = useState(false);
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    // =============================
    // ISSUE SUMMARY
    // =============================

    const getIssueSummary = () => {
      if (!review) {
        return null;
      }

      const high =
        (
          review.match(
            /Severity:\s*\*{0,2}\s*High\b/gi
          ) || []
        ).length;

      const medium =
        (
          review.match(
            /Severity:\s*\*{0,2}\s*Medium\b/gi
          ) || []
        ).length;

      const low =
        (
          review.match(
            /Severity:\s*\*{0,2}\s*Low\b/gi
          ) || []
        ).length;

      return {
        high,
        medium,
        low,
        total: high + medium + low,
      };
    };

    const issueSummary = getIssueSummary();

    // =============================
    // LANGUAGE EXTENSION
    // =============================

    const getLanguageExtension = () => {
      switch (language) {
        case "javascript":
          return javascript();

        case "java":
          return java();

        case "cpp":
          return cpp();

        case "python":
        default:
          return python();
      }
    };

    // =============================
    // REVIEW CODE
    // =============================

    const reviewCode = async () => {
      if (!code.trim()) {
        setReview("Please enter some code first.");
        return;
      }

      setLoading(true);
      setReview("");
      setHasStartedStreaming(false);

      try {
        const response = await fetch(
          "http://127.0.0.1:8000/review",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              code: code,
              language: language,
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();

          throw new Error(
            errorText || "Failed to review code"
          );
        }

        if (!response.body) {
          throw new Error(
            "No response stream received"
          );
        }

        const reader = response.body.getReader();

        const decoder = new TextDecoder();

        let fullReview = "";

        while (true) {
          const { done, value } =
            await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, {
            stream: true,
          });

          if (chunk) {
            fullReview += chunk;

            setHasStartedStreaming(true);

            setReview(fullReview);
          }
        }

        const remaining = decoder.decode();

        if (remaining) {
          fullReview += remaining;

          setReview(fullReview);

          setHasStartedStreaming(true);
        }

        if (fullReview.trim()) {
          setHistory((previousHistory) => [
            {
              code,
              language,
              review: fullReview,
              date: new Date().toLocaleString(),
            },
            ...previousHistory,
          ]);
        }

      } catch (error) {
        console.error(
          "Review error:",
          error
        );

        setHasStartedStreaming(true);

        setReview(
          `## Error

  Unable to analyze the code.

  ${error.message}`
        );
      } finally {
        setLoading(false);
      }
    };

    // =============================
    // CLEAR CODE
    // =============================

    const clearCode = () => {
      setCode("");
      setReview("");
      setLoading(false);
      setHasStartedStreaming(false);
    };

    // =============================
    // COPY REVIEW
    // =============================

    const copyReview = async () => {
      if (!review) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          review
        );
      } catch (error) {
        console.error(
          "Copy failed:",
          error
        );
      }
    };

    return (
      <div className="app">

        {/* ============================= */}
        {/* TOP BAR */}
        {/* ============================= */}

        <header className="topbar">

          <div className="brand">

            <div className="brand-icon">
              ✦
            </div>

            <div>

              <h1>
                CodeLens AI
              </h1>

              <p>
                Intelligent code review, instantly.
              </p>

            </div>

          </div>

          <div className="status">

            <span className="status-dot"></span>

            AI Ready

          </div>

        </header>


        {/* ============================= */}
        {/* WORKSPACE */}
        {/* ============================= */}

        <main className="workspace">


          {/* ============================= */}
          {/* CODE PANEL */}
          {/* ============================= */}

          <section className="code-panel">

            <div className="panel-top">

              <div>

                <span className="eyebrow">
                  CODE WORKSPACE
                </span>

                <h2>
                  Your Code
                </h2>

              </div>


              <select
                value={language}
                onChange={(event) =>
                  setLanguage(
                    event.target.value
                  )
                }
                disabled={loading}
              >

                <option value="python">
                  Python
                </option>

                <option value="javascript">
                  JavaScript
                </option>

                <option value="java">
                  Java
                </option>

                <option value="cpp">
                  C++
                </option>

              </select>

            </div>


            {/* ============================= */}
            {/* CODE EDITOR */}
            {/* ============================= */}

            <div className="editor-wrapper">

              <div className="editor-header">

                <div className="window-dots">

                  <span></span>
                  <span></span>
                  <span></span>

                </div>

                <span>
                  {language}
                </span>

              </div>


              <CodeMirror
                value={code}
                height="500px"
                theme={oneDark}
                extensions={[
                  getLanguageExtension(),
                ]}
                onChange={(value) =>
                  setCode(value)
                }
                editable={!loading}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLine: true,
                  highlightActiveLineGutter: true,
                  foldGutter: true,
                }}
              />

            </div>


            {/* ============================= */}
            {/* ACTION BUTTONS */}
            {/* ============================= */}

            <div className="actions">

              <button
                className="review-button"
                onClick={reviewCode}
                disabled={loading}
              >

                {loading ? (
                  <>
                    <span className="button-spinner"></span>

                    {hasStartedStreaming
                      ? "Reviewing..."
                      : "Starting AI..."}
                  </>
                ) : (
                  <>
                    <span>
                      ✦
                    </span>

                    Review Code
                  </>
                )}

              </button>

            <button
    className="history-button"
    onClick={() => setShowHistory(!showHistory)}
  >
    🕘 History
  </button>

              <button
                className="clear-button"
                onClick={clearCode}
                disabled={loading}
              >
                Clear
              </button>

            </div>

          </section>


  {/* =============================== */}
  {/* HISTORY PANEL */}
  {/* =============================== */}

  {showHistory && (
    <section className="history-panel">
      <h2>Review History</h2>

      {history.length === 0 ? (
        <p>No review history yet.</p>
      ) : (
        history.map((item, index) => (
          <div key={index} className="history-item">
            <h3>{item.language}</h3>

            <p>{item.date}</p>

            <button
              onClick={() => {
                setCode(item.code);
                setLanguage(item.language);
                setReview(item.review);
                setShowHistory(false);
              }}
            >
              Open Review
            </button>
            <button
    className="delete-history-button"
    onClick={() => {
      setHistory((previousHistory) =>
        previousHistory.filter((_, historyIndex) => historyIndex !== index)
      );
    }}
  >
    🗑️ Delete
  </button>
          </div>
        ))
      )}
    </section>
  )}

  {/* =============================== */}
  {/* REVIEW PANEL */}
  {/* =============================== */}

  <section className="review-panel">


            {/* REVIEW HEADER */}

            <div className="review-panel-top">

              <div>

                <span className="eyebrow">
                  AI ANALYSIS
                </span>

                <h2>
                  Code Review
                </h2>

              </div>


              {review && (

                <button
                  className="copy-button"
                  onClick={copyReview}
                >

                  📋 Copy

                </button>

              )}

            </div>


            {/* ============================= */}
            {/* REVIEW CONTENT */}
            {/* ============================= */}

            <div className="review-content">


              {/* EMPTY STATE */}

              {!review && !loading && (

                <div className="empty-review">

                  <div className="ai-orb">
                    ✦
                  </div>


                  <h3>
                    Ready to review your code
                  </h3>


                  <p>
                    Paste your code, choose a language,
                    and let AI find bugs, security issues,
                    code quality, and performance problems.
                  </p>


                  <div className="review-features">

                    <span>
                      ✓ Bugs
                    </span>

                    <span>
                      ✓ Security
                    </span>

                    <span>
                      ✓ Quality
                    </span>

                    <span>
                      ✓ Performance
                    </span>

                  </div>

                </div>

              )}


              {/* LOADING STATE */}

              {loading &&
                !hasStartedStreaming &&
                !review && (

                  <div className="loading-review">

                    <div className="loading-orb">

                      <div className="pulse"></div>

                      ✦

                    </div>


                    <h3>
                      AI is reviewing your code
                    </h3>


                    <p>
                      Connecting to the AI model...
                    </p>


                    <div className="loading-dots">

                      <span></span>
                      <span></span>
                      <span></span>

                    </div>

                  </div>

                )}


              {/* ============================= */}
              {/* REVIEW RESULT */}
              {/* ============================= */}

              {review && (
                <>

                  {/* ISSUE SUMMARY */}

                  {issueSummary && (

                    <div className="issue-summary">


                      <div className="summary-card high-card">

                        <span className="summary-label">
                          🔴 High
                        </span>

                        <strong>
                          {issueSummary.high}
                        </strong>

                      </div>


                      <div className="summary-card medium-card">

                        <span className="summary-label">
                          🟠 Medium
                        </span>

                        <strong>
                          {issueSummary.medium}
                        </strong>

                      </div>


                      <div className="summary-card low-card">

                        <span className="summary-label">
                          🟢 Low
                        </span>

                        <strong>
                          {issueSummary.low}
                        </strong>

                      </div>


                      <div className="summary-card total-card">

                        <span className="summary-label">
                          📊 Total
                        </span>

                        <strong>
                          {issueSummary.total}
                        </strong>

                      </div>


                    </div>

                  )}


                  {/* MARKDOWN REVIEW */}

                  <div className="markdown-review">

                    <ReactMarkdown>
                      {review}
                    </ReactMarkdown>


                    {loading && (

                      <span className="streaming-cursor"></span>

                    )}

                  </div>

                </>
              )}


            </div>


            {/* ============================= */}
            {/* REVIEW FOOTER */}
            {/* ============================= */}

            <div className="review-footer">

              <span>

                {loading &&
                !hasStartedStreaming

                  ? "✦ Connecting to AI..."

                  : loading &&
                    hasStartedStreaming

                  ? "✦ AI review streaming live"

                  : review

                  ? "✓ AI review complete"

                  : "● Ready for analysis"}

              </span>


              {review && (

                <span>

                  {loading
                    ? "Generating..."
                    : "Complete"}

                </span>

              )}

            </div>

          </section>

        </main>

      </div>
    );
  }

  export default App;