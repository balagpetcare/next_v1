"use client";

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { apiPost } from '@/lib/api';
import ConfirmationAlert from './ConfirmationAlert';

export default function DecisionPanel({ basePath, onDone, loading: externalLoading }) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [showConfirm, setShowConfirm] = useState(null); // 'approve' | 'reject' | 'suspend' | 'request-changes' | null

  const handleAction = async (action, noteText = '') => {
    if (!basePath) return;

    setLoading(true);
    try {
      let endpoint = '';
      if (action === 'approve') {
        endpoint = `${basePath}/approve`;
      } else if (action === 'reject') {
        endpoint = `${basePath}/reject`;
      } else if (action === 'request-changes') {
        endpoint = `${basePath}/request-changes`;
      } else if (action === 'suspend') {
        endpoint = `${basePath}/suspend`;
      }

      const response = await apiPost(endpoint, noteText ? { note: noteText, reason: noteText } : {});
      setNote('');
      setShowConfirm(null);
      
      // Call onDone callback to refresh the data immediately
      if (onDone) {
        onDone();
      }
    } catch (e) {
      alert(e?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const openConfirm = (action) => {
    if (!basePath) {
      alert('Error: Unable to perform action. Please refresh the page.');
      return;
    }
    // Show confirmation modal for all actions
    setShowConfirm(action);
  };

  const handleConfirm = () => {
    const noteText = note.trim();
    const action = showConfirm;
    
    // For reject and request-changes, note is required
    if ((action === 'reject' || action === 'request-changes') && !noteText) {
      return; // Don't proceed if note is required but empty
    }
    
    handleAction(action, noteText);
  };

  const getConfirmLabel = () => {
    switch (showConfirm) {
      case 'approve':
        return 'Confirm Approve';
      case 'reject':
        return 'Confirm Reject';
      case 'suspend':
        return 'Confirm Suspend';
      case 'request-changes':
        return 'Confirm Request';
      default:
        return 'Confirm';
    }
  };

  const getMessage = () => {
    switch (showConfirm) {
      case 'approve':
        return 'Are you sure you want to approve this verification? This action will update the status to verified.';
      case 'reject':
        return 'Are you sure you want to reject this verification? Please provide a reason below (required).';
      case 'suspend':
        return 'Are you sure you want to suspend this verification? This will lock the account. You may add a note below.';
      case 'request-changes':
        return 'Request changes to this verification. Please provide details below (required).';
      default:
        return '';
    }
  };

  const isLoading = loading || externalLoading;
  const requiresNote = showConfirm === 'reject' || showConfirm === 'request-changes';

  return (
    <>
      <div className="d-flex flex-column gap-2">
        <div className="d-flex flex-wrap gap-2">
          <button 
            className="btn btn-success d-flex align-items-center gap-2" 
            disabled={isLoading} 
            onClick={() => openConfirm('approve')}
            style={{
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
          >
            <Icon icon="solar:check-circle-bold" />
            Approve
          </button>
          <button 
            className="btn btn-warning d-flex align-items-center gap-2" 
            disabled={isLoading} 
            onClick={() => openConfirm('request-changes')}
            style={{
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
          >
            <Icon icon="solar:edit-circle-bold" />
            Request Changes
          </button>
          <button 
            className="btn btn-danger d-flex align-items-center gap-2" 
            disabled={isLoading} 
            onClick={() => openConfirm('reject')}
            style={{
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
          >
            <Icon icon="solar:close-circle-bold" />
            Reject
          </button>
          <button 
            className="btn btn-outline-warning d-flex align-items-center gap-2" 
            disabled={isLoading} 
            onClick={() => openConfirm('suspend')}
            style={{
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
          >
            <Icon icon="solar:stop-circle-bold" />
            Suspend
          </button>
        </div>
      </div>

      <ConfirmationAlert
        open={!!showConfirm}
        onClose={() => {
          setShowConfirm(null);
          setNote('');
        }}
        onConfirm={handleConfirm}
        type={showConfirm || 'approve'}
        message={getMessage()}
        confirmLabel={getConfirmLabel()}
        loading={isLoading}
        requireNote={requiresNote}
        noteValue={note}
      >
        {(requiresNote || showConfirm === 'suspend') && (
          <div className="mt-3">
            <label
              className="form-label fw-semibold mb-2 d-flex align-items-center gap-2"
              style={{
                fontSize: '14px',
                color: '#495057',
              }}
            >
              {requiresNote ? (
                <>
                  <Icon icon="solar:info-circle-bold" style={{ fontSize: '16px', color: '#dc3545' }} />
                  <span>Reason / Note <span className="text-danger">*</span></span>
                </>
              ) : (
                <>
                  <Icon icon="solar:document-text-bold" style={{ fontSize: '16px', color: '#6c757d' }} />
                  <span>Note (Optional)</span>
                </>
              )}
            </label>
            <textarea
              className="form-control"
              rows={4}
              placeholder={
                showConfirm === 'reject'
                  ? 'Please provide a detailed reason for rejection. This will be visible to the applicant...'
                  : showConfirm === 'request-changes'
                  ? 'Please describe what changes are needed. Be specific and clear...'
                  : 'Add any additional notes or comments...'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                borderRadius: '10px',
                fontSize: '14px',
                border: requiresNote && !note.trim() ? '2px solid #dc3545' : '2px solid #dee2e6',
                transition: 'all 0.2s ease',
                padding: '12px 16px',
                lineHeight: '1.6',
                resize: 'vertical',
                minHeight: '100px',
              }}
              onFocus={(e) => {
                const focusColor = showConfirm === 'reject' ? '#dc3545' : showConfirm === 'request-changes' ? '#17a2b8' : '#0d6efd';
                e.target.style.borderColor = focusColor;
                e.target.style.boxShadow = `0 0 0 0.2rem rgba(${
                  showConfirm === 'reject' ? '220, 53, 69' : showConfirm === 'request-changes' ? '23, 162, 184' : '13, 110, 253'
                }, 0.15)`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = requiresNote && !note.trim() ? '#dc3545' : '#dee2e6';
                e.target.style.boxShadow = 'none';
              }}
            />
            {requiresNote && !note.trim() && (
              <div className="d-flex align-items-center gap-2 mt-2">
                <Icon icon="solar:danger-triangle-bold" style={{ fontSize: '14px', color: '#dc3545' }} />
                <small className="text-danger fw-semibold" style={{ fontSize: '12px' }}>
                  This field is required to proceed
                </small>
              </div>
            )}
            {note.trim() && note.length > 0 && (
              <div className="d-flex justify-content-between align-items-center mt-2">
                <small className="text-muted" style={{ fontSize: '12px' }}>
                  {note.length} character{note.length !== 1 ? 's' : ''}
                </small>
                {note.length > 500 && (
                  <small className="text-warning" style={{ fontSize: '12px' }}>
                    <Icon icon="solar:info-circle-bold" style={{ fontSize: '12px' }} /> Consider keeping notes concise
                  </small>
                )}
              </div>
            )}
          </div>
        )}
      </ConfirmationAlert>
    </>
  );
}
