"use client";

import { useState } from "react";

export default function CommentThread({ comments = [], onSend }) {
  const [text, setText] = useState("");
  return (
    <div>
      <div className="d-flex flex-column gap-2 mb-3">
        {(comments || []).length ? comments.map((c, i) => (
          <div key={c.id || i} className="p-2 border radius-12">
            <div className="fw-semibold">{c.author || "—"}</div>
            <div className="text-secondary-light" style={{fontSize:12}}>{c.createdAt || ""}</div>
            <div>{c.text || c.comment || ""}</div>
          </div>
        )) : <div className="text-secondary-light">No comments.</div>}
      </div>
      <div className="d-flex gap-2">
        <input className="form-control" value={text} onChange={(e)=>setText(e.target.value)} placeholder="Write a comment..." />
        <button className="btn btn-primary" onClick={()=>{ if(!text.trim()) return; onSend?.(text.trim()); setText(""); }}>Send</button>
      </div>
    </div>
  );
}
