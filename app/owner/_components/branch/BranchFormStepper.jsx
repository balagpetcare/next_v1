"use client";

/**
 * BranchFormStepper - Visual progress indicator for multi-step branch form
 */
export default function BranchFormStepper({
  currentStep = 1,
  totalSteps = 4,
  steps = [
    { number: 1, title: "Basic Info", description: "Branch name and types" },
    { number: 2, title: "Location", description: "Address and contact" },
    { number: 3, title: "Documents", description: "Photos and files" },
    { number: 4, title: "Review", description: "Confirm and submit" },
  ],
  onStepClick,
  className = "",
}) {
  return (
    <div className={`branch-form-stepper ${className}`} role="navigation" aria-label="Form steps">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-12 mb-20">
        {steps.map((step, index) => {
          const stepNum = step.number || index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          const isUpcoming = stepNum > currentStep;
          const stepIcon = step.icon || "ri-circle-line";

          return (
            <div
              key={stepNum}
              className="d-flex align-items-center flex-grow-1 position-relative"
              style={{ minWidth: "fit-content" }}
            >
              {/* Step Circle */}
              <div
                className="d-flex flex-column align-items-center position-relative"
                style={{ minWidth: 140, zIndex: 2 }}
                onClick={onStepClick && !isUpcoming ? () => onStepClick(stepNum) : undefined}
              >
                <div
                  className={`d-flex align-items-center justify-content-center mb-10 ${
                    isActive
                      ? "step-circle-active"
                      : isCompleted
                      ? "step-circle-completed"
                      : "step-circle-upcoming"
                  }`}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "16px",
                    cursor: onStepClick && !isUpcoming ? "pointer" : "default",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    fontWeight: 600,
                    fontSize: 18,
                    boxShadow: isActive
                      ? "0 8px 24px rgba(var(--primary-rgb, 0, 123, 255), 0.3)"
                      : isCompleted
                      ? "0 4px 12px rgba(16, 185, 129, 0.2)"
                      : "0 2px 8px rgba(0, 0, 0, 0.08)",
                    transform: isActive ? "scale(1.05)" : "scale(1)",
                  }}
                  role="button"
                  tabIndex={onStepClick && !isUpcoming ? 0 : -1}
                  aria-label={`Step ${stepNum}: ${step.title}`}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && onStepClick && !isUpcoming) {
                      e.preventDefault();
                      onStepClick(stepNum);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (onStepClick && !isUpcoming) {
                      e.currentTarget.style.transform = "scale(1.08)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (onStepClick && !isUpcoming) {
                      e.currentTarget.style.transform = isActive ? "scale(1.05)" : "scale(1)";
                    }
                  }}
                >
                  {isCompleted ? (
                    <i className="ri-check-line" style={{ fontSize: "28px", fontWeight: "bold" }}></i>
                  ) : isActive ? (
                    <i className={stepIcon} style={{ fontSize: "24px" }}></i>
                  ) : (
                    <span style={{ fontSize: "20px" }}>{stepNum}</span>
                  )}
                </div>

                {/* Step Info */}
                <div className="text-center" style={{ maxWidth: 140 }}>
                  <div
                    className={`fw-bold mb-4 ${isActive ? "text-primary" : isCompleted ? "text-success" : "text-secondary-light"}`}
                    style={{ 
                      fontSize: 14,
                      transition: "color 0.3s ease"
                    }}
                  >
                    {step.title}
                  </div>
                  {step.description && (
                    <div 
                      className={`${isActive ? "text-dark" : "text-secondary-light"}`}
                      style={{ 
                        fontSize: 12, 
                        lineHeight: 1.4,
                        transition: "color 0.3s ease"
                      }}
                    >
                      {step.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className="flex-grow-1 d-none d-md-block position-absolute"
                  style={{
                    height: 3,
                    background: isCompleted
                      ? "linear-gradient(to right, #10b981 0%, #10b981 50%, #10b981 100%)"
                      : isActive
                      ? "linear-gradient(to right, #10b981 0%, var(--primary, #0d6efd) 50%, rgba(0,0,0,0.1) 100%)"
                      : "linear-gradient(to right, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.05) 100%)",
                    margin: "0 12px",
                    marginTop: "-32px",
                    marginLeft: "76px",
                    marginRight: "76px",
                    left: "64px",
                    right: "64px",
                    borderRadius: "2px",
                    transition: "all 0.4s ease",
                    zIndex: 1,
                  }}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Enhanced Progress Bar */}
      <div className="mt-20">
        <div className="d-flex align-items-center justify-content-between mb-12">
          <div className="d-flex align-items-center gap-8">
            <i className="ri-progress-1-line text-primary" style={{ fontSize: "18px" }}></i>
            <span className="fw-semibold text-dark" style={{ fontSize: 14 }}>
              Progress: Step {currentStep} of {totalSteps}
            </span>
          </div>
          <div className="d-flex align-items-center gap-8">
            <span className="fw-bold text-primary" style={{ fontSize: 16 }}>
              {Math.round((currentStep / totalSteps) * 100)}%
            </span>
            <span className="text-secondary-light" style={{ fontSize: 13 }}>
              Complete
            </span>
          </div>
        </div>
        <div 
          className="progress radius-12 overflow-hidden" 
          style={{ 
            height: 12, 
            borderRadius: "12px",
            background: "rgba(0, 0, 0, 0.05)",
            boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.06)"
          }}
        >
          <div
            className="progress-bar"
            role="progressbar"
            style={{ 
              width: `${(currentStep / totalSteps) * 100}%`,
              background: "linear-gradient(90deg, var(--primary, #0d6efd) 0%, #0056b3 100%)",
              borderRadius: "12px",
              transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 2px 8px rgba(13, 110, 253, 0.3)",
              position: "relative",
              overflow: "hidden"
            }}
            aria-valuenow={currentStep}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-label={`Step ${currentStep} of ${totalSteps}`}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                animation: "shimmer 2s infinite",
              }}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        .step-circle-active {
          background: linear-gradient(135deg, var(--primary, #0d6efd) 0%, #0056b3 100%);
          color: white;
          border: 3px solid rgba(255, 255, 255, 0.3);
        }
        .step-circle-completed {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: 3px solid rgba(255, 255, 255, 0.3);
        }
        .step-circle-upcoming {
          background: #f8f9fa;
          color: #6c757d;
          border: 2px solid #e9ecef;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
