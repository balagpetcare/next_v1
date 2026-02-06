"use client";

import { useState } from 'react';
import { Icon } from '@iconify/react';

export default function DocGrid({ docs = [], documents = [] }) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const allDocs = docs.length ? docs : documents;
  
  if (!allDocs?.length) return <div className="text-secondary-light">No documents.</div>;
  
  return (
    <>
      <div className="row g-2">
        {allDocs.map((d, i) => {
          const doc = d.media || d;
          const url = doc.url || doc.media?.url || doc.mediaUrl;
          const title = d.title || d.type || doc.title || `Document #${i+1}`;
          
          return (
            <div className="col-md-6 col-lg-4" key={d.id || i}>
              <div className="card radius-12">
                <div className="card-body">
                  <div className="fw-semibold mb-2">{title}</div>
                  {url ? (
                    <div className="d-flex gap-2">
                      <a 
                        className="btn btn-sm btn-primary" 
                        href={url} 
                        target="_blank" 
                        rel="noreferrer"
                      >
                        <Icon icon="solar:eye-bold" /> View
                      </a>
                      <button 
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setSelectedDoc({ url, title })}
                      >
                        <Icon icon="solar:maximize-bold" /> Zoom
                      </button>
                    </div>
                  ) : (
                    <div className="text-secondary-light">No URL</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {selectedDoc && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ 
            background: 'rgba(0,0,0,0.8)', 
            zIndex: 9999,
            padding: 20
          }}
          onClick={() => setSelectedDoc(null)}
        >
          <div className="position-relative" style={{ maxWidth: '90%', maxHeight: '90%' }}>
            <button
              className="btn btn-danger position-absolute top-0 end-0"
              style={{ zIndex: 10000, margin: 10 }}
              onClick={() => setSelectedDoc(null)}
            >
              <Icon icon="solar:close-circle-bold" />
            </button>
            <img 
              src={selectedDoc.url} 
              alt={selectedDoc.title}
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
