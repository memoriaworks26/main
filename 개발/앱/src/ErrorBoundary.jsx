// 앱 전역 안전망 — 렌더 중 예외가 나도 흰화면 대신 친절한 재시도 화면을 띄운다.
// 카톡 인앱 웹뷰는 콘솔이 없어 원인 파악이 어렵다 → 에러 메시지를 화면에 노출해 진단 가능하게.
import React from "react";

function Fallback({ detail, onRetry }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "#faf8f3", color: "#2a2a2a", textAlign: "center", fontFamily: "'Noto Serif KR', serif" }}>
      <div style={{ fontSize: 17, fontWeight: 700 }}>일시적인 오류가 발생했어요</div>
      <p style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.7, color: "#6b6b6b", maxWidth: 320 }}>
        올려주신 사진·영상은 안전하게 저장되어 있어요.<br />아래 버튼으로 다시 시도해 주세요.
      </p>
      <button onClick={onRetry} style={{ marginTop: 18, padding: "10px 28px", fontSize: 13, fontWeight: 700, color: "#fff", background: "#b08a3e", border: "none", borderRadius: 8 }}>
        다시 시도
      </button>
      {detail ? (
        <pre style={{ marginTop: 18, maxWidth: 340, maxHeight: 160, overflow: "auto", padding: 10, fontSize: 10.5, lineHeight: 1.5, textAlign: "left", color: "#9a4a3a", background: "#fff", border: "1px solid #eee", borderRadius: 6, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "monospace" }}>
          {detail}
        </pre>
      ) : null}
    </div>
  );
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.onGlobal = this.onGlobal.bind(this);
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidMount() {
    // 비동기(await) 예외는 ErrorBoundary가 못 잡으므로 전역 핸들러로 함께 노출.
    window.addEventListener("error", this.onGlobal);
    window.addEventListener("unhandledrejection", this.onGlobal);
  }
  componentWillUnmount() {
    window.removeEventListener("error", this.onGlobal);
    window.removeEventListener("unhandledrejection", this.onGlobal);
  }
  onGlobal(e) {
    const err = e?.error || e?.reason || e;
    if (err) this.setState({ error: err });
  }
  render() {
    if (this.state.error) {
      const e = this.state.error;
      const detail = (e?.message || String(e)) + (e?.stack ? "\n" + String(e.stack).split("\n").slice(0, 3).join("\n") : "");
      return <Fallback detail={detail} onRetry={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}
